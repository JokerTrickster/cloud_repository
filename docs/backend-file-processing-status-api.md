# 백엔드 API 요청: 파일 처리 진행 상태 조회 API

## 요청 배경

현재 시스템에서 대용량 비디오 파일을 업로드하면 백엔드에서 백그라운드로 비동기 처리(썸네일 생성, 메타데이터 추출 등)를 수행하지만, 프론트엔드에서는 처리가 완료될 때까지 진행 상황을 확인할 방법이 없습니다.

**현재 흐름:**
1. 사용자가 대용량 비디오를 업로드 (S3 업로드는 진행률 표시 ✅)
2. 프론트엔드에서 `/api/v1/files/{id}/complete-upload` 호출
3. 백엔드에서 백그라운드 처리 시작 (썸네일 생성, duration 추출 등)
4. ❌ **사용자는 처리 진행 상황을 알 수 없음**
5. WebSocket `file:processed` 이벤트로 완료/실패만 통지

**문제점:**
- 대용량 파일(50MB+)은 처리에 수십 초~수 분 소요
- 사용자가 페이지를 벗어나거나 새로고침하면 처리 중인 파일이 어떤 상태인지 알 수 없음
- 처리가 진행 중인지, 멈춘 건지, 실패한 건지 불명확

---

## API 요구사항

### 1. 파일 처리 상태 조회 API

**엔드포인트:**
```
GET /api/v1/files/{file_id}/processing-status
```

**헤더:**
```
Authorization: Bearer {access_token}
```

**경로 파라미터:**
- `file_id` (required, integer): 파일 ID

**응답 (200 OK):**

#### Case 1: 처리 대기 중
```json
{
  "file_id": 123,
  "status": "pending",
  "progress": 0,
  "stage": null,
  "created_at": "2025-12-01T10:30:00Z",
  "updated_at": "2025-12-01T10:30:00Z"
}
```

#### Case 2: 처리 중
```json
{
  "file_id": 123,
  "status": "processing",
  "progress": 45,
  "stage": "generating_thumbnail",
  "estimated_completion_time": "2025-12-01T10:32:00Z",
  "created_at": "2025-12-01T10:30:00Z",
  "updated_at": "2025-12-01T10:31:15Z"
}
```

#### Case 3: 완료
```json
{
  "file_id": 123,
  "status": "completed",
  "progress": 100,
  "stage": "done",
  "thumbnail_url": "https://s3.amazonaws.com/.../thumbnail.jpg",
  "duration": 125,
  "metadata": {
    "width": 1920,
    "height": 1080,
    "codec": "h264"
  },
  "created_at": "2025-12-01T10:30:00Z",
  "updated_at": "2025-12-01T10:32:30Z",
  "completed_at": "2025-12-01T10:32:30Z"
}
```

#### Case 4: 실패
```json
{
  "file_id": 123,
  "status": "failed",
  "progress": 35,
  "stage": "extracting_metadata",
  "error": {
    "code": "METADATA_EXTRACTION_FAILED",
    "message": "Failed to extract video metadata: Invalid codec"
  },
  "created_at": "2025-12-01T10:30:00Z",
  "updated_at": "2025-12-01T10:31:45Z",
  "failed_at": "2025-12-01T10:31:45Z"
}
```

**응답 필드 설명:**

| 필드 | 타입 | 설명 |
|------|------|------|
| `file_id` | integer | 파일 ID |
| `status` | string | 처리 상태: `pending`, `processing`, `completed`, `failed` |
| `progress` | integer | 진행률 (0-100) |
| `stage` | string | 현재 처리 단계 (아래 참고) |
| `estimated_completion_time` | string (ISO 8601) | 예상 완료 시각 (optional) |
| `thumbnail_url` | string | 썸네일 URL (completed 상태에만) |
| `duration` | integer | 비디오 길이(초) (completed 상태, 비디오만) |
| `metadata` | object | 파일 메타데이터 (completed 상태에만) |
| `error` | object | 에러 정보 (failed 상태에만) |
| `created_at` | string (ISO 8601) | 파일 생성 시각 |
| `updated_at` | string (ISO 8601) | 마지막 업데이트 시각 |
| `completed_at` | string (ISO 8601) | 완료 시각 (completed 상태에만) |
| `failed_at` | string (ISO 8601) | 실패 시각 (failed 상태에만) |

**처리 단계 (stage) 값:**

| Stage | 설명 | 예상 진행률 |
|-------|------|------------|
| `null` | 대기 중 | 0% |
| `validating_file` | 파일 유효성 검증 | 5-10% |
| `extracting_metadata` | 메타데이터 추출 | 10-30% |
| `generating_thumbnail` | 썸네일 생성 | 30-70% |
| `uploading_thumbnail` | 썸네일 S3 업로드 | 70-90% |
| `finalizing` | 최종 처리 | 90-100% |
| `done` | 완료 | 100% |

**에러 응답:**

```json
// 404 Not Found
{
  "error": "FILE_NOT_FOUND",
  "message": "File with ID 123 not found"
}

// 403 Forbidden
{
  "error": "PERMISSION_DENIED",
  "message": "You do not have permission to access this file"
}

// 401 Unauthorized
{
  "error": "UNAUTHORIZED",
  "message": "Invalid or expired access token"
}
```

---

### 2. 배치 파일 처리 상태 조회 API (Optional, 향후 확장)

**엔드포인트:**
```
POST /api/v1/files/processing-status/batch
```

**요청 바디:**
```json
{
  "file_ids": [123, 124, 125, 126]
}
```

**응답 (200 OK):**
```json
{
  "results": [
    {
      "file_id": 123,
      "status": "completed",
      "progress": 100,
      "stage": "done"
    },
    {
      "file_id": 124,
      "status": "processing",
      "progress": 45,
      "stage": "generating_thumbnail"
    },
    {
      "file_id": 125,
      "status": "pending",
      "progress": 0,
      "stage": null
    },
    {
      "file_id": 126,
      "status": "failed",
      "progress": 20,
      "stage": "extracting_metadata",
      "error": {
        "code": "INVALID_VIDEO_FORMAT",
        "message": "Unsupported video codec"
      }
    }
  ]
}
```

---

## 데이터베이스 스키마 권장사항

기존 `files` 테이블에 다음 컬럼 추가를 권장합니다:

```sql
ALTER TABLE files ADD COLUMN processing_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE files ADD COLUMN processing_progress INTEGER DEFAULT 0;
ALTER TABLE files ADD COLUMN processing_stage VARCHAR(50);
ALTER TABLE files ADD COLUMN processing_error TEXT;
ALTER TABLE files ADD COLUMN processing_started_at TIMESTAMP;
ALTER TABLE files ADD COLUMN processing_completed_at TIMESTAMP;

-- 인덱스 추가 (성능 최적화)
CREATE INDEX idx_files_processing_status ON files(processing_status);
CREATE INDEX idx_files_user_processing ON files(user_id, processing_status);
```

또는 별도 `file_processing_status` 테이블 생성:

```sql
CREATE TABLE file_processing_status (
  id SERIAL PRIMARY KEY,
  file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  progress INTEGER NOT NULL DEFAULT 0,
  stage VARCHAR(50),
  error_code VARCHAR(50),
  error_message TEXT,
  estimated_completion_time TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  failed_at TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(file_id)
);

CREATE INDEX idx_file_processing_status_file_id ON file_processing_status(file_id);
CREATE INDEX idx_file_processing_status_status ON file_processing_status(status);
```

---

## 구현 가이드

### 백그라운드 작업에서 진행 상태 업데이트

처리 작업 중간에 상태를 업데이트하는 예시:

```go
// 의사 코드 (Golang 예시)
func processVideoFile(fileID int, filePath string) error {
    // 1. 시작
    updateProcessingStatus(fileID, "processing", 0, "validating_file")

    // 2. 파일 검증
    if err := validateFile(filePath); err != nil {
        updateProcessingStatus(fileID, "failed", 5, "validating_file")
        return err
    }
    updateProcessingStatus(fileID, "processing", 10, "extracting_metadata")

    // 3. 메타데이터 추출
    metadata, err := extractMetadata(filePath)
    if err != nil {
        updateProcessingStatus(fileID, "failed", 15, "extracting_metadata")
        return err
    }
    updateProcessingStatus(fileID, "processing", 30, "generating_thumbnail")

    // 4. 썸네일 생성
    thumbnail, err := generateThumbnail(filePath, metadata)
    if err != nil {
        updateProcessingStatus(fileID, "failed", 40, "generating_thumbnail")
        return err
    }
    updateProcessingStatus(fileID, "processing", 70, "uploading_thumbnail")

    // 5. 썸네일 업로드
    thumbnailURL, err := uploadThumbnail(thumbnail)
    if err != nil {
        updateProcessingStatus(fileID, "failed", 75, "uploading_thumbnail")
        return err
    }
    updateProcessingStatus(fileID, "processing", 90, "finalizing")

    // 6. 최종 처리
    saveFileMetadata(fileID, metadata, thumbnailURL)
    updateProcessingStatus(fileID, "completed", 100, "done")

    return nil
}
```

---

## 프론트엔드 통합 계획

API가 구현되면 프론트엔드에서 다음과 같이 활용합니다:

### 1. 업로드 후 폴링
```javascript
// Upload 컴포넌트
async function uploadAndMonitor(files) {
  // 업로드
  const results = await fileApi.uploadBatchFiles(files);

  // processing 상태인 파일들을 모니터링
  const processingFiles = results.filter(r => r.processing_status === 'processing');

  // 폴링 시작 (3초마다 상태 확인)
  processingFiles.forEach(file => {
    const interval = setInterval(async () => {
      const status = await fileApi.getProcessingStatus(file.file_id);

      if (status.status === 'completed' || status.status === 'failed') {
        clearInterval(interval);
        // UI 업데이트
      }

      // 진행률 업데이트
      updateProgressBar(file.file_id, status.progress);
    }, 3000);
  });
}
```

### 2. 갤러리에서 자동 새로고침
```javascript
// Gallery 컴포넌트
useEffect(() => {
  const processingFiles = files.filter(f => f.processing_status === 'processing');

  if (processingFiles.length > 0) {
    const interval = setInterval(async () => {
      // 배치 API로 한 번에 조회
      const statuses = await fileApi.getBatchProcessingStatus(
        processingFiles.map(f => f.file_id)
      );

      // 상태 업데이트
      updateFileStatuses(statuses);
    }, 5000); // 5초마다

    return () => clearInterval(interval);
  }
}, [files]);
```

### 3. UI 컴포넌트
```jsx
// ProcessingIndicator.jsx
function ProcessingIndicator({ file }) {
  if (file.processing_status === 'completed') {
    return <Badge color="green">완료</Badge>;
  }

  if (file.processing_status === 'processing') {
    return (
      <div>
        <ProgressBar value={file.processing_progress} />
        <Text size="sm">{getStageLabel(file.processing_stage)}</Text>
      </div>
    );
  }

  if (file.processing_status === 'failed') {
    return (
      <div>
        <Badge color="red">실패</Badge>
        <Text size="sm">{file.processing_error}</Text>
      </div>
    );
  }

  return <Badge color="gray">대기 중</Badge>;
}
```

---

## 성능 고려사항

### 1. 캐싱
- 완료/실패 상태는 캐시 (Redis) - TTL 1시간
- 처리 중 상태는 캐시하지 않음 (실시간 업데이트 필요)

### 2. 폴링 최적화
- 프론트엔드에서 지수 백오프(exponential backoff) 적용
  - 첫 30초: 3초 간격
  - 30초~2분: 5초 간격
  - 2분 이후: 10초 간격

### 3. 데이터베이스 최적화
- `processing_status` 컬럼에 인덱스 추가
- 배치 조회 시 `WHERE file_id IN (...)` 사용
- 완료된 파일은 별도 아카이브 테이블로 이동 (optional)

---

## 우선순위

### Phase 1 (필수)
- ✅ 단일 파일 상태 조회 API (`GET /files/{id}/processing-status`)
- ✅ 백그라운드 작업에서 진행 상태 업데이트 로직
- ✅ 기본 상태 값 (`pending`, `processing`, `completed`, `failed`)

### Phase 2 (권장)
- ⭐ 배치 상태 조회 API (`POST /files/processing-status/batch`)
- ⭐ 상세 처리 단계 (`stage`) 업데이트
- ⭐ 예상 완료 시간 계산

### Phase 3 (선택)
- 📊 처리 통계 API (평균 처리 시간, 실패율 등)
- 🔄 재시도 메커니즘 (실패한 파일 재처리)
- 🚀 우선순위 큐 (사용자 요청 시 우선 처리)

---

## 예상 개발 일정

- API 엔드포인트 구현: **1-2일**
- DB 스키마 변경 및 마이그레이션: **0.5일**
- 백그라운드 작업 진행 상태 업데이트 로직: **1-2일**
- 테스트 및 검증: **1일**

**총 예상 기간: 3-5일**

---

## 문의사항

프론트엔드 개발자: [Your Name]
- 이 문서에 대한 질문이나 피드백이 있으면 알려주세요
- API 응답 포맷 변경이 필요하면 협의 가능합니다
- WebSocket 진행률 이벤트 추가도 고려 가능합니다 (대안)

작성일: 2025-12-01
