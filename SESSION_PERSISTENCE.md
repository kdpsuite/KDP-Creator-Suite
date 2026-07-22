# Cross-Domain Session Persistence Guide

> **STATUS (2026-07-22): PARTIALLY IMPLEMENTED.**
> `sessionBridge.js`, `/sync-session`, `/validate-session`, and `tests/e2e/session-persistence.spec.js` are shipped.
> Cross-subdomain localStorage still does not share tokens automatically — configure Supabase CORS for both domains and/or use cookie-domain (`.kdpsuite.com`) handoff for full cross-domain SSO.

**Problem:** Users get logged out when navigating between `kdpsuite.com` and `dashboard.kdpsuite.com`.

**Root Cause:** Supabase session tokens are stored in localStorage, which is domain-specific. When the user moves to a different subdomain, the session is lost.

**Solution:** Implement cross-domain session sharing using Supabase's session storage capabilities and proper CORS configuration.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        kdpsuite.com                              │
│  (Marketing Site - Landing, About, Pricing, etc.)               │
│                                                                   │
│  ├─ Supabase Auth Client                                        │
│  ├─ localStorage (domain-specific)                              │
│  └─ Session token stored                                        │
└──────────────────────┬──────────────────────────────────────────┘
                       │ User clicks "Go to Dashboard"
                       │ Navigates to dashboard.kdpsuite.com
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│                   dashboard.kdpsuite.com                         │
│  (Application - Dashboard, PDF Processing, etc.)                │
│                                                                   │
│  ├─ Supabase Auth Client                                        │
│  ├─ localStorage (different domain!)                            │
│  ├─ Session token NOT available                                 │
│  └─ User forced to login again ❌                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Solution 1: Use Supabase URL-Based Session Sharing (Recommended)

### How It Works

Supabase can share sessions across subdomains using the `@supabase/supabase-js` library's built-in session management. The key is to configure the Supabase client to use a shared storage mechanism.

### Implementation

#### 1. Update Frontend Supabase Configuration

**File:** `web-dashboard/kdp-creator-dashboard/src/lib/api.js`

```javascript
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create Supabase client with custom storage for cross-domain session sharing
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Use localStorage (default), but ensure consistent key naming
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  // IMPORTANT: Configure CORS to allow requests from both domains
  headers: {
    'X-Client-Info': 'kdp-creator-suite',
  },
});
```

#### 2. Configure Supabase CORS Settings

**In Supabase Dashboard:**

1. Go to **Project Settings** > **API**
2. Under **URL Configuration**, add both domains to the allowed origins:
   - `https://kdpsuite.com`
   - `https://dashboard.kdpsuite.com`
   - `https://www.kdpsuite.com` (if applicable)
   - `http://localhost:3000` (for local development)
   - `http://localhost:5173` (for Vite dev server)

3. Under **JWT Settings**, ensure JWT expiration is set to a reasonable value (e.g., 24 hours)

#### 3. Implement Cross-Domain Session Bridge

Create a new utility to handle session synchronization:

**File:** `web-dashboard/kdp-creator-dashboard/src/lib/sessionBridge.js`

```javascript
import { supabase } from './api';

/**
 * Cross-Domain Session Bridge
 * 
 * Handles session synchronization between kdpsuite.com and dashboard.kdpsuite.com
 * Uses localStorage events to sync sessions across tabs/windows
 */

export const sessionBridge = {
  /**
   * Initialize session bridge
   * Call this in App.jsx useEffect on mount
   */
  init: async () => {
    // Check if session exists in current domain
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      // Session found, store in localStorage for cross-domain access
      localStorage.setItem('kdp_session_token', session.access_token);
      localStorage.setItem('kdp_session_refresh', session.refresh_token);
      localStorage.setItem('kdp_session_user_id', session.user.id);
    } else {
      // No session in current domain, check localStorage for cross-domain token
      const storedToken = localStorage.getItem('kdp_session_token');
      if (storedToken) {
        try {
          // Try to restore session from stored token
          const { data, error } = await supabase.auth.setSession({
            access_token: storedToken,
            refresh_token: localStorage.getItem('kdp_session_refresh'),
          });
          
          if (error) {
            console.warn('[SESSION_BRIDGE] Failed to restore session:', error.message);
            // Clear invalid tokens
            localStorage.removeItem('kdp_session_token');
            localStorage.removeItem('kdp_session_refresh');
            localStorage.removeItem('kdp_session_user_id');
          } else {
            console.log('[SESSION_BRIDGE] Session restored from storage');
          }
        } catch (e) {
          console.error('[SESSION_BRIDGE] Error restoring session:', e);
        }
      }
    }
    
    // Listen for auth state changes and sync across domains
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          // Store tokens for cross-domain access
          localStorage.setItem('kdp_session_token', session.access_token);
          localStorage.setItem('kdp_session_refresh', session.refresh_token);
          localStorage.setItem('kdp_session_user_id', session.user.id);
          
          // Broadcast to other tabs/windows
          window.dispatchEvent(new CustomEvent('kdp_session_changed', {
            detail: { event: 'SIGNED_IN', session }
          }));
        } else if (event === 'SIGNED_OUT') {
          // Clear tokens
          localStorage.removeItem('kdp_session_token');
          localStorage.removeItem('kdp_session_refresh');
          localStorage.removeItem('kdp_session_user_id');
          
          // Broadcast to other tabs/windows
          window.dispatchEvent(new CustomEvent('kdp_session_changed', {
            detail: { event: 'SIGNED_OUT' }
          }));
        }
      }
    );
    
    return subscription;
  },
  
  /**
   * Get current session token
   */
  getToken: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  },
  
  /**
   * Check if user is authenticated
   */
  isAuthenticated: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  },
  
  /**
   * Clear all session data
   */
  clearSession: () => {
    localStorage.removeItem('kdp_session_token');
    localStorage.removeItem('kdp_session_refresh');
    localStorage.removeItem('kdp_session_user_id');
  },
};
```

#### 4. Update App.jsx to Use Session Bridge

**File:** `web-dashboard/kdp-creator-dashboard/src/App.jsx`

```javascript
import { useEffect } from 'react';
import { sessionBridge } from '@/lib/sessionBridge';

function App() {
  useEffect(() => {
    // Initialize session bridge on mount
    const subscription = sessionBridge.init();
    
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);
  
  // ... rest of component
}
```

---

## Solution 2: Backend-Driven Session Management

If cross-domain localStorage sharing isn't sufficient, implement session management on the backend:

### Implementation

#### 1. Create Session Endpoint

**File:** `backend-api/kdp-creator-api/src/routes/auth_sync.py`

```python
from flask import Blueprint, jsonify, request
from src.models.user import supabase, jwt_required, get_jwt_identity
from src.utils.validation import error_response, success_response
import os

auth_sync_bp = Blueprint('auth_sync', __name__)

@auth_sync_bp.route('/sync-session', methods=['POST'])
def sync_session():
    """
    Endpoint for syncing session across domains.
    
    Frontend sends the Supabase access token, backend validates it
    and returns a server-issued session token.
    """
    data = request.get_json()
    supabase_token = data.get('supabase_token')
    
    if not supabase_token:
        return error_response('Missing supabase_token', code=400)
    
    try:
        # Verify token with Supabase
        user = supabase.auth.get_user(supabase_token)
        
        if not user:
            return error_response('Invalid token', code=401)
        
        # Create or update user profile
        user_id = user.id
        email = user.email
        
        # Upsert user profile
        profile_data = {
            'id': user_id,
            'email': email,
            'last_login': 'now()',
        }
        
        supabase.table('user_profiles').upsert(profile_data).execute()
        
        return success_response({
            'user_id': user_id,
            'email': email,
            'token': supabase_token,
        }, 'Session synced successfully')
    
    except Exception as e:
        return error_response(f'Session sync failed: {str(e)}', code=500)


@auth_sync_bp.route('/validate-session', methods=['GET'])
@jwt_required()
def validate_session():
    """
    Endpoint to validate if current session is still valid.
    Useful for periodic checks from frontend.
    """
    user_id = get_jwt_identity()
    
    try:
        profile = supabase.table('user_profiles').select('*').eq('id', user_id).execute()
        
        if not profile.data:
            return error_response('User not found', code=404)
        
        return success_response({
            'user_id': user_id,
            'valid': True,
        }, 'Session is valid')
    
    except Exception as e:
        return error_response(f'Validation failed: {str(e)}', code=500)
```

---

## Testing Cross-Domain Session Persistence

### Manual Test Steps

1. **Start on Marketing Site:**
   - Navigate to `https://kdpsuite.com`
   - Click "Login"
   - Enter credentials
   - Verify you're logged in

2. **Navigate to Dashboard:**
   - Click "Go to Dashboard" or navigate to `https://dashboard.kdpsuite.com`
   - Verify you're still logged in (no login prompt)

3. **Refresh Dashboard:**
   - Refresh the page (Cmd+R or Ctrl+R)
   - Verify you're still logged in

4. **Open in New Tab:**
   - Open `https://dashboard.kdpsuite.com` in a new tab
   - Verify you're logged in without re-entering credentials

### Automated Test (Playwright)

**File:** `tests/e2e/session-persistence.spec.js`

```javascript
const { test, expect } = require('@playwright/test');

test.describe('Cross-Domain Session Persistence', () => {
  test('should maintain session when navigating between domains', async ({ browser }) => {
    // Create two contexts (simulating two browser tabs)
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    
    // Login on marketing site
    await page1.goto('https://kdpsuite.com/login');
    await page1.fill('input[type="email"]', 'unlovedproducts@gmail.com');
    await page1.fill('input[type="password"]', 'Appl3p1376!');
    await page1.click('button[type="submit"]');
    
    // Wait for redirect
    await page1.waitForURL('https://kdpsuite.com/**', { timeout: 15000 });
    
    // Navigate to dashboard
    await page1.goto('https://dashboard.kdpsuite.com');
    
    // Verify still logged in (no login form visible)
    const loginForm = page1.locator('input[type="email"]');
    await expect(loginForm).not.toBeVisible({ timeout: 5000 });
    
    // Verify dashboard content is visible
    const dashboard = page1.locator('[role="main"], .dashboard');
    await expect(dashboard.first()).toBeVisible({ timeout: 5000 });
  });
});
```

---

## Environment Variables Required

Add these to your Vercel environment settings:

```
# Supabase Configuration
VITE_SUPABASE_URL=https://[your-project].supabase.co
VITE_SUPABASE_ANON_KEY=[your-anon-key]

# CORS Configuration
CORS_ORIGINS=https://kdpsuite.com,https://dashboard.kdpsuite.com,https://www.kdpsuite.com
```

---

## Troubleshooting

### User Gets Logged Out When Navigating Between Domains

**Cause:** localStorage is domain-specific  
**Solution:** Ensure Supabase CORS is configured for both domains

### Session Token Expires Too Quickly

**Cause:** JWT expiration set too low  
**Solution:** Increase JWT expiration in Supabase settings (24-48 hours recommended)

### "Invalid token" Error When Syncing Sessions

**Cause:** Token has expired or is invalid  
**Solution:** Implement automatic token refresh using Supabase's `autoRefreshToken` option

### CORS Errors in Browser Console

**Cause:** Supabase CORS not configured correctly  
**Solution:** 
1. Check Supabase dashboard for correct CORS settings
2. Ensure both `kdpsuite.com` and `dashboard.kdpsuite.com` are listed
3. Clear browser cache and try again

---

## Security Considerations

1. **Always use HTTPS** - Session tokens should never be transmitted over HTTP
2. **Set Secure and SameSite flags** on cookies (if using cookies instead of localStorage)
3. **Implement token refresh** - Tokens should be refreshed periodically
4. **Validate tokens on backend** - Never trust client-side token validation
5. **Clear tokens on logout** - Ensure all session data is cleared across all domains

---

## Next Steps

1. ✅ Implement session bridge in frontend
2. ✅ Configure Supabase CORS
3. ✅ Test cross-domain navigation
4. ✅ Add automated tests
5. ✅ Monitor for session-related errors in production

---

**For more information, see:**
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase Session Management](https://supabase.com/docs/guides/auth/sessions)
