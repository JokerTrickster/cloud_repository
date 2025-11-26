# 백엔드 API 수정 사항

## 1. 파일 업로드 API 수정

### POST /api/v1/files/upload/batch

**요청 본문에 추가 필드:**

```json
{
  "files": [
    {
      "file_name": "video.mp4",
      "content_type": "video/mp4",
      "file_type": "video",
      "file_size": 5242880,
      "tags": ["여행", "서울"],  // ✅ 추가됨
      "duration": 125.5          // ✅ 추가됨 (초 단위, 비디오만 해당)
    }
  ]
}
```

**필드 설명:**
- `tags`: 파일 태그 배열 (string[])
  - 이미지/비디오 모두 지원
  - 빈 배열 가능

- `duration`: 비디오 길이 (number)
  - 비디오 파일만 해당
  - 초 단위 (소수점 2자리)
  - 이미지는 null 또는 생략

## 2. 데이터베이스 스키마 수정

### files 테이블

```sql
ALTER TABLE files
ADD COLUMN duration DECIMAL(10,2) NULL COMMENT '비디오 길이(초)',
ADD COLUMN tags JSON NULL COMMENT '파일 태그 배열';

-- 또는 별도 tags 테이블 사용 (정규화)
CREATE TABLE file_tags (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  file_id BIGINT NOT NULL,
  tag VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
  INDEX idx_tag (tag),
  INDEX idx_file_id (file_id)
);
```

## 3. 파일 목록 조회 API 응답 수정

### GET /api/v1/files

**응답 본문에 추가 필드:**

```json
{
  "files": [
    {
      "id": 1,
      "file_name": "video.mp4",
      "file_type": "video",
      "file_size": 5242880,
      "url": "https://s3.amazonaws.com/bucket/video.mp4",
      "thumbnail_url": "https://s3.amazonaws.com/bucket/thumb_video.jpg",  // ✅ 비디오도 썸네일 URL 반환
      "tags": ["여행", "서울"],  // ✅ 추가됨
      "duration": 125.5,          // ✅ 추가됨 (비디오만, 이미지는 null)
      "created_at": "2025-11-26T10:00:00Z",
      "updated_at": "2025-11-26T10:00:00Z"
    }
  ],
  "total_count": 100,
  "page": 1,
  "page_size": 20
}
```

## 4. 구현 체크리스트

### 필수 구현
- [ ] `duration` 필드를 업로드 API에서 받아서 DB에 저장
- [ ] `tags` 필드를 업로드 API에서 받아서 DB에 저장
- [ ] 파일 목록 API에서 `duration`과 `tags` 필드 반환
- [ ] 비디오 파일도 `thumbnail_url` 반환 (이미 구현되어 있을 수 있음)

### 선택 구현 (추천)
- [ ] 태그 검색 기능: `GET /api/v1/files?tags=여행,서울`
- [ ] 인기 태그 조회: `GET /api/v1/tags/popular`
- [ ] 태그 자동완성: `GET /api/v1/tags/autocomplete?q=여`
- [ ] Duration 기반 필터링: `GET /api/v1/files?min_duration=60&max_duration=300`

## 5. 썸네일 저장 확인

현재 업로드 API가 `thumbnail_upload_url`을 반환하는지 확인:

```json
{
  "file_id": 123,
  "upload_url": "https://s3.amazonaws.com/presigned-url",
  "thumbnail_upload_url": "https://s3.amazonaws.com/thumb-presigned-url",  // ✅ 비디오도 반환 필요
  "s3_key": "files/video.mp4",
  "expires_in": 3600
}
```

- **이미지**: 클라이언트가 리사이징하여 썸네일 업로드 (이미 구현됨)
- **비디오**: 클라이언트가 첫 프레임 캡처하여 썸네일 업로드 (새로 구현됨)

## 6. 마이그레이션 순서

1. DB 스키마 수정 (duration, tags 컬럼 추가)
2. 업로드 API 수정 (duration, tags 받기)
3. 파일 목록 API 수정 (duration, tags 반환)
4. 기존 파일 데이터 마이그레이션 (duration=null, tags=[] 설정)

## 7. 테스트 케이스

```bash
# 1. 비디오 업로드 (duration + tags)
curl -X POST /api/v1/files/upload/batch \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "files": [{
      "file_name": "test.mp4",
      "content_type": "video/mp4",
      "file_type": "video",
      "file_size": 1000000,
      "tags": ["test", "video"],
      "duration": 30.5
    }]
  }'

# 2. 파일 목록 조회 (duration, tags 확인)
curl -X GET /api/v1/files \
  -H "Authorization: Bearer $TOKEN"

# 3. 태그 필터링
curl -X GET "/api/v1/files?tags=test,video" \
  -H "Authorization: Bearer $TOKEN"
```

## 요약

**클라이언트 (완료):**
- ✅ 비디오 썸네일 생성 (첫 프레임 캡처)
- ✅ 비디오 길이 추출
- ✅ 태그 입력 UI
- ✅ 업로드 시 duration, tags 전송

**서버 (수정 필요):**
- ⚠️ DB에 duration, tags 컬럼 추가
- ⚠️ 업로드 API에서 duration, tags 받아서 저장
- ⚠️ 파일 목록 API에서 duration, tags 반환
- ⚠️ 비디오 파일도 thumbnail_upload_url 반환 확인
