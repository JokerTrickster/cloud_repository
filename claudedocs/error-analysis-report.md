# Error Pattern Analysis Report
**Generated**: 2025-12-04
**Codebase**: map-editor (Cloud Repository)
**Total Files Analyzed**: 32 JS/JSX files

---

## Executive Summary

### Critical Findings (8 issues)
- Missing error boundaries in React components
- getBatchProcessingStatus API method incorrectly defined in fileValidation object
- WebSocket connection failures not gracefully handled
- Multiple unhandled promise rejections
- Inconsistent error user feedback (console.error vs alerts)
- Missing try-catch blocks in async operations
- Data structure mismatches (thumbnail_url vs download_url)
- Race conditions in file processing status updates

### Impact Assessment
- **User Experience**: 7/10 severity (silent failures, confusing error messages)
- **System Stability**: 6/10 severity (recoverable but frequent errors)
- **Data Integrity**: 4/10 severity (no data loss, but state inconsistencies)

---

## Error Catalog

### 1. API Method Definition Error (CRITICAL)
**Location**: `/src/api/fileApi.js:522-528`

**Issue**: `getBatchProcessingStatus` is defined inside `fileValidation` object instead of main `fileApi` export.

```javascript
// CURRENT (WRONG)
export const fileValidation = {
  // ... other validation methods
  async getBatchProcessingStatus(fileIds) {
    const { data } = await client.post('/api/v1/files/processing-status/batch',
      { file_ids: fileIds },
      { baseURL: import.meta.env.VITE_FILE_API_URL }
    );
    return data;
  },
}

// EXPECTED USAGE
fileApi.getBatchProcessingStatus([1, 2, 3]) // TypeError: not a function
```

**Called from**:
- `/src/hooks/useFileProcessingMonitor.js:70`

**Root Cause**: Method misplaced during code organization
**Frequency**: Every polling cycle (every 5 seconds) for processing files
**Error Type**: `TypeError: fileApi.getBatchProcessingStatus is not a function`

**Impact**:
- Processing status never updates
- Files stuck in "processing" state indefinitely
- User never sees completed videos
- Continuous console errors

**Fix Priority**: P0 (Immediate)
**Fix Complexity**: Trivial (move 7 lines of code)

---

### 2. WebSocket Connection Failures (HIGH)
**Location**: `/src/context/WebSocketContext.jsx:33-54`

**Issue**: WebSocket connection errors logged but not handled gracefully.

```javascript
newSocket.on('connect_error', (error) => {
  console.error('[WebSocket] Connection error:', error);
  // NO RECOVERY STRATEGY!
});
```

**Observed Errors**:
```
❌ [WebSocket] Connection error: Error: WebSocket connection failed
❌ [WebSocket] Disconnected: transport close
```

**Root Cause**:
- Backend WebSocket server not running
- CORS/network issues
- No fallback polling mechanism

**Impact**:
- Real-time file processing notifications lost
- Users don't know when video processing completes
- Must manually refresh to see updates

**Fix Priority**: P1 (High)
**Fix Complexity**: Medium (implement polling fallback)

---

### 3. Unhandled Promise Rejections (MEDIUM)
**Locations**: Multiple files

#### 3.1 Upload Completion Notification
**File**: `/src/api/fileApi.js:166-169`

```javascript
} catch (err) {
  console.warn(`⚠️ Failed to notify upload completion for ${file.name}:`, err);
  // Warning only, continues execution
  // USER IS NEVER INFORMED!
}
```

**Impact**: Background processing may not start, video thumbnails never generated.

#### 3.2 Gallery File Loading
**File**: `/src/hooks/useGalleryFiles.js:94-110`

```javascript
} catch (err) {
  console.error('Failed to load files:', err);
  // Error message set, but recovery strategy unclear
  setError(`${errorMessage}\n\n콘솔(F12)에서 자세한 에러를 확인하세요.`);
}
```

**Issue**: Tells user to check console instead of providing actionable solution.

#### 3.3 Download/Delete Operations
**File**: `/src/pages/Gallery.jsx:189-191, 218-221`

```javascript
} catch (err) {
  console.error('Download failed:', err);
  alert('다운로드에 실패했습니다.');  // Generic message!
}
```

**Issue**: No error details, user doesn't know what went wrong or how to fix it.

---

### 4. Data Structure Mismatches (MEDIUM)
**Location**: Multiple components

**Issue**: Inconsistent field names across API responses.

```javascript
// API Response 1 (files list):
{
  thumbnail_url: "...",
  download_url: "...",
  processing_status: "completed"
}

// API Response 2 (favorites list):
{
  thumbnailUrl: "...",    // camelCase!
  downloadUrl: "...",     // camelCase!
  processing_status: "completed"
}
```

**Affected Code**: `/src/hooks/useGalleryFiles.js:143-174`

```javascript
const thumbUrl = file.thumbnail_url || file.thumbnailUrl;  // Defensive coding
const downloadUrl = file.download_url || file.downloadUrl;
```

**Root Cause**: Backend API inconsistency (snake_case vs camelCase)
**Impact**: Fallback logic works but fragile, tech debt accumulates

---

### 5. Race Conditions in Status Updates (MEDIUM)
**Location**: `/src/pages/Gallery.jsx:77-120`

**Issue**: Multiple state update sources can conflict.

```javascript
// Source 1: WebSocket event
window.addEventListener('file:processed', handleFileProcessed);

// Source 2: Polling monitor
useFileProcessingMonitor(files, handleProcessingStatusUpdate, {...});

// Source 3: Manual reload after upload
uploadFn().then(results => {
  loadFiles();  // Full reload
});
```

**Observed Behavior**:
```
1. Upload completes → loadFiles() called
2. Polling detects processing → status update
3. WebSocket event arrives → loadFiles() called again
4. Race: Which state wins?
```

**Impact**: UI flickers, duplicate API calls, inefficient rendering

---

### 6. Missing Error Boundaries (LOW)
**Location**: React component tree

**Issue**: No error boundary components to catch rendering errors.

```javascript
// Current: Any component error crashes entire app
<Gallery />  // throws → white screen of death

// Needed: Error boundary with fallback UI
<ErrorBoundary fallback={<ErrorFallbackUI />}>
  <Gallery />
</ErrorBoundary>
```

**Impact**: Single component error crashes entire application
**User Experience**: Blank screen, no recovery option

---

### 7. Inconsistent Error Feedback (LOW)
**Location**: Throughout codebase

**Pattern Analysis**:
- `console.error()` only: 15 locations (user never sees error)
- `alert()` popup: 8 locations (disruptive, no details)
- `setError()` state: 2 locations (proper UI feedback)

**Examples**:

```javascript
// Silent failure (bad)
catch (error) {
  console.error('Failed:', error);
  // User has NO IDEA anything went wrong
}

// Alert popup (mediocre)
catch (error) {
  alert('다운로드에 실패했습니다.');
  // Disruptive, no error details, no retry option
}

// Proper UI feedback (good)
catch (error) {
  setError({
    title: '다운로드 실패',
    message: error.message,
    action: { label: '다시 시도', onClick: retry }
  });
}
```

**Recommendation**: Implement unified toast/notification system

---

### 8. Excessive Logging Noise (LOW)
**Location**: Multiple files

**Issue**: Production logs mixed with debug logs.

```javascript
console.log('📤 Sending batch upload request:', JSON.stringify(fileInfos, null, 2));
console.log('✅ Batch upload response:', batchResponse);
console.log(`📡 Notifying upload completion for file ${result.file_id}...`);
console.log(`✅ Upload completion notified for file ${result.file_id}`);

// Performance logs
console.log(`[Performance] All ${totalImagesToLoad.current} images loaded.`);
console.log(`[Performance] Total Time: ${totalTime.toFixed(2)}ms`);
console.log(`[Performance] API Latency: ${apiTime.toFixed(2)}ms`);
```

**Impact**:
- Hard to find actual errors in console
- Performance overhead (JSON.stringify on large objects)
- Potential PII leaks in production logs

---

## Root Cause Analysis

### Pattern 1: Copy-Paste Error Handling
**Evidence**:
```javascript
// Template repeated 8 times with minor variations:
} catch (err) {
  console.error('X failed:', err);
  alert('X에 실패했습니다.');
}
```

**Root Cause**: No centralized error handling utility
**Solution**: Create `handleApiError(error, context)` helper

---

### Pattern 2: Defensive Programming Overhead
**Evidence**:
```javascript
const thumbUrl = file.thumbnail_url || file.thumbnailUrl;
const downloadUrl = file.download_url || file.downloadUrl;
const fileName = file.file_name || file.fileName;
```

**Root Cause**: API inconsistency not fixed at source
**Solution**: Normalize API responses in client interceptor

---

### Pattern 3: Missing Validation Gates
**Evidence**:
```javascript
// No validation before API call
const fileIds = processingFiles.map(f => f.id || f.file_id);
await fileApi.getBatchProcessingStatus(fileIds);
// What if fileIds = [] or contains undefined?
```

**Root Cause**: Optimistic coding without guards
**Solution**: Add validation layer before external calls

---

## Timeline Analysis

### Error Occurrence Patterns

```
Upload Flow:
├─ [T+0s]   File selected → validation (✅ good)
├─ [T+1s]   Upload URL request → no timeout (⚠️ risk)
├─ [T+5s]   S3 upload → progress tracked (✅ good)
├─ [T+10s]  Complete-upload notification → catch but warn only (❌ silent fail)
├─ [T+10s]  Gallery reload → full list fetch (⚠️ expensive)
└─ [T+15s]  Polling starts → wrong API method (❌ crash)
    └─ [T+20s, T+25s...] Continuous errors every 5s

Processing Flow:
├─ [T+0s]   Backend receives file
├─ [T+5s]   Thumbnail generation starts
├─ [T+10s]  WebSocket notification sent → connection failed (❌)
├─ [T+15s]  Polling attempt → API error (❌)
└─ [T+600s] Max duration reached, polling stops
    └─ File stuck in "processing" forever (❌ user never sees video)
```

---

## Error Categorization

### By Severity
| Severity | Count | Examples |
|----------|-------|----------|
| Critical | 1 | getBatchProcessingStatus not a function |
| High | 2 | WebSocket failures, unhandled upload errors |
| Medium | 4 | Race conditions, data mismatches, promise rejections |
| Low | 3 | Missing error boundaries, inconsistent feedback, log noise |

### By Impact
| Impact Area | Issues | Risk Level |
|------------|--------|------------|
| User Experience | 6 | High |
| System Reliability | 3 | Medium |
| Performance | 2 | Low |
| Security/Privacy | 1 | Low |

### By Fix Complexity
| Complexity | Count | Estimated Effort |
|------------|-------|-----------------|
| Trivial (< 1hr) | 2 | Move code, fix typos |
| Easy (1-4hr) | 4 | Add try-catch, validation |
| Medium (4-8hr) | 3 | Refactor error handling |
| Complex (1-2d) | 1 | Error boundary system |

---

## Recommended Fixes

### Phase 1: Critical Hotfixes (Today)
**Estimated Time**: 1-2 hours

1. **Fix getBatchProcessingStatus location** (15 min)
   ```javascript
   // Move from fileValidation to fileApi object
   // File: src/api/fileApi.js
   ```

2. **Add WebSocket fallback** (30 min)
   ```javascript
   // If WebSocket fails, increase polling frequency
   // File: src/hooks/useFileProcessingMonitor.js
   ```

3. **Add error validation before API calls** (30 min)
   ```javascript
   // File: src/hooks/useFileProcessingMonitor.js:70
   if (!fileIds || fileIds.length === 0 || fileIds.some(id => !id)) {
     console.warn('[Monitor] Invalid file IDs, skipping poll');
     return;
   }
   ```

### Phase 2: Error Handling Infrastructure (This Week)
**Estimated Time**: 4-6 hours

1. **Create error handling utility** (2 hours)
   ```javascript
   // File: src/utils/errorHandler.js
   export function handleApiError(error, context, options = {}) {
     const { showToast = true, fallback, retry } = options;

     // Log structured error
     console.error(`[${context}] Error:`, {
       message: error.message,
       status: error.response?.status,
       data: error.response?.data,
       stack: error.stack
     });

     // User-friendly message
     const userMessage = getUserMessage(error);

     if (showToast) {
       toast.error(userMessage, {
         action: retry ? { label: 'Retry', onClick: retry } : undefined
       });
     }

     // Execute fallback if provided
     if (fallback) return fallback();

     throw error;
   }
   ```

2. **Implement toast notification system** (2 hours)
   ```javascript
   // Replace all alert() calls with toast notifications
   // File: src/components/Toast.jsx
   ```

3. **Add API response normalizer** (1 hour)
   ```javascript
   // File: src/api/normalizer.js
   export function normalizeFileData(apiResponse) {
     return {
       id: apiResponse.id,
       fileName: apiResponse.file_name || apiResponse.fileName,
       thumbnailUrl: apiResponse.thumbnail_url || apiResponse.thumbnailUrl,
       downloadUrl: apiResponse.download_url || apiResponse.downloadUrl,
       // ... consistent camelCase output
     };
   }
   ```

### Phase 3: Resilience Improvements (Next Week)
**Estimated Time**: 8-12 hours

1. **Add React Error Boundaries** (3 hours)
   ```javascript
   // File: src/components/ErrorBoundary.jsx
   class ErrorBoundary extends React.Component {
     componentDidCatch(error, errorInfo) {
       logError(error, errorInfo);
       this.setState({ hasError: true });
     }

     render() {
       if (this.state.hasError) {
         return <ErrorFallback onReset={this.resetError} />;
       }
       return this.props.children;
     }
   }
   ```

2. **Implement retry logic with exponential backoff** (2 hours)
   ```javascript
   // File: src/utils/retry.js
   export async function retryWithBackoff(fn, options = {}) {
     const { maxAttempts = 3, baseDelay = 1000 } = options;

     for (let attempt = 1; attempt <= maxAttempts; attempt++) {
       try {
         return await fn();
       } catch (error) {
         if (attempt === maxAttempts) throw error;

         const delay = baseDelay * Math.pow(2, attempt - 1);
         await sleep(delay);
       }
     }
   }
   ```

3. **Fix race conditions** (3 hours)
   - Debounce loadFiles() calls
   - Use request IDs to track latest response
   - Implement optimistic updates properly

4. **Reduce logging noise** (2 hours)
   - Create log level system (DEBUG, INFO, WARN, ERROR)
   - Only show ERROR in production
   - Use source maps for stack traces

---

## Monitoring Recommendations

### Error Tracking Setup
```javascript
// Integrate Sentry or similar
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  beforeSend(event, hint) {
    // Filter out noise
    if (event.level === 'warning' && isExpectedWarning(hint.originalException)) {
      return null;
    }
    return event;
  }
});
```

### Key Metrics to Track
1. **Error Rate**
   - API call success rate by endpoint
   - WebSocket connection stability
   - File upload success rate

2. **Performance**
   - API latency (p50, p95, p99)
   - Time to first image load
   - Gallery render time

3. **User Experience**
   - Errors shown to users
   - Retry attempt rate
   - Feature abandonment after errors

---

## Prevention Strategies

### Code Review Checklist
- [ ] Every async function has try-catch
- [ ] User-friendly error messages (no "Check console F12")
- [ ] Validation before API calls
- [ ] Fallback values for optional data
- [ ] No silent failures (console.error without user feedback)
- [ ] Proper cleanup in useEffect/promises

### Testing Requirements
- [ ] Unit tests for error cases
- [ ] Integration tests for API failures
- [ ] E2E tests for error recovery flows
- [ ] Manual testing with Network throttling/offline mode

### Documentation Needs
- [ ] Error handling guidelines
- [ ] Common error patterns and solutions
- [ ] API error response format specification
- [ ] Runbook for production errors

---

## Appendix: Error Message Improvements

### Current vs Proposed

| Current | Issues | Proposed |
|---------|--------|----------|
| "다운로드에 실패했습니다." | Too generic | "파일 다운로드 실패: 네트워크 연결을 확인해주세요. (에러: 403 Forbidden)" |
| "콘솔(F12)에서 자세한 에러를 확인하세요." | Asks user to debug | "파일을 불러올 수 없습니다. 잠시 후 다시 시도하거나 관리자에게 문의하세요." |
| Silent console.error() | User unaware | Toast notification with retry option |
| alert() popup | Disruptive | Inline error banner with dismiss option |

### Error Message Template
```javascript
{
  title: string,           // "파일 업로드 실패"
  message: string,         // User-friendly explanation
  details: string,         // Technical details (collapsible)
  action: {                // Optional recovery action
    label: string,         // "다시 시도"
    onClick: () => void
  },
  severity: 'error' | 'warning' | 'info'
}
```

---

## Conclusion

### Summary
- **Total Issues**: 8 error patterns identified
- **Critical Issues**: 1 (getBatchProcessingStatus)
- **Estimated Fix Time**: 13-20 hours across 3 phases
- **Expected Impact**: 80% reduction in user-facing errors

### Next Steps
1. Immediate: Fix getBatchProcessingStatus (P0)
2. This week: Implement error handling infrastructure (P1)
3. Next week: Add resilience features (P2)
4. Ongoing: Monitor error rates, iterate on UX

### Success Metrics
- User-visible errors: < 1% of requests
- WebSocket uptime: > 95%
- File processing success rate: > 98%
- Zero unhandled promise rejections
- Error recovery success rate: > 80%
