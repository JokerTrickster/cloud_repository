# 🧪 로컬 테스트 가이드

## ✅ 서버 상태

### 프론트엔드 서버
- **URL**: http://localhost:5173
- **상태**: ✅ 실행 중

### 백엔드 서버
- **파일 API**: http://localhost:18080
- **인증 API**: http://localhost:18081 (또는 원격: 13.203.37.93:18081)

---

## 📋 테스트 시나리오

### 1️⃣ Google OAuth 로그인 테스트

1. **브라우저 열기**: http://localhost:5173
2. **로그인 페이지**에서 Google 로그인 버튼 클릭
3. **예상 결과**:
   - ⚠️ Google Client ID 설정 필요
   - ⚠️ Google Cloud Console에서 `http://localhost:5173` 승인 필요

**문제 해결**:
```bash
# .env.development 설정 확인
VITE_GOOGLE_CLIENT_ID=your-client-id
```

---

### 2️⃣ 파일 업로드 테스트

#### 사전 준비 (Mock 토큰 사용)
```javascript
// 브라우저 콘솔에서 실행 (F12 → Console)
localStorage.setItem('access_token', 'test-token-12345');
localStorage.setItem('refresh_token', 'refresh-token-12345');
```

#### 테스트 단계
1. **Gallery 페이지 접속**: http://localhost:5173/gallery
2. **업로드 버튼** 클릭
3. **파일 선택** 또는 드래그 앤 드롭
4. **업로드** 버튼 클릭

#### 예상 결과
- ✅ 파일이 S3로 업로드
- ✅ 파일 목록에 표시
- ❌ 실패 시: 백엔드 API 서버 확인

---

### 3️⃣ 파일 목록 조회 테스트

```javascript
// 브라우저 콘솔에서 API 직접 테스트
fetch('http://localhost:18080/api/v1/files', {
  headers: {
    'Authorization': 'Bearer test-token-12345'
  }
})
.then(res => res.json())
.then(data => console.log(data));
```

#### 예상 응답
```json
{
  "files": [
    {
      "id": 1,
      "file_name": "photo.jpg",
      "file_type": "image",
      "created_at": "2025-01-15T10:30:00Z"
    }
  ],
  "total_count": 10,
  "page": 1,
  "page_size": 20
}
```

---

### 4️⃣ 파일 다운로드 테스트

1. **Gallery 페이지**에서 "선택" 버튼 클릭
2. **파일 선택** (체크박스)
3. **다운로드 아이콘** 클릭

---

### 5️⃣ 파일 삭제 테스트

1. **Gallery 페이지**에서 "선택" 버튼 클릭
2. **파일 선택** (체크박스)
3. **휴지통 아이콘** 클릭
4. **확인** 다이얼로그에서 "확인"

---

## 🛠️ 디버깅 도구

### 브라우저 개발자 도구 (F12)

#### Network 탭
```
- API 요청 확인
- 응답 상태 코드 확인
- 요청/응답 헤더 확인
```

#### Console 탭
```javascript
// 현재 토큰 확인
console.log(localStorage.getItem('access_token'));

// API 테스트
const testApi = async () => {
  const response = await fetch('/api/v1/files', {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`
    }
  });
  const data = await response.json();
  console.log('Files:', data);
};
testApi();
```

---

## 🔧 일반적인 문제 해결

### 1. CORS 에러
```
Access to fetch at 'http://localhost:18080' from origin 'http://localhost:5173' has been blocked by CORS
```
**해결**: 백엔드에서 CORS 헤더 추가 필요

### 2. 404 Not Found
```
POST http://localhost:18080/api/v1/files/upload 404
```
**해결**:
- 백엔드 API 서버 실행 확인
- API 경로 확인

### 3. 401 Unauthorized
```
{
  "error": "Invalid token"
}
```
**해결**:
- 올바른 토큰 설정
- 토큰 만료 확인

### 4. 500 Internal Server Error
```
{
  "error": "Internal server error"
}
```
**해결**:
- 백엔드 서버 로그 확인
- 데이터베이스 연결 확인
- S3 권한 확인

---

## 📝 테스트 체크리스트

### 기본 기능
- [ ] 로그인 페이지 표시
- [ ] Google OAuth 버튼 동작
- [ ] Gallery 페이지 접근

### 파일 관리
- [ ] 파일 업로드 모달 열기
- [ ] 드래그 앤 드롭 동작
- [ ] 파일 선택 동작
- [ ] 업로드 진행률 표시
- [ ] 파일 목록 표시
- [ ] 날짜별 그룹핑
- [ ] 파일 다운로드
- [ ] 파일 삭제

### 필터 & 검색
- [ ] 이미지/동영상 필터
- [ ] 날짜 범위 필터
- [ ] 정렬 (최신순/오래된순/이름순/크기순)
- [ ] 태그 검색

### 반응형 디자인
- [ ] 모바일 뷰 (< 768px)
- [ ] 태블릿 뷰 (768px - 1024px)
- [ ] 데스크톱 뷰 (> 1024px)

---

## 🚀 빠른 테스트 명령어

```bash
# 1. 프론트엔드만 테스트 (Mock 데이터)
npm run dev
# http://localhost:5173 접속

# 2. API 연동 테스트
# 백엔드 서버 실행 후
npm run dev
# 토큰 설정 후 테스트

# 3. 프로덕션 빌드 테스트
npm run build
npm run preview
# http://localhost:4173 접속

# 4. E2E 테스트
npm run test:e2e
```

---

## 📊 현재 설정 상태

| 항목 | 상태 | 비고 |
|------|------|------|
| Vite Dev Server | ✅ | http://localhost:5173 |
| 파일 API 프록시 | ✅ | /api/v1 → localhost:18080 |
| 인증 API 프록시 | ✅ | /v0.1 → 13.203.37.93:18081 |
| Google OAuth | ⚠️ | Client ID 설정 필요 |
| S3 업로드 | ❓ | 백엔드 의존 |
| 토큰 인증 | ❓ | 백엔드 의존 |

---

## 💡 팁

1. **시크릿 모드 사용**: 캐시 문제 방지
2. **네트워크 스로틀링**: 느린 네트워크 테스트 (F12 → Network → Slow 3G)
3. **모바일 뷰 테스트**: F12 → Device Toggle
4. **콘솔 로그 활용**: 디버깅 정보 확인

---

**작성일**: 2025-11-25