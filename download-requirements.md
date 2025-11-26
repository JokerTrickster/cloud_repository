# 다운로드 기능 서버 측 요구사항

## 문제 상황
현재 S3 presigned URL로 다운로드 시 파일이 브라우저에서 열리는 문제 발생

## 해결 방법

### 1. S3 Presigned URL 생성 시 Content-Disposition 헤더 추가 (필수)

다운로드 URL을 생성할 때 `response-content-disposition` 파라미터를 추가하여 파일을 강제 다운로드하도록 설정

#### Go 예시:
```go
import (
    "github.com/aws/aws-sdk-go/service/s3"
    "time"
)

func GenerateDownloadURL(s3Client *s3.S3, bucket, key, fileName string) (string, error) {
    req, _ := s3Client.GetObjectRequest(&s3.GetObjectInput{
        Bucket: aws.String(bucket),
        Key:    aws.String(key),
        // 파일을 다운로드로 강제 (브라우저에서 열지 않음)
        ResponseContentDisposition: aws.String(fmt.Sprintf("attachment; filename=\"%s\"", fileName)),
    })

    urlStr, err := req.Presign(15 * time.Minute)
    return urlStr, err
}
```

#### Python (boto3) 예시:
```python
import boto3
from botocore.client import Config

s3_client = boto3.client('s3', config=Config(signature_version='s3v4'))

def generate_download_url(bucket, key, file_name, expiration=900):
    """
    파일 다운로드 URL 생성

    Args:
        bucket: S3 버킷 이름
        key: S3 객체 키
        file_name: 다운로드될 파일명
        expiration: URL 유효 시간 (초)
    """
    url = s3_client.generate_presigned_url(
        'get_object',
        Params={
            'Bucket': bucket,
            'Key': key,
            'ResponseContentDisposition': f'attachment; filename="{file_name}"'
        },
        ExpiresIn=expiration
    )
    return url
```

### 2. S3 버킷 CORS 설정 (필수)

클라이언트에서 fetch로 파일을 다운로드하려면 CORS 설정 필요

#### S3 CORS 설정 예시:
```json
[
    {
        "AllowedHeaders": [
            "*"
        ],
        "AllowedMethods": [
            "GET",
            "HEAD"
        ],
        "AllowedOrigins": [
            "http://localhost:5173",
            "http://localhost:3000",
            "https://your-domain.com"
        ],
        "ExposeHeaders": [
            "ETag",
            "Content-Length",
            "Content-Type"
        ],
        "MaxAgeSeconds": 3600
    }
]
```

#### AWS CLI로 CORS 설정:
```bash
aws s3api put-bucket-cors --bucket your-bucket-name --cors-configuration file://cors.json
```

### 3. API 엔드포인트 수정

#### GET /api/v1/files/:id/download

**현재 응답:**
```json
{
  "download_url": "https://s3.amazonaws.com/bucket/file.jpg?AWSAccessKeyId=...",
  "file_name": "photo.jpg",
  "expires_in": 3600
}
```

**수정 필요:**
1. `download_url` 생성 시 `ResponseContentDisposition` 파라미터 추가
2. CORS 허용된 URL 반환 확인

**수정된 응답 예시:**
```json
{
  "download_url": "https://s3.amazonaws.com/bucket/file.jpg?AWSAccessKeyId=...&response-content-disposition=attachment%3B%20filename%3D%22photo.jpg%22",
  "file_name": "photo.jpg",
  "expires_in": 3600
}
```

## 구현 체크리스트

### 필수 구현
- [ ] Presigned URL 생성 시 `ResponseContentDisposition` 추가
- [ ] S3 버킷에 CORS 설정 적용
- [ ] 프론트엔드 도메인을 CORS AllowedOrigins에 추가
- [ ] 개발/스테이징/프로덕션 환경별 도메인 설정

### 테스트
- [ ] 웹 브라우저에서 이미지 다운로드 테스트
- [ ] 웹 브라우저에서 비디오 다운로드 테스트
- [ ] 모바일 브라우저에서 다운로드 테스트
- [ ] 다중 파일 다운로드 테스트
- [ ] CORS preflight 요청 확인

## 코드 수정 예시 (Go)

```go
// 기존 코드
func (s *FileService) GetDownloadURL(fileID int64) (*DownloadURLResponse, error) {
    file, err := s.repo.GetFileByID(fileID)
    if err != nil {
        return nil, err
    }

    // ❌ 문제: Content-Disposition 없음
    req, _ := s.s3Client.GetObjectRequest(&s3.GetObjectInput{
        Bucket: aws.String(s.bucket),
        Key:    aws.String(file.S3Key),
    })

    downloadURL, err := req.Presign(15 * time.Minute)
    if err != nil {
        return nil, err
    }

    return &DownloadURLResponse{
        DownloadURL: downloadURL,
        FileName:    file.FileName,
        ExpiresIn:   900,
    }, nil
}

// 수정된 코드
func (s *FileService) GetDownloadURL(fileID int64) (*DownloadURLResponse, error) {
    file, err := s.repo.GetFileByID(fileID)
    if err != nil {
        return nil, err
    }

    // ✅ 해결: Content-Disposition 추가
    req, _ := s.s3Client.GetObjectRequest(&s3.GetObjectInput{
        Bucket: aws.String(s.bucket),
        Key:    aws.String(file.S3Key),
        ResponseContentDisposition: aws.String(
            fmt.Sprintf(`attachment; filename="%s"`, file.FileName),
        ),
    })

    downloadURL, err := req.Presign(15 * time.Minute)
    if err != nil {
        return nil, err
    }

    return &DownloadURLResponse{
        DownloadURL: downloadURL,
        FileName:    file.FileName,
        ExpiresIn:   900,
    }, nil
}
```

## 디버깅

### 다운로드 URL 테스트
```bash
# 1. URL 확인
curl -I "DOWNLOAD_URL"

# 2. Content-Disposition 헤더 확인
# 출력에 다음이 포함되어야 함:
# Content-Disposition: attachment; filename="photo.jpg"

# 3. CORS 헤더 확인
curl -I -H "Origin: http://localhost:5173" "DOWNLOAD_URL"

# 출력에 다음이 포함되어야 함:
# Access-Control-Allow-Origin: http://localhost:5173
```

### 브라우저 개발자 도구
1. Network 탭 열기
2. 다운로드 클릭
3. 요청 확인:
   - Response Headers에 `Content-Disposition: attachment` 있는지 확인
   - CORS 에러 없는지 확인

## 참고 자료

- [AWS S3 Presigned URL 문서](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)
- [S3 CORS 설정 가이드](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html)
- [Content-Disposition 헤더](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Disposition)
