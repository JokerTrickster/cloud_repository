# Error Flow Analysis

## Critical Error Path: Video Processing Status Never Updates

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. User uploads video file                                         │
└────────────────┬────────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. uploadBatchFiles() - /src/api/fileApi.js:109                    │
│    ✅ File uploaded to S3                                           │
│    ✅ POST /files/:id/complete-upload called                        │
│    ✅ Returns { file_id, processing_status: 'processing' }          │
└────────────────┬────────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. Gallery.jsx sets initial file state                             │
│    file.processing_status = 'processing'                            │
│    file.url = placeholder image                                     │
└────────────────┬────────────────────────────────────────────────────┘
                 │
                 ├───────────────────────────┬─────────────────────────┐
                 ▼                           ▼                         ▼
┌─────────────────────────┐ ┌─────────────────────────┐ ┌──────────────────────┐
│ 4a. WebSocket Path      │ │ 4b. Polling Path        │ │ 4c. Manual Refresh   │
│ (FAILS)                 │ │ (FAILS)                 │ │ (Works but manual)   │
└────────┬────────────────┘ └────────┬────────────────┘ └──────────┬───────────┘
         │                           │                              │
         ▼                           ▼                              │
┌─────────────────────────┐ ┌─────────────────────────┐            │
│ WebSocketContext.jsx:33 │ │ useFileProcessing       │            │
│                         │ │ Monitor.js:70           │            │
│ ❌ Connection Failed    │ │                         │            │
│ "connect_error"         │ │ ❌ TypeError            │            │
│                         │ │ fileApi.               │            │
│ Logged but ignored      │ │ getBatchProcessing     │            │
│ No fallback strategy    │ │ Status is not a        │            │
│                         │ │ function               │            │
│ User never notified     │ │                         │            │
│                         │ │ Repeats every 5s       │            │
└─────────────────────────┘ └─────────────────────────┘            │
                                                                    │
                                                                    ▼
                                                        ┌──────────────────────┐
                                                        │ User clicks refresh  │
                                                        │ button               │
                                                        │                      │
                                                        │ ✅ Works!            │
                                                        │ Shows completed      │
                                                        │ video with thumbnail │
                                                        └──────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ RESULT: Video stuck in "processing" state forever                  │
│         User sees placeholder, never sees actual video              │
│         Only solution: Manual page refresh                          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Error Pattern: Race Conditions in State Updates

```
Timeline of Events During Upload:

T+0s:   Upload starts
        │
T+10s:  Upload completes
        │
        ├─▶ uploadBatchFiles resolves
        │   └─▶ Gallery.jsx:265 → loadFiles() called
        │       └─▶ GET /files → 100 files fetched
        │
T+10.5s: Backend finishes thumbnail generation
        │
        ├─▶ WebSocket event: file:processed
        │   └─▶ Gallery.jsx:66 → loadFiles() called (AGAIN!)
        │       └─▶ GET /files → 101 files fetched
        │
T+15s:  First polling cycle
        │
        └─▶ useFileProcessingMonitor.js:70
            └─▶ fileApi.getBatchProcessingStatus() FAILS
                └─▶ ❌ TypeError (continues every 5s for 10 minutes)

RACE CONDITION:
- Two loadFiles() calls in 0.5 seconds
- Which response arrives first? Unknown.
- Whichever arrives LAST wins, potentially overwriting newer data
- User sees flicker as UI updates twice
```

### Visual Race Diagram
```
Thread 1 (Upload Completion):
  ┌─────┐  API Request    ┌─────┐
  │ T+10│ ────────────────▶│ T+12│ Response arrives
  └─────┘                  └─────┘
                              │
                              ▼
                           setFiles(100 files)

Thread 2 (WebSocket Event):
  ┌──────┐  API Request   ┌──────┐
  │ T+10.5│ ─────────────▶│ T+11.5│ Response arrives FIRST!
  └──────┘                └──────┘
                              │
                              ▼
                           setFiles(101 files)
                              ▼
                           OVERWRITTEN by Thread 1 response!
                           (101 → 100, newest file disappears)
```

---

## Error Pattern: Silent Failures

### Example 1: Upload Completion Notification
```
┌─────────────────────────────────────────────────────────────────┐
│ fileApi.js:160-169                                              │
│                                                                 │
│ try {                                                           │
│   await client.post(`/files/${id}/complete-upload`);           │
│ } catch (err) {                                                 │
│   console.warn('⚠️ Failed to notify...');                       │
│   // ❌ NO USER NOTIFICATION                                    │
│   // ❌ NO RETRY                                                │
│   // ❌ CONTINUES AS IF NOTHING WRONG                           │
│ }                                                               │
│                                                                 │
│ // Returns success even though notification failed!            │
│ return { file_id, processing_status: 'processing' };           │
└─────────────────────────────────────────────────────────────────┘

Impact:
  User sees: "Upload complete! ✓"
  Reality:   Backend never starts processing
             Video stuck in "processing" forever
             Thumbnail never generated
             User thinks it's still working
```

### Example 2: Processing Status Poll Error
```
┌─────────────────────────────────────────────────────────────────┐
│ useFileProcessingMonitor.js:89-105                              │
│                                                                 │
│ } catch (error) {                                               │
│   if (error.name === 'AbortError') return;                     │
│                                                                 │
│   console.warn('[Monitor] Failed to poll:', error);            │
│                                                                 │
│   // ❌ USER NEVER SEES THIS ERROR                              │
│   // ❌ KEEPS TRYING FOREVER (until 10 min timeout)             │
│   // ❌ FILLS CONSOLE WITH SPAM                                 │
│                                                                 │
│   // Only stops if 404/403:                                    │
│   if (error.response?.status === 404) {                        │
│     // Stop polling                                            │
│   }                                                             │
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘

Console output every 5 seconds for 10 minutes:
  [Monitor] Failed to poll: TypeError: fileApi.getBatchProcessingStatus...
  [Monitor] Failed to poll: TypeError: fileApi.getBatchProcessingStatus...
  [Monitor] Failed to poll: TypeError: fileApi.getBatchProcessingStatus...
  ... (120 error messages) ...
```

---

## Error Pattern: Inconsistent User Feedback

```
┌─────────────────────────────────────────────────────────────────┐
│ Error Handling Methods Used in Codebase:                       │
└─────────────────────────────────────────────────────────────────┘

1. Silent Console Error (15 instances)
   ┌─────────────────────────────────────────┐
   │ console.error('Failed:', error);        │
   │ // User sees: NOTHING                   │
   └─────────────────────────────────────────┘

2. Alert Popup (8 instances)
   ┌─────────────────────────────────────────┐
   │ alert('다운로드에 실패했습니다.');          │
   │ // User sees: Generic error, no details │
   │ // Blocks entire UI                     │
   │ // No retry option                      │
   └─────────────────────────────────────────┘

3. Console Warning (3 instances)
   ┌─────────────────────────────────────────┐
   │ console.warn('Failed to notify...');    │
   │ // User sees: NOTHING                   │
   │ // Operation continues as if successful │
   └─────────────────────────────────────────┘

4. State Error (2 instances)
   ┌─────────────────────────────────────────┐
   │ setError('파일을 불러올 수 없습니다.\n    │
   │   콘솔(F12)에서 에러를 확인하세요.');     │
   │ // User sees: Error message             │
   │ // But asked to debug themselves!       │
   └─────────────────────────────────────────┘

5. Proper Error Handling (0 instances) ❌
   ┌─────────────────────────────────────────┐
   │ toast.error('파일 다운로드 실패', {      │
   │   message: getUserMessage(error),       │
   │   action: {                             │
   │     label: 'Retry',                     │
   │     onClick: handleRetry                │
   │   }                                     │
   │ });                                     │
   │ // Clear message                        │
   │ // Non-blocking                         │
   │ // Actionable                           │
   └─────────────────────────────────────────┘
```

### Impact on User Experience
```
User Action: Download 5 files
   │
   ├─▶ File 1: ✅ Success
   ├─▶ File 2: ✅ Success
   ├─▶ File 3: ❌ Failed (network timeout)
   │              │
   │              └─▶ console.error(...) ← User sees NOTHING
   │
   ├─▶ File 4: ✅ Success
   └─▶ File 5: ✅ Success

User's perception:
  "I downloaded 5 files, got 4 files. Where is #3? 🤔"
  "Did it download? Is it corrupted? Should I try again?"
  "App is broken, but no error message shown."

Correct behavior should be:
  Toast notification: "파일 3/5 다운로드 실패 (network timeout)"
  Action button: [다시 시도] [모두 다시 받기] [무시]
```

---

## Data Flow Error: API Response Inconsistency

```
┌─────────────────────────────────────────────────────────────────┐
│ API Endpoint 1: GET /files                                      │
│                                                                 │
│ Response:                                                       │
│ {                                                               │
│   files: [{                                                     │
│     id: 123,                                                    │
│     file_name: "video.mp4",        ← snake_case                 │
│     thumbnail_url: "https://...",  ← snake_case                 │
│     download_url: "https://...",   ← snake_case                 │
│     processing_status: "completed" ← snake_case                 │
│   }]                                                            │
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ API Endpoint 2: GET /favorites                                  │
│                                                                 │
│ Response:                                                       │
│ {                                                               │
│   data: [{                                                      │
│     id: 123,                                                    │
│     fileName: "video.mp4",         ← camelCase! 🚨              │
│     thumbnailUrl: "https://...",   ← camelCase! 🚨              │
│     downloadUrl: "https://...",    ← camelCase! 🚨              │
│     processing_status: "completed" ← snake_case (inconsistent)  │
│   }]                                                            │
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘

Frontend Handling (useGalleryFiles.js:143):
┌─────────────────────────────────────────────────────────────────┐
│ // Defensive programming to handle both formats                │
│ const fileName = file.file_name || file.fileName;              │
│ const thumbUrl = file.thumbnail_url || file.thumbnailUrl;      │
│ const downloadUrl = file.download_url || file.downloadUrl;     │
│                                                                 │
│ // Works but fragile - what if backend adds third format?      │
└─────────────────────────────────────────────────────────────────┘

Problems:
1. Increases bundle size (every || check)
2. Easy to miss a field (only found 3/10 fields)
3. No type safety (TypeScript can't help)
4. Future maintenance burden
5. Hidden bugs waiting to happen

Solution:
  Normalize at API client level, not in each component
```

---

## Cascading Failure Scenario

```
┌─────────────────────────────────────────────────────────────────┐
│ Initial Event: Backend WebSocket server is down                │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ Failure 1: WebSocket connection fails                          │
│   └─▶ Logged to console                                        │
│   └─▶ No fallback                                              │
│   └─▶ Real-time updates lost                                   │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ Failure 2: Polling should compensate but...                    │
│   └─▶ getBatchProcessingStatus not found                       │
│   └─▶ TypeError every 5 seconds                                │
│   └─▶ Status never updates                                     │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ Failure 3: User uploads video                                  │
│   └─▶ Upload succeeds                                          │
│   └─▶ Completion notification sent                             │
│   └─▶ Backend processes video                                  │
│   └─▶ WebSocket notification fails (server down)               │
│   └─▶ Polling fails (method not found)                         │
│   └─▶ Video stuck in "processing" forever                      │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ User Experience:                                                │
│   1. Uploads video → "Upload successful! ✓"                    │
│   2. Sees placeholder with "처리 중..." text                    │
│   3. Waits 1 minute... still processing                        │
│   4. Waits 5 minutes... still processing                       │
│   5. Gives up, thinks app is broken                            │
│   6. Checks console: 60+ error messages                        │
│   7. Has no idea how to fix                                    │
│   8. Manually refreshes page                                   │
│   9. Video appears! But user has no trust in app anymore       │
└─────────────────────────────────────────────────────────────────┘

Impact:
  ❌ Poor user experience
  ❌ Loss of user trust
  ❌ Support burden increases
  ❌ Negative reviews
  ❌ Feature abandonment
```

---

## Recovery Strategies (Current vs Improved)

### Scenario: Video Processing Fails

```
CURRENT STATE:
┌────────────────────────────────────────────┐
│ Video upload → Processing fails            │
│                                            │
│ User sees: "처리 중..." forever             │
│                                            │
│ No indication of:                          │
│   - Why it failed                          │
│   - What to do next                        │
│   - If retrying would help                 │
│                                            │
│ Only solution: Delete and re-upload       │
└────────────────────────────────────────────┘

IMPROVED STATE:
┌────────────────────────────────────────────┐
│ Video upload → Processing fails            │
│                                            │
│ User sees:                                 │
│   ┌──────────────────────────────────┐    │
│   │ ⚠️ 비디오 처리 실패               │    │
│   │                                  │    │
│   │ 원인: 파일 형식 지원 안됨          │    │
│   │ 지원 형식: MP4, WebM, MOV        │    │
│   │                                  │    │
│   │ [다시 시도] [변환 후 재업로드]     │    │
│   └──────────────────────────────────┘    │
│                                            │
│ Options:                                   │
│   1. Retry (auto-detect transient error)  │
│   2. Convert file format                  │
│   3. Contact support with error ID        │
└────────────────────────────────────────────┘
```

### Scenario: Network Connection Lost

```
CURRENT STATE:
┌────────────────────────────────────────────┐
│ User browsing gallery → WiFi disconnects  │
│                                            │
│ Symptoms:                                  │
│   - Infinite loading spinners              │
│   - No error messages                      │
│   - Console full of "Network Error"        │
│   - User confused                          │
│                                            │
│ User action: Refresh page (lose state)     │
└────────────────────────────────────────────┘

IMPROVED STATE:
┌────────────────────────────────────────────┐
│ User browsing gallery → WiFi disconnects  │
│                                            │
│ Immediate feedback:                        │
│   ┌──────────────────────────────────┐    │
│   │ 🌐 인터넷 연결 끊김               │    │
│   │                                  │    │
│   │ 연결 복구 중...                  │    │
│   │ ████████░░░░ 80%                 │    │
│   │                                  │    │
│   │ [수동 재연결]                    │    │
│   └──────────────────────────────────┘    │
│                                            │
│ Auto-retry with exponential backoff        │
│ Maintain state (no page refresh needed)    │
│ Queue failed requests for retry            │
└────────────────────────────────────────────┘
```

---

## Error Prevention Checklist

### Before Writing Code
- [ ] Identify all async operations
- [ ] List possible failure modes
- [ ] Design user feedback for each error
- [ ] Plan recovery/retry strategy
- [ ] Consider offline/degraded scenarios

### Code Review Checklist
- [ ] Every `async` has `try-catch`
- [ ] Every `.then()` has `.catch()`
- [ ] User-friendly error messages (no "Check console")
- [ ] No silent failures (`console.error` without user feedback)
- [ ] Validation before external calls
- [ ] Proper cleanup in error cases
- [ ] Error logged with context
- [ ] Retry logic for transient errors

### Testing Checklist
- [ ] Test with network offline
- [ ] Test with slow 3G connection
- [ ] Test with backend down
- [ ] Test with invalid API responses
- [ ] Test with missing permissions
- [ ] Test error recovery flows
- [ ] Test retry mechanisms
- [ ] Verify error messages are helpful

---

## Recommended Error Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│ Level 1: CRITICAL (Blocks core functionality)                  │
│                                                                 │
│ Examples:                                                       │
│   - Authentication fails                                       │
│   - Database connection lost                                   │
│   - API server unreachable                                     │
│                                                                 │
│ Response:                                                       │
│   - Full-page error screen                                     │
│   - Automatic retry                                            │
│   - Support contact info                                       │
│   - Fallback to cached data if available                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Level 2: HIGH (Feature not working)                            │
│                                                                 │
│ Examples:                                                       │
│   - File upload fails                                          │
│   - Video processing fails                                     │
│   - Download fails                                             │
│                                                                 │
│ Response:                                                       │
│   - Inline error message                                       │
│   - Retry button                                               │
│   - Clear explanation                                          │
│   - Alternative action (if available)                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Level 3: MEDIUM (Degraded experience)                          │
│                                                                 │
│ Examples:                                                       │
│   - WebSocket disconnected (polling available)                 │
│   - Thumbnail generation slow                                  │
│   - Tag update delayed                                         │
│                                                                 │
│ Response:                                                       │
│   - Subtle notification                                        │
│   - Graceful degradation                                       │
│   - Background retry                                           │
│   - No user action required                                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Level 4: LOW (Cosmetic issues)                                 │
│                                                                 │
│ Examples:                                                       │
│   - Analytics event failed to send                             │
│   - Preference save delayed                                    │
│   - Cache miss (falls back to API)                             │
│                                                                 │
│ Response:                                                       │
│   - Log only (no user notification)                            │
│   - Silent retry                                               │
│   - Continue normal operation                                  │
└─────────────────────────────────────────────────────────────────┘
```
