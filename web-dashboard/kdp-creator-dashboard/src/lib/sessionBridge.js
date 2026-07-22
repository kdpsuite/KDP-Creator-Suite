import { supabase, sessionApi } from './api';

const TOKEN_KEY = 'kdp_session_token';
const REFRESH_KEY = 'kdp_session_refresh';
const USER_ID_KEY = 'kdp_session_user_id';

function storeSessionTokens(session) {
  if (!session) return;
  localStorage.setItem(TOKEN_KEY, session.access_token);
  localStorage.setItem(REFRESH_KEY, session.refresh_token);
  localStorage.setItem(USER_ID_KEY, session.user.id);
}

function clearSessionTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_ID_KEY);
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
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedRefresh = localStorage.getItem(REFRESH_KEY);
      if (storedToken && storedRefresh) {
        try {
          const { error } = await supabase.auth.setSession({
            access_token: storedToken,
            refresh_token: storedRefresh,
          });
          if (error) {
            console.warn('[SESSION_BRIDGE] Failed to restore session:', error.message);
            clearSessionTokens();
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
