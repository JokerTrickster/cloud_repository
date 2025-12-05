# Multipart Upload Implementation

## Overview

멀티파트 업로드 기능이 프론트엔드에 구현되었습니다. S3의 5GB Presigned URL 제한을 우회하기 위해 자동으로 파일 크기에 따라 적절한 업로드 방식을 선택합니다.

## Architecture

### 1. 자동 업로드 방식 선택

```javascript
File size ≤ 5GB  → Standard Presigned URL Upload
File size > 5GB  → Multipart Upload (10MB parts)
```

### 2. 구현 파일

#### `/src/api/multipartUploadApi.js`
멀티파트 업로드 전용 API 클라이언트

**주요 메서드:**
- `initiate()` - 멀티파트 업로드 시작
- `getPresignedUrls()` - 파트별 Presigned URL 요청
- `uploadPart()` - 개별 파트 업로드 (S3 직접)
- `uploadPartWithRetry()` - 재시도 로직 포함 파트 업로드
- `complete()` - 멀티파트 업로드 완료
- `abort()` - 업로드 취소
- `uploadFile()` - 전체 플로우 통합 메서드

#### `/src/hooks/useMultipartUpload.js`
React hook for multipart upload state management

**제공 기능:**
- Upload progress tracking
- Error handling
- Cancellation support
- State management

#### `/src/api/fileApi.js` (Updated)
기존 파일 API에 멀티파트 업로드 통합

**변경사항:**
- `uploadFile()`: 5GB 초과 파일 자동 감지 및 멀티파트 사용
- `uploadBatchFiles()`: 파일 크기별 자동 분리 및 처리

## Upload Flow

### Standard Upload (≤ 5GB)

```
1. Request Presigned URL
   POST /api/v1/files/upload

2. Upload to S3
   PUT {presigned_url}

3. Notify Backend
   POST /api/v1/files/{file_id}/complete-upload
```

### Multipart Upload (> 5GB)

```
1. Initiate Multipart Upload
   POST /api/v1/files/multipart/initiate
   Response: { uploadId, fileKey, partSize }

2. Calculate Parts
   totalParts = Math.ceil(fileSize / partSize)
   partNumbers = [1, 2, 3, ..., totalParts]

3. Get Presigned URLs (Batch)
   POST /api/v1/files/multipart/presigned-urls
   Body: { uploadId, fileKey, partNumbers }
   Response: { urls: [{ partNumber, url }, ...] }

4. Upload Parts in Parallel
   For each batch (concurrentUploads = 3):
     PUT {presigned_url}
     Extract ETag from response
     Track progress

5. Complete Multipart Upload
   POST /api/v1/files/multipart/complete
   Body: { uploadId, fileKey, parts: [{ partNumber, etag }, ...] }
   Response: { fileId, s3Key, fileUrl }

6. Notify Backend
   POST /api/v1/files/{file_id}/complete-upload
```

## Progress Tracking

### Standard Upload
```javascript
fileApi.uploadFile(file, (percentage) => {
  console.log(`Progress: ${percentage}%`);
});
```

### Multipart Upload
```javascript
multipartUploadApi.uploadFile(file, (completed, total, percentage) => {
  console.log(`Parts: ${completed}/${total} (${percentage}%)`);
});
```

### Batch Upload (Mixed)
```javascript
fileApi.uploadBatchFiles(files, (fileIndex, progress, status) => {
  console.log(`File ${fileIndex}: ${progress}% - ${status}`);
}, fileTags);
```

## Error Handling

### Retry Logic
- Part upload failures: 3 automatic retries with exponential backoff (1s, 2s, 3s)
- Network errors: Automatic retry before failing
- Timeout: 10 minutes per part upload

### Abort on Error
```javascript
try {
  await multipartUploadApi.uploadFile(file, onProgress);
} catch (error) {
  // Automatically calls abort({ uploadId, fileKey })
  console.error('Upload failed:', error);
}
```

## Configuration

### Part Size
- Default: 10MB (백엔드에서 설정)
- Configurable via backend API response

### Concurrent Uploads
- Default: 3 parallel uploads
- Configurable in `uploadFile()` method

```javascript
// Upload 5 parts concurrently
await multipartUploadApi.uploadFile(file, onProgress, 5);
```

### Timeouts
- Part upload: 10 minutes (600,000ms)
- Network request: 10 minutes

## Usage Examples

### Example 1: Basic Upload (Automatic Detection)
```javascript
import fileApi from './api/fileApi';

// Automatically uses multipart if > 5GB
const result = await fileApi.uploadFile(file, (progress) => {
  updateProgressBar(progress);
});

console.log('File uploaded:', result.file_id);
```

### Example 2: Batch Upload with Mixed Sizes
```javascript
import fileApi from './api/fileApi';

const files = [
  new File(..., 100MB),    // Standard
  new File(..., 6GB),      // Multipart
  new File(..., 2GB),      // Standard
];

const results = await fileApi.uploadBatchFiles(
  files,
  (fileIndex, progress, status) => {
    console.log(`File ${fileIndex}: ${progress}% - ${status}`);
  },
  {} // tags
);
```

### Example 3: Using React Hook
```javascript
import { useMultipartUpload } from './hooks/useMultipartUpload';

function UploadComponent() {
  const { uploadState, startUpload, cancelUpload } = useMultipartUpload();

  const handleUpload = async (file) => {
    await startUpload(file, (result) => {
      console.log('Upload complete:', result);
    }, 3); // 3 concurrent uploads
  };

  return (
    <div>
      <progress value={uploadState.progress} max={100} />
      <p>Parts: {uploadState.completedParts}/{uploadState.totalParts}</p>
      <button onClick={cancelUpload}>Cancel</button>
    </div>
  );
}
```

### Example 4: Direct Multipart Upload
```javascript
import multipartUploadApi from './api/multipartUploadApi';

const result = await multipartUploadApi.uploadFile(
  largeFile,
  (completed, total, percentage) => {
    console.log(`${completed}/${total} parts (${percentage}%)`);
  },
  3 // concurrent uploads
);
```

## Testing

### Test Script
```bash
node scripts/test-multipart-upload.js
```

### Manual Testing
1. Create a file > 5GB:
   ```bash
   dd if=/dev/zero of=test-large.mp4 bs=1M count=5120
   ```

2. Upload via FileUpload component
3. Monitor console for multipart upload logs
4. Verify progress tracking

## Backend Requirements

Backend must implement the following endpoints:

1. `POST /api/v1/files/multipart/initiate`
   - Input: `{ fileName, fileSize, contentType }`
   - Output: `{ uploadId, fileKey, partSize }`

2. `POST /api/v1/files/multipart/presigned-urls`
   - Input: `{ uploadId, fileKey, partNumbers }`
   - Output: `{ urls: [{ partNumber, url }] }`

3. `POST /api/v1/files/multipart/complete`
   - Input: `{ uploadId, fileKey, parts: [{ partNumber, etag }] }`
   - Output: `{ fileId, s3Key, fileUrl }`

4. `POST /api/v1/files/multipart/abort`
   - Input: `{ uploadId, fileKey }`
   - Output: `{ success: true }`

## Performance Considerations

### Memory Usage
- Parts are sliced on-demand using `File.slice()`
- No full file loading into memory
- Concurrent uploads limited to prevent browser memory issues

### Network Optimization
- Parallel upload (default: 3 concurrent)
- Batch presigned URL requests
- Automatic retry with exponential backoff

### Browser Compatibility
- Uses native `File.slice()` (supported in all modern browsers)
- Uses `axios` for reliable upload with progress tracking
- AbortController for cancellation (polyfill may be needed for older browsers)

## Limitations

1. **Maximum File Size**: Limited by browser memory and S3 constraints
2. **Part Size**: Fixed by backend (typically 10MB)
3. **Concurrent Uploads**: Limited to prevent browser overload (default: 3)
4. **Browser Timeout**: 10 minutes per part (may need adjustment for slow networks)

## Future Enhancements

1. **Resumable Uploads**: Save progress and resume after browser close
2. **Chunk Deduplication**: Skip uploading duplicate chunks
3. **Adaptive Concurrency**: Adjust based on network speed
4. **Progress Persistence**: Store progress in localStorage
5. **Background Upload**: Service Worker for background processing

## Troubleshooting

### Issue: Upload fails with "ETag not found"
**Solution**: Ensure backend returns ETag header in presigned URL response

### Issue: Slow upload speed
**Solution**: Increase concurrent uploads (max recommended: 5)

### Issue: Memory errors with very large files
**Solution**: Reduce concurrent uploads or implement queue system

### Issue: Timeout errors
**Solution**: Increase timeout in multipartUploadApi.js or check network speed

## Summary

멀티파트 업로드 구현이 완료되어 5GB 이상의 대용량 파일도 안정적으로 업로드할 수 있습니다. 기존 코드와의 통합이 완료되어 FileUpload 컴포넌트는 자동으로 파일 크기에 따라 적절한 업로드 방식을 선택합니다.
