# CloudRepository API 통합 가이드

## 📡 API 엔드포인트 정보

### Base URLs
- **인증 API**: `http://localhost:18081/v0.1` (포트: 18081)
- **파일 API**: `http://localhost:18080/api/v1` (포트: 18080)

---

## 🔐 인증

모든 파일 API 요청에는 Authorization 헤더 필요:
```
Authorization: Bearer {access_token}
```

---

## 📂 파일 API 엔드포인트

### 1. 파일 업로드 URL 요청 (단일)

**POST** `/api/v1/files/upload`

#### Request
```json
{
  "file_name": "photo.jpg",
  "content_type": "image/jpeg",
  "file_type": "image",
  "file_size": 102400
}
```

#### Response
```json
{
  "file_id": 1,
  "upload_url": "https://s3.amazonaws.com/...",
  "s3_key": "image/123/uuid_random.jpg",
  "expires_in": 900
}
```

#### 사용 예시
```javascript
// fileApi.js
const uploadInfo = await fileApi.requestUploadUrl({
  file_name: file.name,
  content_type: file.type,
  file_type: file.type.startsWith('image/') ? 'image' : 'video',
  file_size: file.size,
});
```

---

### 2. 배치 업로드 URL 요청 (최대 30개)

**POST** `/api/v1/files/upload/batch`

#### Request
```json
{
  "files": [
    {
      "file_name": "photo1.jpg",
      "content_type": "image/jpeg",
      "file_type": "image",
      "file_size": 102400
    },
    {
      "file_name": "video1.mp4",
      "content_type": "video/mp4",
      "file_type": "video",
      "file_size": 5242880
    }
  ]
}
```

#### Response
```json
{
  "results": [
    {
      "file_id": 1,
      "upload_url": "https://s3.amazonaws.com/...",
      "s3_key": "image/123/uuid1.jpg",
      "expires_in": 900
    },
    {
      "file_id": 2,
      "upload_url": "https://s3.amazonaws.com/...",
      "s3_key": "video/123/uuid2.mp4",
      "expires_in": 900
    }
  ],
  "total_count": 2,
  "success_count": 2,
  "failed_count": 0
}
```

---

### 3. 파일 목록 조회

**GET** `/api/v1/files`

#### Query Parameters
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| file_type | string | X | "image" \| "video" |
| keyword | string | X | 파일명/태그 검색 |
| tags | string[] | X | 태그 필터 |
| sort | string | X | "latest" \| "oldest" \| "name" \| "size" |
| start_date | string | X | YYYY-MM-DD |
| end_date | string | X | YYYY-MM-DD |
| page | number | X | 기본: 1 |
| page_size | number | X | 기본: 20, 최대: 100 |

#### Response
```json
{
  "files": [
    {
      "id": 1,
      "file_name": "photo.jpg",
      "file_type": "image",
      "content_type": "image/jpeg",
      "file_size": 102400,
      "tags": [
        { "id": 1, "name": "vacation" },
        { "id": 2, "name": "family" }
      ],
      "created_at": "2025-01-15T10:30:00Z",
      "updated_at": "2025-01-15T10:30:00Z"
    }
  ],
  "total_count": 100,
  "page": 1,
  "page_size": 20
}
```

#### 사용 예시
```javascript
// 최신순 이미지 20개 조회
const result = await fileApi.getFiles({
  file_type: 'image',
  sort: 'latest',
  page: 1,
  page_size: 20
});

// 날짜 범위로 필터링
const result = await fileApi.getFiles({
  start_date: '2025-01-01',
  end_date: '2025-01-31',
  sort: 'latest'
});
```

---

### 4. 파일 다운로드 URL 요청

**GET** `/api/v1/files/:id/download`

#### Path Parameters
- `id` (number): 파일 ID

#### Response
```json
{
  "download_url": "https://s3.amazonaws.com/...",
  "file_name": "photo.jpg",
  "expires_in": 900
}
```

#### 사용 예시
```javascript
// 단일 파일 다운로드
await fileApi.downloadFile(fileId);

// 배치 다운로드
await fileApi.downloadBatchFiles([1, 2, 3, 4, 5]);
```

---

### 5. 파일 삭제

**DELETE** `/api/v1/files/:id`

#### Path Parameters
- `id` (number): 파일 ID

#### Response
```json
{
  "message": "file deleted successfully"
}
```

#### 사용 예시
```javascript
// 단일 파일 삭제
await fileApi.deleteFile(fileId);

// 배치 삭제
await fileApi.deleteBatchFiles([1, 2, 3]);
```

---

## 🔄 전체 업로드 플로우

### 단일 파일 업로드
```javascript
import fileApi from './api/fileApi';

// 1. 파일 선택
const file = document.getElementById('fileInput').files[0];

// 2. 전체 업로드 (URL 요청 + S3 업로드)
const result = await fileApi.uploadFile(file, (progress) => {
  console.log(`업로드 진행률: ${progress}%`);
});

console.log('업로드 완료:', result.file_id);

// 3. 파일 목록 새로고침
const files = await fileApi.getFiles();
```

### 배치 파일 업로드
```javascript
// 1. 여러 파일 선택
const files = Array.from(document.getElementById('fileInput').files);

// 2. 배치 업로드
const results = await fileApi.uploadBatchFiles(files, (fileIndex, progress) => {
  console.log(`파일 ${fileIndex + 1}: ${progress}%`);
});

console.log('모든 파일 업로드 완료:', results);
```

---

## 🎯 프론트엔드 구현

### 1. API 클라이언트 (`src/api/fileApi.js`)
- ✅ 모든 API 엔드포인트 구현
- ✅ 파일 검증 유틸리티 포함
- ✅ Presigned URL 기반 S3 업로드
- ✅ 진행률 콜백 지원

### 2. 파일 업로드 컴포넌트 (`src/components/FileUpload.jsx`)
- ✅ 드래그 앤 드롭 지원
- ✅ 파일 검증 (타입, 크기)
- ✅ 업로드 진행률 표시
- ✅ 배치 업로드 (최대 30개)
- ✅ 에러 핸들링

### 3. Gallery 페이지 (`src/pages/Gallery.jsx`)
- ✅ 실제 API 연동
- ✅ 날짜 기반 그룹핑
- ✅ 필터링 & 정렬
- ✅ 다운로드 & 삭제 기능
- ✅ 로딩 & 에러 상태 처리

---

## ⚙️ 프록시 설정 (`vite.config.js`)

```javascript
export default defineConfig({
  server: {
    proxy: {
      // 인증 API (포트: 18081)
      '/v0.1': {
        target: 'http://13.203.37.93:18081',
        changeOrigin: true,
        secure: false,
      },
      // 파일 API (포트: 18080)
      '/api/v1': {
        target: 'http://localhost:18080',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
```

---

## 📋 파일 검증 규칙

### 허용 파일 타입
```javascript
// 이미지
['image/jpeg', 'image/png', 'image/gif', 'image/webp']

// 동영상
['video/mp4', 'video/webm', 'video/avi', 'video/mov']
```

### 크기 제한
- **최대 파일 크기**: 100MB
- **배치 업로드**: 최대 30개

### 검증 예시
```javascript
import { fileValidation } from './api/fileApi';

// 단일 파일 검증
const result = fileValidation.validate(file);
if (!result.valid) {
  console.error(result.error);
}

// 배치 파일 검증
const batchResult = fileValidation.validateBatch(files);
if (!batchResult.valid) {
  console.error(batchResult.errors);
}
```

---

## 🚨 에러 처리

### API 에러 응답
```json
{
  "error": "error message"
}
```

### 프론트엔드 에러 핸들링
```javascript
try {
  const result = await fileApi.uploadFile(file);
} catch (error) {
  const errorMessage =
    error.response?.data?.error ||
    error.message ||
    '업로드에 실패했습니다.';

  console.error('Upload failed:', errorMessage);
  alert(errorMessage);
}
```

---

## 🧪 테스트 방법

### 1. 개발 서버 시작
```bash
npm run dev
```

### 2. 백엔드 API 확인
```bash
# 파일 API (18080) 상태 확인
curl http://localhost:18080/api/v1/files -H "Authorization: Bearer {token}"

# 인증 API (18081) 상태 확인
curl http://13.203.37.93:18081/v0.1/auth/google/signin
```

### 3. 프론트엔드 테스트
1. 로그인 후 Gallery 페이지 접속
2. "업로드" 버튼 클릭
3. 파일 선택 또는 드래그 앤 드롭
4. 업로드 진행률 확인
5. 파일 목록에 표시 확인
6. 다운로드/삭제 기능 테스트

---

## 🔧 트러블슈팅

### 404 에러
```
문제: POST /api/v1/files/upload 404
해결: vite.config.js 프록시 설정 확인
```

### CORS 에러
```
문제: Access-Control-Allow-Origin 에러
해결: 백엔드에서 CORS 헤더 추가
```

### 업로드 실패
```
문제: S3 업로드 실패
해결: Presigned URL 만료 시간 확인 (900초)
```

---

## 📚 관련 문서

- `src/api/fileApi.js` - API 클라이언트 구현
- `src/components/FileUpload.jsx` - 업로드 컴포넌트
- `src/pages/Gallery.jsx` - Gallery 페이지
- `claudedocs/S3_STORAGE_STRATEGY.md` - S3 저장 전략
- `claudedocs/OAUTH_500_ERROR_RESOLUTION.md` - OAuth 문제 해결

---

## ✅ 체크리스트

### 백엔드 준비
- [ ] 파일 API 서버 실행 (포트: 18080)
- [ ] 인증 API 서버 실행 (포트: 18081)
- [ ] S3 버킷 설정
- [ ] Presigned URL 생성 로직
- [ ] CORS 설정

### 프론트엔드 준비
- [x] fileApi.js 구현
- [x] FileUpload 컴포넌트
- [x] Gallery 페이지 API 연동
- [x] vite.config.js 프록시 설정
- [ ] 인증 토큰 저장/관리

### 테스트
- [ ] 단일 파일 업로드
- [ ] 배치 파일 업로드
- [ ] 파일 목록 조회
- [ ] 필터링 & 정렬
- [ ] 파일 다운로드
- [ ] 파일 삭제

---

**마지막 업데이트**: 2025-11-25
**작성자**: Claude Code
