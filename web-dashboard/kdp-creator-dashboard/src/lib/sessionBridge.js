import { supabase, sessionApi } from './api';

const LEGACY_TOKEN_KEY = 'kdp_session_token';
const LEGACY_REFRESH_KEY = 'kdp_session_refresh';
const LEGACY_USER_ID_KEY = 'kdp_session_user_id';

function cookieDomain() {
  if (typeof window === 'undefined') return null;
  const host = window.location.hostname;
  if (host === 'kdpsuite.com' || host.endsWith('.kdpsuite.com')) {
    return '.kdpsuite.com';
  }
  return null;
}

function clearLegacyCookie(name) {
  const domain = cookieDomain();
  if (typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie =
    `${encodeURIComponent(name)}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
  if (domain) {
    document.cookie =
      `${encodeURIComponent(name)}=; Path=/; Domain=${domain}; Max-Age=0; SameSite=Lax${secure}`;
  }
}

function clearLegacyJsTokens() {
  try {
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    localStorage.removeItem(LEGACY_REFRESH_KEY);
    localStorage.removeItem(LEGACY_USER_ID_KEY);
  } catch {
    // ignore
  }
  clearLegacyCookie(LEGACY_TOKEN_KEY);
  clearLegacyCookie(LEGACY_REFRESH_KEY);
  clearLegacyCookie(LEGACY_USER_ID_KEY);
}

async function persistRefreshCookie(session) {
  if (!session?.access_token || !session.refresh_token) return;
  try {
    await sessionApi.syncSession(session.access_token, session.refresh_token);
  } catch (syncError) {
    console.warn('[SESSION_BRIDGE] Backend sync failed:', syncError.message);
  }
}

async function restoreFromHttpOnlyCookie() {
  try {
    const response = await sessionApi.restoreSession();
    const payload = response?.data?.data;
    if (!payload?.access_token || !payload?.refresh_token) return null;
    const { error } = await supabase.auth.setSession({
      access_token: payload.access_token,
      refresh_token: payload.refresh_token,
    });
    if (error) {
      console.warn('[SESSION_BRIDGE] Failed to restore session:', error.message);
      return null;
    }
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  } catch {
    return null;
  }
}

export const sessionBridge = {
  init: async () => {
    clearLegacyJsTokens();
    let { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      session = await restoreFromHttpOnlyCookie();
    }

    if (session) {
      await persistRefreshCookie(session);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, nextSession) => {
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && nextSession) {
          await persistRefreshCookie(nextSession);
          if (event === 'SIGNED_IN') {
            window.dispatchEvent(new CustomEvent('kdp_session_changed', {
              detail: { event: 'SIGNED_IN', session: nextSession },
            }));
          }
        } else if (event === 'SIGNED_OUT') {
          clearLegacyJsTokens();
          window.dispatchEvent(new CustomEvent('kdp_session_changed', {
            detail: { event: 'SIGNED_OUT' },
          }));
        }
      },
    );

    return subscription;
  },

  getToken: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  },

  isAuthenticated: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return Boolean(session);
  },

  validateWithBackend: async () => {
    try {
      const response = await sessionApi.validateSession();
      return response.data?.data?.valid === true;
    } catch {
      return false;
    }
  },

  clearSession: () => {
    clearLegacyJsTokens();
  },
};
