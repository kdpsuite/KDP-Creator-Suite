import { supabase, sessionApi } from './api';

const TOKEN_KEY = 'kdp_session_token';
const REFRESH_KEY = 'kdp_session_refresh';
const USER_ID_KEY = 'kdp_session_user_id';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function cookieDomain() {
  if (typeof window === 'undefined') return null;
  const host = window.location.hostname;
  if (host === 'kdpsuite.com' || host.endsWith('.kdpsuite.com')) {
    return '.kdpsuite.com';
  }
  return null;
}

function readCookie(name) {
  if (typeof document === 'undefined') return null;
  const prefix = `${encodeURIComponent(name)}=`;
  const parts = document.cookie.split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }
  return null;
}

function writeCookie(name, value) {
  const domain = cookieDomain();
  if (!domain || typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie =
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}` +
    `; Path=/; Domain=${domain}; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
}

function clearCookie(name) {
  const domain = cookieDomain();
  if (!domain || typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie =
    `${encodeURIComponent(name)}=; Path=/; Domain=${domain}; Max-Age=0; SameSite=Lax${secure}`;
}

function storeSessionTokens(session) {
  if (!session) return;
  localStorage.setItem(TOKEN_KEY, session.access_token);
  localStorage.setItem(REFRESH_KEY, session.refresh_token);
  localStorage.setItem(USER_ID_KEY, session.user.id);
  writeCookie(TOKEN_KEY, session.access_token);
  writeCookie(REFRESH_KEY, session.refresh_token);
  writeCookie(USER_ID_KEY, session.user.id);
}

function clearSessionTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_ID_KEY);
  clearCookie(TOKEN_KEY);
  clearCookie(REFRESH_KEY);
  clearCookie(USER_ID_KEY);
}

function readStoredTokens() {
  const access =
    localStorage.getItem(TOKEN_KEY) || readCookie(TOKEN_KEY);
  const refresh =
    localStorage.getItem(REFRESH_KEY) || readCookie(REFRESH_KEY);
  return { access, refresh };
}

export const sessionBridge = {
  init: async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      storeSessionTokens(session);
      try {
        await sessionApi.syncSession(session.access_token);
      } catch (syncError) {
        console.warn('[SESSION_BRIDGE] Backend sync failed:', syncError.message);
      }
    } else {
      const { access: storedToken, refresh: storedRefresh } = readStoredTokens();
      if (storedToken && storedRefresh) {
        try {
          const { error } = await supabase.auth.setSession({
            access_token: storedToken,
            refresh_token: storedRefresh,
          });
          if (error) {
            console.warn('[SESSION_BRIDGE] Failed to restore session:', error.message);
            clearSessionTokens();
          } else {
            // Re-mirror into localStorage when restored from shared cookie.
            const { data: { session: restored } } = await supabase.auth.getSession();
            if (restored) storeSessionTokens(restored);
          }
        } catch (restoreError) {
          console.error('[SESSION_BRIDGE] Error restoring session:', restoreError);
          clearSessionTokens();
        }
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, nextSession) => {
        if (event === 'SIGNED_IN' && nextSession) {
          storeSessionTokens(nextSession);
          try {
            await sessionApi.syncSession(nextSession.access_token);
          } catch (syncError) {
            console.warn('[SESSION_BRIDGE] Backend sync on sign-in failed:', syncError.message);
          }
          window.dispatchEvent(new CustomEvent('kdp_session_changed', {
            detail: { event: 'SIGNED_IN', session: nextSession },
          }));
        } else if (event === 'SIGNED_OUT') {
          clearSessionTokens();
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
    clearSessionTokens();
  },
};
