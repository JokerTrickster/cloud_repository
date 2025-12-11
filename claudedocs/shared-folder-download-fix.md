# 공유 폴더 파일 다운로드 권한 수정 필요

## 개요

공유받은 폴더의 파일을 다운로드할 때 `"unauthorized access to file"` 오류가 발생합니다.
백엔드의 다운로드 권한 검증 로직이 파일 소유권만 확인하고, 공유 권한을 확인하지 않기 때문입니다.

**업데이트 날짜**: 2025-12-11
**영향 범위**: Backend (downloadCloudUseCase.go)
**관련 프론트엔드 문서**: SharedFolderView.jsx 구현 완료

---

## 문제 상황

### 1. 폴더 파일 목록 조회 (이미 수정됨 ✅)
**파일**: `joker_backend/services/cloudRepositoryService/features/cloudRepository/usecase/folderUseCase.go`
**API**: `GET /api/v1/folders/:id/files`
**상태**: **수정 완료** (커밋 `3439920`)

기존에는 폴더 소유권만 확인했으나, 현재는 공유 권한도 함께 확인합니다.

```go
// 수정 후: 폴더 소유권 또는 공유 권한 확인
folder, err := repo.GetFolderByID(ctx, folderID, userID)
if err != nil {
    // 폴더를 찾을 수 없거나 권한이 없음
    return nil, fmt.Errorf("folder not found or unauthorized")
}
```

### 2. 파일 다운로드 (수정 필요 ❌)
**파일**: `joker_backend/services/cloudRepositoryService/features/cloudRepository/usecase/downloadCloudUseCase.go`
**API**: `GET /api/v1/files/:id/download`
**상태**: **수정 필요**

현재는 파일 소유권만 확인하므로, 공유받은 폴더의 파일 다운로드가 실패합니다.

#### 현재 코드 (문제)
```go
func (uc *DownloadCloudUseCase) RequestDownloadURL(ctx context.Context, fileID uint, userID uint) (*model.FileDownloadResponse, error) {
    // 파일 정보 조회
    file, err := uc.fileRepo.GetFileByID(ctx, fileID)
    if err != nil {
        return nil, fmt.Errorf("file not found")
    }

    // ❌ 문제: 파일 소유권만 확인
    if file.UserID != userID {
        return nil, fmt.Errorf("unauthorized access to file")
    }

    // S3 presigned URL 생성...
}
```

#### 수정이 필요한 권한 체크 로직

파일 다운로드 권한은 다음 3가지 경우에 허용되어야 합니다:

1. **파일 소유자**: `file.UserID == userID`
2. **직접 파일 공유**: `file_shares` 테이블에 해당 파일에 대한 공유 레코드 존재
3. **부모 폴더 공유**: `folder_shares` 테이블에 해당 파일의 부모 폴더에 대한 공유 레코드 존재

#### 권한 체크 순서
```
1. 파일 소유자인가? → YES → 다운로드 허용
   ↓ NO
2. 직접 파일 공유받았는가? (file_shares 테이블 조회) → YES → 다운로드 허용
   ↓ NO
3. 부모 폴더 공유받았는가? (folder_shares 테이블 조회) → YES → 다운로드 허용
   ↓ NO
4. 권한 없음 → "unauthorized access to file" 에러 반환
```

---

## 수정 방안

### 방법 1: Repository 계층에 권한 체크 함수 추가

**위치**: `joker_backend/services/cloudRepositoryService/features/cloudRepository/domain/repository.go`

```go
type FileRepository interface {
    // 기존 메서드들...
    GetFileByID(ctx context.Context, fileID uint) (*model.File, error)

    // 추가: 파일 접근 권한 확인
    HasFileAccess(ctx context.Context, fileID uint, userID uint) (bool, error)
}
```

**구현**: `joker_backend/services/cloudRepositoryService/features/cloudRepository/repository/fileRepositoryImpl.go`

```go
func (r *FileRepositoryImpl) HasFileAccess(ctx context.Context, fileID uint, userID uint) (bool, error) {
    var file model.File

    // 1. 파일 정보 조회
    if err := r.db.WithContext(ctx).First(&file, fileID).Error; err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return false, fmt.Errorf("file not found")
        }
        return false, err
    }

    // 2. 파일 소유자 확인
    if file.UserID == userID {
        return true, nil
    }

    // 3. 직접 파일 공유 확인
    var fileShareCount int64
    if err := r.db.WithContext(ctx).
        Table("file_shares").
        Where("file_id = ? AND shared_with_user_id = ?", fileID, userID).
        Count(&fileShareCount).Error; err != nil {
        return false, err
    }

    if fileShareCount > 0 {
        return true, nil
    }

    // 4. 부모 폴더 공유 확인
    if file.FolderID != nil {
        var folderShareCount int64
        if err := r.db.WithContext(ctx).
            Table("folder_shares").
            Where("folder_id = ? AND shared_with_user_id = ?", *file.FolderID, userID).
            Count(&folderShareCount).Error; err != nil {
            return false, err
        }

        if folderShareCount > 0 {
            return true, nil
        }
    }

    // 5. 권한 없음
    return false, nil
}
```

### 방법 2: UseCase에서 직접 권한 확인

**위치**: `joker_backend/services/cloudRepositoryService/features/cloudRepository/usecase/downloadCloudUseCase.go`

```go
func (uc *DownloadCloudUseCase) RequestDownloadURL(ctx context.Context, fileID uint, userID uint) (*model.FileDownloadResponse, error) {
    // 파일 정보 조회
    file, err := uc.fileRepo.GetFileByID(ctx, fileID)
    if err != nil {
        return nil, fmt.Errorf("file not found")
    }

    // 권한 확인
    hasAccess, err := uc.fileRepo.HasFileAccess(ctx, fileID, userID)
    if err != nil {
        return nil, err
    }

    if !hasAccess {
        return nil, fmt.Errorf("unauthorized access to file")
    }

    // S3 presigned URL 생성
    presignedURL, err := uc.s3Service.GeneratePresignedURL(ctx, file.S3Key, file.FileName)
    if err != nil {
        return nil, fmt.Errorf("failed to generate download URL: %w", err)
    }

    return &model.FileDownloadResponse{
        URL:      presignedURL,
        FileName: file.FileName,
        FileSize: file.FileSize,
    }, nil
}
```

---

## 테이블 스키마 참고

### file_shares 테이블
```sql
CREATE TABLE file_shares (
    id SERIAL PRIMARY KEY,
    file_id INTEGER NOT NULL REFERENCES files(id),
    shared_by_user_id INTEGER NOT NULL REFERENCES users(id),
    shared_with_user_id INTEGER NOT NULL REFERENCES users(id),
    permission VARCHAR(20) NOT NULL, -- 'read' or 'write'
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(file_id, shared_with_user_id)
);
```

### folder_shares 테이블
```sql
CREATE TABLE folder_shares (
    id SERIAL PRIMARY KEY,
    folder_id INTEGER NOT NULL REFERENCES folders(id),
    shared_by_user_id INTEGER NOT NULL REFERENCES users(id),
    shared_with_user_id INTEGER NOT NULL REFERENCES users(id),
    permission VARCHAR(20) NOT NULL, -- 'read' or 'write'
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(folder_id, shared_with_user_id)
);
```

### files 테이블
```sql
CREATE TABLE files (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    folder_id INTEGER REFERENCES folders(id), -- NULL이면 루트 폴더
    file_name VARCHAR(255) NOT NULL,
    s3_key VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

## 테스트 시나리오

### 시나리오 1: 파일 소유자 다운로드
```
User A가 자신의 파일을 다운로드
→ file.UserID == userID
→ 다운로드 성공 ✅
```

### 시나리오 2: 직접 파일 공유받은 경우
```
User A가 파일을 User B에게 공유
→ file_shares 테이블에 레코드 존재
→ User B가 다운로드 성공 ✅
```

### 시나리오 3: 폴더 공유받은 경우 (현재 실패하는 케이스)
```
User A가 폴더를 User B에게 공유
→ folder_shares 테이블에 레코드 존재
→ User B가 폴더 내 파일 다운로드 시도
→ 현재: "unauthorized access to file" ❌
→ 수정 후: 다운로드 성공 ✅
```

### 시나리오 4: 권한 없는 사용자
```
User C가 User A의 파일을 다운로드 시도
→ 소유자 아님
→ file_shares에 레코드 없음
→ folder_shares에 레코드 없음
→ "unauthorized access to file" ❌ (정상)
```

---

## 프론트엔드 영향

### 현재 구현된 프론트엔드 코드
**파일**: `src/pages/SharedFolderView.jsx`

```javascript
const handleDownload = async (file) => {
  try {
    await fileApi.downloadFile(file.id, file.file_name);
  } catch (err) {
    console.error('[SharedFolderView] Download failed:', err);
    alert('다운로드에 실패했습니다.');
  }
};
```

**파일**: `src/api/fileApi.js`

```javascript
downloadFile: async (fileId, fileName) => {
  const response = await api.get(`/files/${fileId}/download`);
  const downloadUrl = response.data.url;

  // Presigned URL로 다운로드
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = fileName;
  link.click();
}
```

### 백엔드 수정 후 동작
1. 프론트엔드 코드 수정 불필요
2. `GET /api/v1/files/:id/download` API가 공유 권한을 확인하도록 수정되면 자동으로 동작
3. 기존 에러 처리 로직으로 사용자에게 피드백 제공

---

## 우선순위

**🔴 HIGH**: 공유 폴더의 핵심 기능이 동작하지 않는 critical 이슈

---

## 체크리스트

### 백엔드 개발자
- [ ] `FileRepository`에 `HasFileAccess` 메서드 추가
- [ ] `HasFileAccess` 구현 (소유권, 직접 공유, 폴더 공유 체크)
- [ ] `DownloadCloudUseCase`에서 `HasFileAccess` 사용하도록 수정
- [ ] 4가지 테스트 시나리오로 검증
- [ ] 기존 파일 다운로드 기능이 깨지지 않았는지 확인

### 프론트엔드
- [x] SharedFolderView 페이지 구현
- [x] 라우팅 설정
- [x] SharedWithMe에서 네비게이션 연동
- [x] 5열 그리드 레이아웃 적용 (SharedFolderView, SharedWithMe)
- [ ] 백엔드 수정 후 통합 테스트
- [ ] 다운로드 실패 시 에러 메시지 확인

### QA
- [ ] 시나리오 1: 파일 소유자 다운로드
- [ ] 시나리오 2: 직접 파일 공유받은 경우
- [ ] 시나리오 3: 폴더 공유받은 경우
- [ ] 시나리오 4: 권한 없는 사용자 차단

---

## 참고 문서

- `joker_backend/claudedocs/mime_type_validation_update.md` - 백엔드 MIME 타입 검증
- `src/pages/SharedFolderView.jsx` - 공유 폴더 뷰 구현
- `src/pages/SharedWithMe.jsx` - 공유 관리 페이지

---

**작성자**: Claude Code
**검토 필요**: Backend Team
**최종 업데이트**: 2025-12-11
