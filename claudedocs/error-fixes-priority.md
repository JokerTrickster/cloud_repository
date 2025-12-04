# Error Fixes - Priority Queue

## P0 - CRITICAL (Fix Today)

### 1. getBatchProcessingStatus Method Location
**File**: `/src/api/fileApi.js`
**Line**: 522-528
**Issue**: Method defined in wrong export object
**Current Error**: `TypeError: fileApi.getBatchProcessingStatus is not a function`
**Frequency**: Every 5 seconds during file processing

**Fix**:
```javascript
// MOVE from line 522 (inside fileValidation) to line 430 (inside fileApi)

// Current (WRONG):
export const fileValidation = {
  // ...
  async getBatchProcessingStatus(fileIds) { /* ... */ }
}

// Fixed (CORRECT):
const fileApi = {
  // ...
  async toggleFavorite(fileId, isFavorite) { /* ... */ },

  // ADD HERE (after line 407):
  async getBatchProcessingStatus(fileIds) {
    const { data } = await client.post('/api/v1/files/processing-status/batch',
      { file_ids: fileIds },
      { baseURL: import.meta.env.VITE_FILE_API_URL }
    );
    return data;
  },
};

// REMOVE from fileValidation object (lines 522-528)
```

**Verification**:
1. Upload a video file
2. Check console - no more "getBatchProcessingStatus is not a function" errors
3. Video status should update from "processing" to "completed" within 5-10 seconds

---

## P1 - HIGH (Fix This Week)

### 2. WebSocket Fallback When Connection Fails
**File**: `/src/context/WebSocketContext.jsx`
**Line**: 52-54
**Issue**: No recovery when WebSocket fails
**Current Error**: Silent failure, users never see processing completion

**Fix**:
```javascript
// Add state for connection status
const [shouldUseFallback, setShouldUseFallback] = useState(false);

newSocket.on('connect_error', (error) => {
  console.error('[WebSocket] Connection error:', error);

  // After 3 failed attempts, enable polling fallback
  if (reconnectionAttempts >= 3) {
    setShouldUseFallback(true);
    console.log('[WebSocket] Enabling polling fallback mode');
  }
});

// In useFileProcessingMonitor, increase frequency if WebSocket down
const pollingInterval = shouldUseFallback ? 3000 : 5000; // 3s vs 5s
```

---

### 3. Upload Completion Notification Error Handling
**File**: `/src/api/fileApi.js`
**Line**: 166-169
**Issue**: Silent failure, processing may not start

**Fix**:
```javascript
// Current (WARN only):
} catch (err) {
  console.warn(`⚠️ Failed to notify upload completion for ${file.name}:`, err);
}

// Fixed (with retry):
} catch (err) {
  console.error(`❌ Failed to notify upload completion for ${file.name}:`, err);

  // Retry once after 2 seconds
  await new Promise(resolve => setTimeout(resolve, 2000));
  try {
    await client.post(`/api/v1/files/${result.file_id}/complete-upload`, {}, {
      baseURL: import.meta.env.VITE_FILE_API_URL
    });
    console.log(`✅ Upload notification succeeded on retry`);
  } catch (retryErr) {
    console.error(`❌ Retry failed, user will see "processing" indefinitely`);
    // TODO: Show user error message with manual refresh button
    throw new Error(`Upload completed but processing notification failed: ${retryErr.message}`);
  }
}
```

---

### 4. Input Validation Before API Calls
**File**: `/src/hooks/useFileProcessingMonitor.js`
**Line**: 60-70
**Issue**: No validation, could send invalid data

**Fix**:
```javascript
// Before:
const fileIds = processingFiles.map(f => f.id || f.file_id);
const response = await fileApi.getBatchProcessingStatus(fileIds);

// After:
const fileIds = processingFiles
  .map(f => f.id || f.file_id)
  .filter(id => id !== undefined && id !== null && Number.isInteger(id));

// Validate before API call
if (fileIds.length === 0) {
  console.warn('[FileProcessingMonitor] No valid file IDs to poll');
  return;
}

if (fileIds.length !== processingFiles.length) {
  console.warn('[FileProcessingMonitor] Some files have invalid IDs:',
    processingFiles.filter(f => !f.id && !f.file_id)
  );
}

const response = await fileApi.getBatchProcessingStatus(fileIds);
```

---

## P2 - MEDIUM (Fix Next Week)

### 5. Race Condition - Multiple State Update Sources
**File**: `/src/pages/Gallery.jsx`
**Lines**: 62-74, 77-120, 265
**Issue**: WebSocket, polling, and manual reloads conflict

**Fix**:
```javascript
// Add request ID tracking
const latestRequestId = useRef(0);

const loadFiles = async ({ dateRange, filterType, sortOption, favoriteOnly }) => {
  const requestId = ++latestRequestId.current;

  setLoading(true);
  setError('');

  try {
    // ... fetch logic
    const transformedFiles = ...;

    // Only update if this is still the latest request
    if (requestId === latestRequestId.current) {
      setFiles(transformedFiles);
    } else {
      console.log('[Gallery] Ignoring stale response');
    }
  } catch (err) {
    if (requestId === latestRequestId.current) {
      setError(errorMessage);
    }
  } finally {
    if (requestId === latestRequestId.current) {
      setLoading(false);
    }
  }
};

// Debounce automatic reloads
const debouncedReload = useMemo(
  () => debounce(() => loadFiles(), 1000),
  []
);

// Use debounced version for WebSocket events
useEffect(() => {
  const handleFileProcessed = (event) => {
    console.log('[Gallery] File processed, reloading...');
    debouncedReload(); // Instead of immediate loadFiles()
  };

  window.addEventListener('file:processed', handleFileProcessed);
  return () => window.removeEventListener('file:processed', handleFileProcessed);
}, []);
```

---

### 6. Inconsistent Error User Feedback
**Create**: `/src/utils/errorHandler.js`
**Issue**: Mix of alert(), console.error(), setError()

**Implementation**:
```javascript
// New centralized error handler
export class AppError extends Error {
  constructor(message, { cause, context, userMessage, severity = 'error' } = {}) {
    super(message);
    this.name = 'AppError';
    this.cause = cause;
    this.context = context;
    this.userMessage = userMessage || message;
    this.severity = severity;
  }
}

export function handleError(error, context) {
  // Log for debugging
  console.error(`[${context}]`, {
    message: error.message,
    status: error.response?.status,
    data: error.response?.data,
    stack: error.stack
  });

  // Determine user-friendly message
  let userMessage = '알 수 없는 오류가 발생했습니다.';
  let retryable = false;

  if (error.response) {
    const status = error.response.status;

    if (status === 401 || status === 403) {
      userMessage = '로그인이 필요합니다.';
      retryable = false;
    } else if (status === 404) {
      userMessage = '요청한 리소스를 찾을 수 없습니다.';
      retryable = false;
    } else if (status >= 500) {
      userMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      retryable = true;
    } else if (status === 429) {
      userMessage = '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
      retryable = true;
    } else {
      userMessage = error.response.data?.message || error.response.data?.error || userMessage;
    }
  } else if (error.message === 'Network Error') {
    userMessage = '네트워크 연결을 확인해주세요.';
    retryable = true;
  }

  return {
    userMessage,
    technicalMessage: error.message,
    context,
    retryable,
    status: error.response?.status
  };
}

// Usage in Gallery.jsx:
import { handleError } from '../utils/errorHandler';

const handleDownload = async () => {
  try {
    await fileApi.downloadBatchFiles(selectedFiles);
    setSelectedFiles([]);
    setIsSelectionMode(false);
  } catch (err) {
    const errorInfo = handleError(err, 'Download');

    // Show user-friendly toast instead of alert
    toast.error(errorInfo.userMessage, {
      action: errorInfo.retryable ? {
        label: '다시 시도',
        onClick: handleDownload
      } : undefined
    });
  }
};
```

---

### 7. API Response Normalization
**Create**: `/src/api/normalizer.js`
**Issue**: Inconsistent field names (snake_case vs camelCase)

**Implementation**:
```javascript
export function normalizeFileResponse(file) {
  return {
    id: file.id,
    fileName: file.file_name || file.fileName,
    contentType: file.content_type || file.contentType,
    fileType: file.file_type || file.fileType,
    fileSize: file.file_size || file.fileSize,
    thumbnailUrl: file.thumbnail_url || file.thumbnailUrl,
    downloadUrl: file.download_url || file.downloadUrl,
    uploadedAt: file.uploaded_at || file.uploadedAt || file.created_at,
    tags: file.tags || [],
    duration: file.duration || null,
    isFavorite: file.is_favorite || false,
    processingStatus: file.processing_status || 'completed',
    processingProgress: file.processing_progress || 0,
    processingStage: file.processing_stage || null,
    processingError: file.processing_error || null,
  };
}

// Use in client.js interceptor:
client.interceptors.response.use(
  (response) => {
    // Normalize file data in responses
    if (response.data?.files) {
      response.data.files = response.data.files.map(normalizeFileResponse);
    } else if (response.data?.data && Array.isArray(response.data.data)) {
      response.data.data = response.data.data.map(normalizeFileResponse);
    }
    return response;
  },
  // ... error handling
);
```

---

## P3 - LOW (Nice to Have)

### 8. React Error Boundaries
**Create**: `/src/components/ErrorBoundary.jsx`
**Issue**: Component errors crash entire app

**Implementation**:
```javascript
import React from 'react';

export class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.setState({ error, errorInfo });

    // Send to error tracking service
    // Sentry.captureException(error, { extra: errorInfo });
  }

  resetError = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          maxWidth: '500px',
          margin: '100px auto'
        }}>
          <h2>문제가 발생했습니다</h2>
          <p>페이지를 새로고침하거나 잠시 후 다시 시도해주세요.</p>
          <details style={{ marginTop: '20px', textAlign: 'left' }}>
            <summary>기술적 세부정보</summary>
            <pre style={{
              background: '#f5f5f5',
              padding: '10px',
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '12px'
            }}>
              {this.state.error?.toString()}
              {this.state.errorInfo?.componentStack}
            </pre>
          </details>
          <button
            onClick={this.resetError}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              background: '#007AFF',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            다시 시도
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage in App.jsx:
<ErrorBoundary>
  <Gallery />
</ErrorBoundary>
```

---

### 9. Reduce Logging Noise
**Files**: Multiple
**Issue**: Production logs cluttered with debug info

**Fix**:
```javascript
// Create logger utility
// File: /src/utils/logger.js

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
};

const currentLevel = import.meta.env.MODE === 'production'
  ? LOG_LEVELS.ERROR
  : LOG_LEVELS.DEBUG;

export const logger = {
  debug: (...args) => {
    if (currentLevel <= LOG_LEVELS.DEBUG) {
      console.log('[DEBUG]', ...args);
    }
  },

  info: (...args) => {
    if (currentLevel <= LOG_LEVELS.INFO) {
      console.log('[INFO]', ...args);
    }
  },

  warn: (...args) => {
    if (currentLevel <= LOG_LEVELS.WARN) {
      console.warn('[WARN]', ...args);
    }
  },

  error: (...args) => {
    if (currentLevel <= LOG_LEVELS.ERROR) {
      console.error('[ERROR]', ...args);
    }
  }
};

// Replace all console.log with logger:
// console.log('📤 Sending batch...')
// → logger.debug('Sending batch...')

// console.error('Failed:', err)
// → logger.error('Failed:', err)
```

---

### 10. Toast Notification System
**Create**: `/src/components/Toast.jsx`
**Issue**: Replace alert() popups with non-blocking toasts

**Implementation** (using react-hot-toast):
```bash
npm install react-hot-toast
```

```javascript
// In App.jsx or main layout:
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
            borderRadius: '12px',
          },
          success: {
            iconTheme: {
              primary: '#4ADE80',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />
      {/* rest of app */}
    </>
  );
}

// Replace all alert() calls:
import toast from 'react-hot-toast';

// Before:
alert('다운로드에 실패했습니다.');

// After:
toast.error('다운로드에 실패했습니다.', {
  duration: 5000,
  action: {
    label: 'Retry',
    onClick: handleRetry
  }
});
```

---

## Quick Fix Checklist

**Today** (1-2 hours):
- [ ] Move getBatchProcessingStatus to correct object
- [ ] Add fileIds validation before API call
- [ ] Test video upload and processing status

**This Week** (4-6 hours):
- [ ] Implement WebSocket fallback logic
- [ ] Add retry for upload completion notification
- [ ] Create errorHandler utility
- [ ] Fix race conditions with request ID tracking

**Next Week** (8-12 hours):
- [ ] Implement API response normalizer
- [ ] Add React Error Boundaries
- [ ] Replace console.log with logger utility
- [ ] Install and configure toast system
- [ ] Replace all alert() with toast.error()

---

## Testing Plan

### Manual Testing
1. **Upload Flow**
   - Upload image → should complete immediately
   - Upload video → should show processing status → complete within 10s
   - Upload 10+ files → should track all statuses
   - Kill backend during upload → should show error with retry

2. **Error Scenarios**
   - Disconnect network → should show network error
   - Stop WebSocket server → should fallback to polling
   - Upload duplicate file → should handle 409 conflict
   - Upload oversized file → should show size limit error

3. **Recovery Testing**
   - Refresh page during processing → should resume status tracking
   - Retry failed upload → should work on second attempt
   - Click error retry button → should re-attempt operation

### Automated Testing
```javascript
// Unit test example
describe('fileApi.getBatchProcessingStatus', () => {
  it('should validate input before API call', async () => {
    await expect(
      fileApi.getBatchProcessingStatus([])
    ).rejects.toThrow('No file IDs provided');

    await expect(
      fileApi.getBatchProcessingStatus([1, undefined, 3])
    ).rejects.toThrow('Invalid file ID');
  });

  it('should normalize API response', async () => {
    const response = await fileApi.getBatchProcessingStatus([1, 2]);
    response.results.forEach(result => {
      expect(result).toHaveProperty('fileId');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('progress');
    });
  });
});
```

---

## Rollout Plan

### Phase 1: Hotfixes (Day 1)
- Deploy P0 fixes to production
- Monitor error rates
- Rollback if error rate increases

### Phase 2: Infrastructure (Week 1)
- Deploy P1 fixes to staging
- QA testing for 2 days
- Gradual rollout to production (10% → 50% → 100%)

### Phase 3: Enhancements (Week 2)
- Deploy P2 fixes to staging
- User acceptance testing
- Full production rollout

### Success Criteria
- Zero "getBatchProcessingStatus is not a function" errors
- < 1% API error rate
- WebSocket connection uptime > 95%
- User-reported errors down by 80%
