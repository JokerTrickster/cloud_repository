# 📱 파일 포맷 지원 개선 - 아이폰 호환성 완벽 지원

## 🎯 개요

화이트리스트 방식에서 프리픽스 기반 검증으로 전환하여 모든 이미지/비디오 MIME 타입을 자동으로 지원합니다.

**업데이트 날짜**: 2025-12-11
**영향 범위**: Frontend (fileApi.js, FileUpload.jsx)
**관련 백엔드 문서**: `joker_backend/claudedocs/mime_type_validation_update.md`

---

## 🔄 변경 사항

### Before (기존 방식)
```javascript
ALLOWED_TYPES: {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  video: ['video/mp4', 'video/webm', 'video/x-msvideo', 'video/quicktime'],
}

isValidType(file) {
  const allAllowedTypes = [
    ...this.ALLOWED_TYPES.image,
    ...this.ALLOWED_TYPES.video,
  ];
  return allAllowedTypes.includes(file.type);
}
```

**문제점**:
- ❌ 아이폰 HEIC 이미지 업로드 실패
- ❌ 일부 MOV 파일 거부 (잘못된 MIME 타입 매핑)
- ❌ 새로운 포맷 지원 시 코드 수정 필요
- ❌ MIME 타입 목록 유지보수 부담

### After (새로운 방식)
```javascript
/**
 * 파일 타입 검증 - 모든 이미지와 비디오 파일 허용
 * 아이폰 포맷 포함: HEIC/HEIF (이미지), MOV/M4V (비디오)
 */
isValidType(file) {
  // 모든 이미지와 비디오 MIME 타입 허용
  return file.type.startsWith('image/') || file.type.startsWith('video/');
}

validate(file) {
  if (!this.isValidType(file)) {
    return {
      valid: false,
      error: `이미지 또는 동영상 파일만 업로드할 수 있습니다. (현재: ${file.type || '알 수 없는 형식'})`,
    };
  }
  // ...
}
```

**장점**:
- ✅ 모든 `image/*` MIME 타입 자동 지원
- ✅ 모든 `video/*` MIME 타입 자동 지원
- ✅ 화이트리스트 관리 불필요
- ✅ 아이폰 포맷 완벽 지원
- ✅ 미래 포맷 자동 대응

---

## 📸 지원되는 아이폰 포맷

### 이미지
| 포맷 | MIME Type | 설명 |
|------|-----------|------|
| HEIC | `image/heic` | 아이폰 11 이상 기본 포맷 (고효율) |
| HEIF | `image/heif` | 고효율 이미지 포맷 |
| HEIC-sequence | `image/heic-sequence` | Live Photo 등 |
| HEIF-sequence | `image/heif-sequence` | 시퀀스 이미지 |
| JPEG | `image/jpeg` | 기존 지원 |
| PNG | `image/png` | 기존 지원 |
| GIF | `image/gif` | 기존 지원 |
| WebP | `image/webp` | 기존 지원 |

### 비디오
| 포맷 | MIME Type | 설명 |
|------|-----------|------|
| MOV | `video/quicktime` | 아이폰 기본 비디오 포맷 |
| M4V | `video/x-m4v` | Apple 비디오 포맷 |
| MP4 | `video/mp4` | 기존 지원 |
| WebM | `video/webm` | 기존 지원 |
| AVI | `video/x-msvideo` | 기존 지원 |

---

## 🔧 수정된 파일

### 1. `src/api/fileApi.js`
**위치**: Line 640-706

**변경 내용**:
- 화이트리스트 제거
- `isValidType()` 함수를 프리픽스 검증으로 변경
- 에러 메시지 개선

**코드**:
```javascript
export const fileValidation = {
  MAX_FILE_SIZE: Infinity,

  isValidType(file) {
    return file.type.startsWith('image/') || file.type.startsWith('video/');
  },

  validate(file) {
    if (!this.isValidType(file)) {
      return {
        valid: false,
        error: `이미지 또는 동영상 파일만 업로드할 수 있습니다. (현재: ${file.type || '알 수 없는 형식'})`,
      };
    }
    // ...
  },
  // ...
};
```

### 2. `src/components/FileUpload.jsx`
**위치**: Line 247-253

**변경 내용**:
- UI 텍스트를 업데이트하여 모든 포맷 지원을 명시
- 아이폰 호환성 강조

**Before**:
```jsx
<p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
  이미지: JPG, PNG, GIF, WebP<br />
  동영상: MP4, WebM, AVI, MOV<br />
  대용량 파일 지원 (5GB 이상 자동 멀티파트 업로드)<br />
  최대 30개까지 선택 가능
</p>
```

**After**:
```jsx
<p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
  📸 모든 이미지 포맷 지원 (JPG, PNG, GIF, WebP, HEIC 등)<br />
  🎬 모든 동영상 포맷 지원 (MP4, MOV, WebM, AVI 등)<br />
  💾 대용량 파일 지원 (5GB 이상 자동 멀티파트 업로드)<br />
  📱 아이폰 사진/영상 변환 없이 바로 업로드 가능<br />
  최대 30개까지 선택 가능
</p>
```

---

## 🧪 테스트 시나리오

### 1. 아이폰 HEIC 이미지 업로드
```javascript
// 테스트 파일: iPhone에서 찍은 HEIC 사진
const heicFile = new File([blob], 'IMG_0001.HEIC', { type: 'image/heic' });
const result = fileValidation.validate(heicFile);
// Expected: { valid: true }
```

### 2. 아이폰 MOV 비디오 업로드
```javascript
// 테스트 파일: iPhone에서 촬영한 MOV 비디오
const movFile = new File([blob], 'IMG_6053.MOV', { type: 'video/quicktime' });
const result = fileValidation.validate(movFile);
// Expected: { valid: true }
```

### 3. 잘못된 파일 타입 차단
```javascript
// 테스트 파일: PDF 문서
const pdfFile = new File([blob], 'document.pdf', { type: 'application/pdf' });
const result = fileValidation.validate(pdfFile);
// Expected: { valid: false, error: '이미지 또는 동영상 파일만...' }
```

### 4. 배치 업로드 (혼합 포맷)
```javascript
const files = [
  new File([blob1], 'photo.jpg', { type: 'image/jpeg' }),
  new File([blob2], 'photo.heic', { type: 'image/heic' }),
  new File([blob3], 'video.mov', { type: 'video/quicktime' }),
  new File([blob4], 'video.mp4', { type: 'video/mp4' }),
];
const result = fileValidation.validateBatch(files);
// Expected: { valid: true, errors: [] }
```

---

## 🔒 보안 고려사항

### 여전히 차단되는 파일 타입
- ❌ `application/pdf`
- ❌ `application/msword`
- ❌ `text/plain`
- ❌ `application/zip`
- ❌ 기타 모든 non-image, non-video 파일

### MIME 타입 검증의 한계
- ⚠️ **클라이언트 측 검증**: 사용자가 파일 확장자를 조작할 수 있음
- ✅ **백엔드 이중 검증**: 서버에서도 동일한 검증 수행 (uploadCloudUseCase.go)
- ✅ **S3 업로드 시 Content-Type 검증**: 실제 파일 헤더 확인

---

## 📊 영향 분석

### 긍정적 영향
1. **사용자 경험 개선**
   - 아이폰 사용자가 HEIC → JPG 변환 없이 바로 업로드 가능
   - MOV 비디오 업로드 실패 문제 해결
   - 업로드 프로세스 간소화

2. **유지보수 감소**
   - MIME 타입 목록 관리 불필요
   - 새로운 포맷 자동 지원
   - 코드 복잡도 감소

3. **미래 대응성**
   - 새로운 이미지/비디오 표준 자동 지원
   - 다양한 디바이스 호환성

### 부정적 영향
- 없음 (보안은 백엔드에서 이중 검증)

---

## 🔗 관련 문서

### 백엔드
- `joker_backend/claudedocs/mime_type_validation_update.md` - 백엔드 MIME 타입 검증 업데이트
- `joker_backend/services/cloudRepositoryService/README.md` - 지원 포맷 목록

### 프론트엔드
- `src/api/fileApi.js` - 파일 검증 로직
- `src/components/FileUpload.jsx` - 파일 업로드 UI
- `claudedocs/API_INTEGRATION_GUIDE.md` - API 연동 가이드

---

## 💡 FAQ

### Q1: HEIC 파일이 업로드는 되는데 미리보기가 안 돼요
**A**: HEIC는 일부 브라우저에서 미리보기를 지원하지 않습니다. 서버에서 썸네일 생성 시 JPG로 변환하여 제공합니다.

### Q2: 아이폰 Live Photo는 지원하나요?
**A**: Live Photo는 HEIC(이미지) + MOV(비디오) 조합입니다. 두 파일 모두 업로드 가능하지만, 별도 파일로 저장됩니다.

### Q3: 왜 화이트리스트 방식을 버렸나요?
**A**:
- 아이폰 HEIC 같은 새로운 포맷이 계속 등장
- 화이트리스트 유지보수 부담
- 백엔드에서 이중 검증하므로 보안 문제 없음
- 사용자 경험 개선

### Q4: 모든 확장자를 허용하면 보안 문제가 없나요?
**A**:
- ✅ 클라이언트는 UX를 위한 1차 검증
- ✅ 백엔드에서 동일한 MIME 타입 검증 수행
- ✅ S3 업로드 시 Content-Type 헤더 검증
- ✅ 실제 파일 내용은 서버에서 재확인

---

## ✅ 체크리스트

### 개발자
- [x] `fileApi.js` 검증 로직 수정
- [x] `FileUpload.jsx` UI 텍스트 업데이트
- [x] 백엔드와 동일한 검증 방식 적용
- [x] 문서 작성

### 테스터
- [ ] 아이폰 HEIC 사진 업로드 테스트
- [ ] 아이폰 MOV 비디오 업로드 테스트
- [ ] 안드로이드 기기 호환성 테스트
- [ ] PDF/ZIP 등 비허용 파일 차단 확인
- [ ] 배치 업로드 (30개 파일) 테스트
- [ ] 대용량 파일 (5GB+) 멀티파트 업로드 테스트

### 배포
- [ ] 스테이징 환경 배포
- [ ] 프로덕션 배포
- [ ] 사용자 공지 (아이폰 HEIC 지원)
- [ ] 모니터링 (업로드 실패율 확인)

---

## 📈 기대 효과

1. **업로드 실패율 감소**: 아이폰 사용자 업로드 실패 문제 해결
2. **사용자 만족도 증가**: 변환 없이 바로 업로드 가능
3. **유지보수 비용 절감**: MIME 타입 목록 관리 불필요
4. **미래 대응력 강화**: 새로운 포맷 자동 지원

---

**작성자**: Claude Code
**검토자**: Backend Team
**최종 업데이트**: 2025-12-11
