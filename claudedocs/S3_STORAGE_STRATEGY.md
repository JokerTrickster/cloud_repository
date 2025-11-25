# S3 저장소 설계 전략 (날짜 기반 프론트엔드)

## 📊 현재 프론트엔드 구조 분석

### UI 특징
- **날짜 기반 그룹핑**: 파일을 날짜별로 묶어서 표시 (`yyyy년 M월 d일`)
- **날짜 필터**: 특정 날짜 범위로 필터링
- **정렬**: 최신순/오래된순 정렬
- **태그 시스템**: 파일에 다중 태그 지원

### 파일 데이터 구조
```javascript
{
  id: number,
  name: string,
  date: "2025-01-15",  // ISO 형식 (YYYY-MM-DD)
  type: "image" | "video",
  url: string,
  tags: ["vacation", "family"]
}
```

---

## 🎯 권장 S3 저장 전략

### ✅ 옵션 1: 플랫 구조 + 메타데이터 기반 (추천)

**S3 저장 경로**
```
s3://bucket-name/
├── users/
│   └── {user_id}/
│       └── files/
│           ├── {uuid}-IMG_20250115_143000.jpg
│           ├── {uuid}-vacation_video.mp4
│           └── {uuid}-family_photo.jpg
```

**데이터베이스 구조**
```sql
CREATE TABLE files (
  id BIGINT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  file_name VARCHAR(255),
  s3_key VARCHAR(500) NOT NULL,          -- S3 객체 키
  file_type ENUM('image', 'video'),
  content_type VARCHAR(100),
  file_size BIGINT,
  created_at DATETIME NOT NULL,          -- 업로드 시각
  captured_at DATE,                      -- 촬영/생성 날짜 (EXIF)
  INDEX idx_user_captured (user_id, captured_at DESC),
  INDEX idx_user_created (user_id, created_at DESC)
);

CREATE TABLE file_tags (
  file_id BIGINT,
  tag_id BIGINT,
  PRIMARY KEY (file_id, tag_id)
);
```

**장점**
- ✅ DB 쿼리로 날짜별 정렬/필터링 초고속
- ✅ 태그/검색 쿼리 최적화 용이
- ✅ 프론트엔드 요구사항과 완벽 매칭
- ✅ 파일 이동 없이 날짜 수정 가능

**API 응답 예시**
```json
{
  "files": [
    {
      "id": 1,
      "file_name": "vacation.jpg",
      "file_type": "image",
      "file_size": 102400,
      "url": "https://cdn.example.com/users/123/files/{uuid}-vacation.jpg",
      "captured_at": "2025-01-15",
      "tags": [{"id": 1, "name": "vacation"}],
      "created_at": "2025-01-15T10:30:00Z"
    }
  ]
}
```

---

### ⚠️ 옵션 2: 날짜 기반 폴더 구조 (비추천)

**S3 저장 경로**
```
s3://bucket-name/
├── users/
│   └── {user_id}/
│       └── 2025/
│           └── 01/
│               └── 15/
│                   ├── IMG_143000.jpg
│                   └── video_001.mp4
```

**단점**
- ❌ 날짜 변경 시 S3 객체 이동 필요 (비용/복잡도 증가)
- ❌ 태그/검색 쿼리 비효율적 (모든 날짜 폴더 스캔)
- ❌ 날짜 범위 쿼리 시 복잡한 ListObjects 필요
- ❌ 프론트엔드 정렬 요구사항 충족 어려움

---

## 🚀 구현 가이드

### 1. 백엔드 API 설계

#### 파일 목록 조회
```
GET /api/v1/files
Query Parameters:
  - captured_date_start: 2025-01-01
  - captured_date_end: 2025-01-31
  - sort: latest | oldest
  - file_type: image | video
  - tags: vacation,family
  - page: 1
  - page_size: 20
```

**SQL 쿼리 예시**
```sql
SELECT
  f.id, f.file_name, f.file_type, f.file_size,
  f.s3_key, f.captured_at, f.created_at,
  GROUP_CONCAT(t.name) as tags
FROM files f
LEFT JOIN file_tags ft ON f.id = ft.file_id
LEFT JOIN tags t ON ft.tag_id = t.id
WHERE f.user_id = ?
  AND f.captured_at BETWEEN ? AND ?
  AND (? IS NULL OR f.file_type = ?)
GROUP BY f.id
ORDER BY f.captured_at DESC
LIMIT ? OFFSET ?;
```

#### 파일 업로드
```
POST /api/v1/files
Content-Type: multipart/form-data

Body:
  - file: <binary>
  - tags: ["vacation", "family"]
  - captured_at: 2025-01-15  (선택, EXIF 기반 자동 추출)
```

**백엔드 처리 순서**
1. 파일 검증 (크기/타입/MIME)
2. UUID 생성: `{uuid}-{original_name}`
3. S3 업로드: `users/{user_id}/files/{uuid}-{name}`
4. EXIF 추출: 촬영 날짜 자동 파싱
5. DB 저장: 메타데이터 + 태그
6. 응답: `{ id, url, captured_at, ... }`

---

### 2. 프론트엔드 연동

#### API 클라이언트 수정
```javascript
// src/api/fileApi.js
import client from './client';

export const fileApi = {
  // 파일 목록 조회
  async getFiles(params) {
    const { data } = await client.get('/api/v1/files', { params });
    return data;
  },

  // 파일 업로드
  async uploadFile(file, tags = []) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tags', JSON.stringify(tags));

    const { data } = await client.post('/api/v1/files', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
  },

  // 파일 삭제
  async deleteFile(fileId) {
    await client.delete(`/api/v1/files/${fileId}`);
  },

  // 다운로드 (presigned URL)
  async getDownloadUrl(fileId) {
    const { data } = await client.get(`/api/v1/files/${fileId}/download`);
    return data.url;
  }
};
```

#### Gallery 페이지 수정
```javascript
// src/pages/Gallery.jsx
import { fileApi } from '../api/fileApi';

const Gallery = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFiles();
  }, [dateRange, filterType, sortOption]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const params = {
        captured_date_start: dateRange.start,
        captured_date_end: dateRange.end,
        file_type: filterType === 'all' ? null : filterType,
        sort: sortOption,
        page: 1,
        page_size: 100
      };

      const result = await fileApi.getFiles(params);
      setFiles(result.files);
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setLoading(false);
    }
  };

  // 날짜별 그룹핑 (백엔드에서 captured_at 제공)
  const groupedFiles = useMemo(() => {
    return files.reduce((acc, file) => {
      const date = file.captured_at; // "2025-01-15"
      if (!acc[date]) acc[date] = [];
      acc[date].push(file);
      return acc;
    }, {});
  }, [files]);
};
```

---

### 3. EXIF 데이터 활용

**촬영 날짜 자동 추출**
```javascript
// 백엔드에서 EXIF 라이브러리 사용
// Node.js: exifr, exif-parser
// Python: Pillow, exifread

import exifr from 'exifr';

async function extractCapturedDate(fileBuffer) {
  try {
    const exif = await exifr.parse(fileBuffer);
    return exif.DateTimeOriginal || exif.CreateDate || new Date();
  } catch (error) {
    return new Date(); // fallback to upload time
  }
}
```

---

## 🎨 프론트엔드 최적화

### 무한 스크롤 + 가상화
```javascript
import { useInfiniteQuery } from '@tanstack/react-query';
import { FixedSizeList } from 'react-window';

const Gallery = () => {
  const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ['files', dateRange, filterType],
    queryFn: ({ pageParam = 1 }) =>
      fileApi.getFiles({ ...params, page: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextPage
  });
};
```

### 이미지 CDN 최적화
```javascript
// S3 + CloudFront 썸네일 자동 생성
const getThumbnailUrl = (s3Key, size = 300) => {
  return `https://cdn.example.com/thumbnails/${size}x${size}/${s3Key}`;
};
```

---

## 📝 백엔드 팀 요구사항

### 필수 API
1. ✅ `GET /api/v1/files` - 날짜 범위 + 정렬 지원
2. ✅ `POST /api/v1/files` - EXIF 기반 날짜 추출
3. ✅ `DELETE /api/v1/files/{id}` - 파일 삭제
4. ✅ `GET /api/v1/files/{id}/download` - Presigned URL 제공

### 데이터베이스 인덱스
```sql
-- 날짜 범위 쿼리 최적화
CREATE INDEX idx_user_captured
  ON files (user_id, captured_at DESC);

-- 태그 검색 최적화
CREATE INDEX idx_file_tags
  ON file_tags (tag_id, file_id);
```

### S3 설정
- **버킷 정책**: User별 폴더 접근 제어
- **LifeCycle**: 삭제된 파일 30일 후 영구 삭제
- **CORS**: 프론트엔드 도메인 허용
- **Versioning**: 실수 삭제 방지

---

## 🔒 보안 고려사항

1. **Presigned URL**: 직접 S3 접근 방지
2. **파일 검증**: MIME 타입 + 확장자 체크
3. **용량 제한**: 이미지 50MB, 비디오 500MB
4. **바이러스 스캔**: ClamAV 등 스캔 필수

---

## 💡 결론

**✅ 추천: 플랫 구조 + 메타데이터 기반**
- 프론트엔드 날짜 기반 UI와 완벽 호환
- 쿼리 성능 우수
- 유지보수 용이
- 확장 가능

**❌ 비추천: 날짜 폴더 구조**
- 프론트엔드 요구사항 충족 어려움
- 날짜 변경 시 복잡도 증가
