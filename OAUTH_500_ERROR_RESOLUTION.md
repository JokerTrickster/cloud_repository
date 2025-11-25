# Google OAuth 500 Error - Root Cause & Resolution

## Root Cause Identified

**Primary Issue:** Google OAuth Client ID mismatch between frontend and backend

The backend server at `http://13.203.37.93:18081` is returning a 500 Internal Server Error instead of a clean 401 Unauthorized error. This indicates that:

1. The backend is receiving the Google ID token successfully
2. The backend is attempting to validate it against a DIFFERENT Google OAuth Client ID than what the frontend is using
3. This mismatch causes an internal validation error (500) instead of a proper authentication error (401)

## Evidence Summary

### Backend API Behavior
- Invalid token → Returns 401 "Invalid Google ID token" (correct)
- Empty/malformed request → Returns 400 Bad Request (correct)
- Real Google token → Returns 500 Internal Server Error (INCORRECT - indicates configuration issue)

### Frontend Configuration
- Google Client ID: `258592695444-jq64aqhugfga0etfc1ni8h8v59r6phu0.apps.googleusercontent.com`
- Backend URL: `http://13.203.37.93:18081`
- Request endpoint: `POST /v0.1/auth/google/signin`
- Request body: `{ "idToken": "<google_credential>" }`

### Request Flow
```
User → Google OAuth → Frontend (Client ID: 258592695444...) → Backend → 500 Error
                                                                    ↓
                                            Backend expects DIFFERENT Client ID
```

## Action Items

### CRITICAL - Backend Team Actions Required

1. **Verify Google OAuth Configuration**
   - Check what Google Client ID the backend is configured with
   - Compare with frontend's Client ID: `258592695444-jq64aqhugfga0etfc1ni8h8v59r6phu0.apps.googleusercontent.com`

2. **Choose Resolution Path**

   **Option A (Recommended):** Update backend to use same Client ID as frontend
   ```
   Backend configuration update:
   GOOGLE_CLIENT_ID=258592695444-jq64aqhugfga0etfc1ni8h8v59r6phu0.apps.googleusercontent.com
   ```

   **Option B:** Provide correct Client ID for frontend to use
   ```
   Backend team provides their Client ID → Frontend updates .env.local
   ```

3. **Improve Backend Error Handling**
   - 500 errors should be reserved for true server errors
   - Token validation failures should return 401 with appropriate message
   - Consider adding better error logging to identify configuration mismatches

4. **Check Server Logs**
   - Look for errors when Google token validation fails
   - Should see stack trace or Google API client errors
   - Share with frontend team if additional details needed

### Frontend Changes (Completed)

1. **Enhanced Error Handling** ✅
   - Updated `/Users/luxrobo/project/cloud_repository/src/pages/Login.jsx`
   - Added detailed console logging for debugging
   - Improved error message extraction for nested error structures
   - Added specific handling for 500 errors

2. **Error Message Display** ✅
   - Now correctly extracts `error.message` from backend response
   - Fallback to generic message if structure is different
   - User-friendly Korean error messages

### Optional Improvements

1. **Fix COOP Header Warnings** (Low priority - not causing 500 error)
   - Add to `vite.config.js` if needed for production
   - Current warnings are cosmetic, not functional issues

2. **Add Environment Variable Validation**
   - Validate `VITE_GOOGLE_CLIENT_ID` is set on app start
   - Prevent silent failures from missing configuration

## Testing & Verification

### Before Backend Fix
Expected behavior:
- User clicks Google Sign-In → Completes OAuth → Backend returns 500
- Error message: "서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
- Console shows detailed error logging

### After Backend Fix
Expected behavior:
- User clicks Google Sign-In → Completes OAuth → Backend returns 200
- Response body: `{ "accessToken": "...", "refreshToken": "..." }`
- User redirected to `/gallery` with tokens stored
- No errors in console

### Testing Steps

1. Start dev server: `npm run dev`
2. Navigate to `http://localhost:5173/login`
3. Click Google Sign-In button
4. Complete Google OAuth flow
5. Check browser console for detailed logs
6. Verify behavior matches expected outcome

## Communication Template for Backend Team

```
Subject: Google OAuth 500 Error - Client ID Configuration Issue

Hi Backend Team,

We're experiencing 500 errors when attempting Google OAuth login. After investigation,
we've identified a likely Client ID mismatch.

Current Setup:
- Frontend Google Client ID: 258592695444-jq64aqhugfga0etfc1ni8h8v59r6phu0.apps.googleusercontent.com
- Backend endpoint: POST http://13.203.37.93:18081/v0.1/auth/google/signin
- Error: 500 Internal Server Error (should be 401 for invalid tokens)

Request:
1. Please verify what Google Client ID the backend is configured with
2. Either:
   - Update backend to use: 258592695444-jq64aqhugfga0etfc1ni8h8v59r6phu0.apps.googleusercontent.com
   - OR provide the correct Client ID for frontend to use
3. Check server logs for Google token validation errors
4. Consider returning 401 instead of 500 for token validation failures

Evidence:
- Invalid token → 401 (working correctly)
- Empty token → 400 (working correctly)
- Real Google token → 500 (indicates configuration issue)

Frontend changes completed:
- Enhanced error logging
- Improved error message handling

Let me know if you need any additional information or testing.
```

## Files Modified

- `/Users/luxrobo/project/cloud_repository/src/pages/Login.jsx` - Enhanced error handling
- `/Users/luxrobo/project/cloud_repository/investigate-500-error.md` - Detailed analysis
- `/Users/luxrobo/project/cloud_repository/OAUTH_500_ERROR_RESOLUTION.md` - This document

## Next Steps

1. Share this document with backend team
2. Wait for backend team to verify Client ID configuration
3. Backend team implements fix (update Client ID or provide correct one)
4. Test complete OAuth flow end-to-end
5. Verify tokens are stored and user is redirected correctly
6. Close issue once verified working

## Timeline

- Investigation completed: 2025-11-25
- Frontend improvements: ✅ Completed
- Backend fix: ⏳ Pending backend team action
- End-to-end testing: ⏳ After backend fix
