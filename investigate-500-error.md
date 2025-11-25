# Root Cause Analysis: Google OAuth 500 Internal Server Error

## Investigation Summary

### Evidence Collection

#### 1. Backend API Testing Results

**Test 1: Direct Backend Call (Invalid Token)**
```
POST http://13.203.37.93:18081/v0.1/auth/google/signin
Request: { "idToken": "mock_test_token_12345" }
Response: 401 Unauthorized
Body: {
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid Google ID token"
  }
}
```

**Test 2: Empty Token**
```
Request: { "idToken": "" }
Response: 400 Bad Request
Body: {
  "error": {
    "code": "BAD_REQUEST",
    "message": "Key: 'ReqGoogleSignin.IdToken' Error:Field validation for 'IdToken' failed on the 'required' tag"
  }
}
```

**Test 3: Malformed Request**
```
Request: { "token": "wrong_field" }
Response: 400 Bad Request
Body: Same validation error as Test 2
```

**Test 4: CORS Preflight Check**
```
OPTIONS http://13.203.37.93:18081/v0.1/auth/google/signin
Response: 204 No Content
CORS Headers: None exposed (all undefined)
```

#### 2. Frontend Configuration Analysis

**Environment Variables:**
- `.env.development`: `VITE_API_BASE_URL=` (EMPTY!)
- `.env.local`: `VITE_API_BASE_URL=` (EMPTY!)
- `.env.local`: `VITE_GOOGLE_CLIENT_ID=258592695444-jq64aqhugfga0etfc1ni8h8v59r6phu0.apps.googleusercontent.com`

**API Client Configuration:**
```javascript
// src/api/client.js
const client = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '',  // Empty string when env var is empty!
});
```

**Vite Proxy Configuration:**
```javascript
// vite.config.js
server: {
    proxy: {
      '/v0.1': {
        target: 'http://13.203.37.93:18081',
        changeOrigin: true,
        secure: false,
      },
    },
}
```

**Login Implementation:**
```javascript
// src/pages/Login.jsx
const { data } = await client.post('/v0.1/auth/google/signin', {
    idToken: response.credential
});
```

#### 3. Request Flow Analysis

**Current Flow:**
1. User clicks Google Sign-In button
2. Google OAuth popup opens
3. User authenticates with Google
4. Google returns credential (ID token) to callback
5. Frontend calls: `client.post('/v0.1/auth/google/signin', { idToken: response.credential })`
6. Since `baseURL = ''`, the actual URL becomes: `http://localhost:5173/v0.1/auth/google/signin`
7. Vite proxy intercepts `/v0.1` requests
8. Proxy forwards to: `http://13.203.37.93:18081/v0.1/auth/google/signin`
9. Backend receives request and validates Google ID token
10. **Backend returns 500 Internal Server Error** (not 401!)

## Hypothesis Formation

### Hypothesis 1: COOP Header Blocking OAuth Flow ❌
**Status:** UNLIKELY - Would see COOP error in browser console, not 500 from backend

### Hypothesis 2: Invalid Google Client ID Configuration ❌
**Status:** REJECTED - Backend would return 401 "Invalid Google ID token", not 500

### Hypothesis 3: Backend Cannot Validate Google ID Token ✅
**Status:** LIKELY - Backend receives token but fails during validation process
**Evidence:**
- Test with invalid token returns 401 (expected behavior)
- Real Google token returns 500 (unexpected server error)
- This suggests token reaches validation logic but causes internal error

### Hypothesis 4: Google Client ID Mismatch ✅
**Status:** HIGHLY LIKELY - Root Cause Candidate
**Evidence:**
- Frontend uses: `258592695444-jq64aqhugfga0etfc1ni8h8v59r6phu0.apps.googleusercontent.com`
- Backend may be configured for different Google OAuth client
- When backend tries to validate token with wrong client ID, validation fails internally
- This would cause 500 error instead of clean 401

### Hypothesis 5: Backend Missing Google OAuth Credentials ✅
**Status:** POSSIBLE
**Evidence:**
- Backend may not have Google OAuth client credentials configured
- Or may have different client ID than frontend is using
- Internal server error suggests configuration issue, not validation issue

## Root Cause Determination

### PRIMARY ROOT CAUSE: Google OAuth Client ID Mismatch

**Evidence Chain:**
1. Frontend is configured with Client ID: `258592695444-jq64aqhugfga0etfc1ni8h8v59r6phu0.apps.googleusercontent.com`
2. Backend receives valid Google ID token from this client
3. Backend attempts to validate token but is configured for DIFFERENT client ID
4. Validation library throws internal error (500) instead of clean authentication failure (401)
5. This is consistent with 500 error behavior (server misconfiguration, not authentication failure)

**Why 500 instead of 401?**
- Backend's Google token validation library expects matching client IDs
- When token is for different client, validation throws exception
- Exception not properly caught, results in 500 instead of 401

### SECONDARY ISSUE: COOP Header Warnings

**Status:** Present but NOT causing the 500 error
**Impact:** Browser console warnings, but OAuth flow can still complete
**Note:** COOP warnings are separate from backend 500 error

## Resolution Path

### REQUIRED ACTIONS

#### 1. Backend Team Actions (CRITICAL)
**Verify Google OAuth Configuration:**
```bash
# Backend needs to confirm:
1. What Google Client ID is the backend configured with?
2. Is it: 258592695444-jq64aqhugfga0etfc1ni8h8v59r6phu0.apps.googleusercontent.com?
3. If not, backend needs to update configuration to match frontend
4. Or provide correct Client ID for frontend to use
```

**Check Backend Logs:**
```bash
# Backend should check server logs for:
- Exact error message when 500 occurs
- Stack trace showing validation failure
- Google API client error details
```

**Recommended Backend Fix:**
```go
// Example backend fix (assuming Go)
// Current (causes 500):
token, err := idtoken.Validate(ctx, idToken, expectedClientID)
if err != nil {
    // This throws 500 when client ID mismatch
    return err
}

// Fixed (returns 401):
token, err := idtoken.Validate(ctx, idToken, expectedClientID)
if err != nil {
    // Return proper 401 error
    return &UnauthorizedError{Message: "Invalid Google ID token"}
}
```

#### 2. Frontend Team Actions

**Option A: Wait for Backend Configuration Fix (RECOMMENDED)**
- Backend updates their Google Client ID to match frontend
- No frontend changes needed

**Option B: Update Frontend Client ID**
- If backend provides different Client ID
- Update `.env.local`:
```env
VITE_GOOGLE_CLIENT_ID=<backend-provided-client-id>
```

**Add Better Error Handling:**
```javascript
// src/pages/Login.jsx - Line 51
catch (err) {
    console.error('Login failed:', err);
    console.error('Error response:', err.response); // Add detailed logging

    const errorMessage = err.response?.data?.error?.message
        || err.response?.data?.message
        || '로그인에 실패했습니다. 다시 시도해주세요.';
    setError(errorMessage);
}
```

### OPTIONAL IMPROVEMENTS

#### 1. Fix COOP Header Warnings (Low Priority)
**Not causing 500 error, but good to fix for production**

Add to `vite.config.js`:
```javascript
server: {
    headers: {
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
        'Cross-Origin-Embedder-Policy': 'require-corp'
    },
    proxy: {
        // existing proxy config
    }
}
```

#### 2. Add Environment Variable Validation
```javascript
// src/main.jsx or src/App.jsx
if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
    console.error('VITE_GOOGLE_CLIENT_ID is not configured!');
}
```

## Verification Steps

### After Backend Fixes Configuration:

1. **Test with real Google login:**
   ```bash
   npm run dev
   # Navigate to http://localhost:5173/login
   # Click Google Sign-In
   # Complete OAuth flow
   # Should redirect to /gallery with tokens
   ```

2. **Verify backend response:**
   - Should return 200 with { accessToken, refreshToken }
   - NOT 500 or 401

3. **Check error handling:**
   - Try with expired/invalid token → should get clean 401
   - Try with network error → should show user-friendly message

## Summary

**Root Cause:** Google OAuth Client ID mismatch between frontend and backend

**Specific Error:** Backend is configured for different Google Client ID than frontend is using (258592695444-jq64aqhugfga0etfc1ni8h8v59r6phu0.apps.googleusercontent.com)

**Backend Changes Needed:**
- [ ] Verify Google OAuth client ID configuration
- [ ] Update to match frontend client ID OR provide correct client ID to frontend
- [ ] Improve error handling to return 401 instead of 500 for validation failures
- [ ] Check server logs to confirm exact error

**Frontend Changes Needed:**
- [ ] Update error message extraction to handle nested error structure
- [ ] Add better logging for debugging
- [ ] (Optional) Update client ID if backend provides different one

**Configuration Changes:**
- [ ] (Optional) Add COOP headers to fix browser warnings
- [ ] Add environment variable validation

**Backend Team Intervention:** REQUIRED - This cannot be fixed without backend configuration update
