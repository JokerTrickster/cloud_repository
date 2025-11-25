# 🚀 GitHub Actions S3 자동 배포 설정 가이드

## 📌 필요한 정보 체크리스트

### 1️⃣ AWS 관련 (필수)
- [ ] **AWS Access Key ID** - IAM 사용자의 액세스 키
- [ ] **AWS Secret Access Key** - IAM 사용자의 시크릿 키
- [ ] **S3 Bucket Name** - 웹호스팅할 S3 버킷 이름 (예: cloudbox-app)
- [ ] **AWS Region** - S3 버킷 리전 (기본: ap-south-1)

### 2️⃣ CloudFront 관련 (선택)
- [ ] **CloudFront Distribution ID** - CDN 사용 시 필요

### 3️⃣ 애플리케이션 환경 변수 (필수)
- [ ] **VITE_API_BASE_URL** - 프로덕션 API 서버 URL
- [ ] **VITE_AUTH_API_URL** - 인증 API 서버 URL
- [ ] **VITE_GOOGLE_CLIENT_ID** - Google OAuth Client ID

---

## 🔐 GitHub Secrets 설정 방법

### Step 1: GitHub 저장소로 이동
1. https://github.com/JokerTrickster/cloud_repository 접속
2. **Settings** 탭 클릭
3. 좌측 메뉴에서 **Secrets and variables** → **Actions** 클릭

### Step 2: Secret 추가
"**New repository secret**" 버튼 클릭하여 아래 항목들 추가:

| Secret 이름 | 예시 값 | 설명 |
|------------|---------|------|
| `AWS_ACCESS_KEY_ID` | AKIAIOSFODNN7EXAMPLE | IAM 사용자 Access Key |
| `AWS_SECRET_ACCESS_KEY` | wJalrXUtnFEMI/K7MDENG/... | IAM 사용자 Secret Key |
| `S3_BUCKET_NAME` | cloudbox-app | S3 버킷 이름 |
| `VITE_API_BASE_URL` | https://api.yourdomain.com | 프로덕션 파일 API URL |
| `VITE_AUTH_API_URL` | https://auth.yourdomain.com | 프로덕션 인증 API URL |
| `VITE_GOOGLE_CLIENT_ID` | 258592695444-xxx.apps.googleusercontent.com | Google OAuth Client ID |
| `CLOUDFRONT_DISTRIBUTION_ID` | E1234567890ABC | (선택) CloudFront ID |

---

## 🔑 AWS IAM 권한 설정

### 최소 필요 권한 정책

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::cloudbox-app",
        "arn:aws:s3:::cloudbox-app/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:HeadBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": "arn:aws:s3:::cloudbox-app"
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateInvalidation",
        "cloudfront:GetDistribution"
      ],
      "Resource": "*"
    }
  ]
}
```

### IAM 사용자 생성 방법

1. AWS Console → IAM → Users → Add user
2. User name: `github-actions-deploy`
3. Access type: **Programmatic access** ✅
4. Attach policy: 위의 JSON 정책 생성하여 연결
5. Access Key와 Secret Key 저장 → GitHub Secrets에 추가

---

## 🪣 S3 버킷 설정

### 버킷 생성 (아직 없는 경우)
```bash
aws s3api create-bucket \
  --bucket cloudbox-app \
  --region ap-south-1 \
  --create-bucket-configuration LocationConstraint=ap-south-1
```

### 정적 웹 호스팅 활성화
```bash
aws s3 website s3://cloudbox-app/ \
  --index-document index.html \
  --error-document index.html
```

### 버킷 정책 설정
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::cloudbox-app/*"
    }
  ]
}
```

---

## ⚡ 워크플로우 동작 방식

### 자동 실행 트리거
```yaml
on:
  push:
    branches: [ main ]  # main 브랜치 푸시 시
```

### 실행 순서
1. **코드 체크아웃** → 최신 코드 가져오기
2. **Node.js 설정** → Node 18 버전 설치
3. **의존성 설치** → npm ci 실행
4. **환경 변수 설정** → .env.production 생성
5. **빌드** → npm run build
6. **AWS 인증** → AWS 자격 증명 설정
7. **S3 업로드** → 빌드 파일 업로드
8. **CloudFront 무효화** → CDN 캐시 초기화 (선택)

---

## 🧪 테스트 방법

### 1. 로컬에서 워크플로우 테스트
```bash
# GitHub CLI 설치 (Mac)
brew install gh

# 워크플로우 실행
gh workflow run deploy-to-s3.yml
```

### 2. 수동 트리거 추가 (테스트용)
```yaml
on:
  push:
    branches: [ main ]
  workflow_dispatch:  # 수동 실행 활성화
```

### 3. 브랜치별 배포 환경 분리
```yaml
on:
  push:
    branches:
      - main        # 프로덕션
      - develop     # 개발
      - staging     # 스테이징
```

---

## 📊 배포 상태 확인

### GitHub에서 확인
1. Repository → **Actions** 탭
2. 실행 중인 워크플로우 확인
3. 각 단계별 로그 확인 가능

### 배포 뱃지 추가 (README.md)
```markdown
![Deploy Status](https://github.com/JokerTrickster/cloud_repository/actions/workflows/deploy-to-s3.yml/badge.svg)
```

---

## 🚨 트러블슈팅

### 1. "Access Denied" 에러
```
Error: Access Denied
```
**해결**: IAM 권한 확인, S3 버킷 정책 확인

### 2. "Bucket does not exist"
```
Error: The specified bucket does not exist
```
**해결**: S3_BUCKET_NAME Secret 값 확인

### 3. "Invalid credentials"
```
Error: The security token included in the request is invalid
```
**해결**: AWS Access Key/Secret Key 확인

### 4. Build 실패
```
Error: Build directory not found
```
**해결**: package.json의 build 스크립트 확인

---

## 🔒 보안 주의사항

### ❌ 절대 하지 말아야 할 것
- Access Key를 코드에 하드코딩
- .env.production을 git에 커밋
- Secret 값을 로그에 출력

### ✅ 권장 사항
- IAM 사용자는 최소 권한만 부여
- Access Key 주기적 교체 (90일마다)
- OIDC 사용 검토 (더 안전함)
- 브랜치 보호 규칙 설정

---

## 📈 성능 최적화

### 빌드 캐싱
```yaml
- uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
```

### 병렬 업로드
```bash
# 여러 파일 타입을 병렬로 업로드
aws s3 sync dist s3://$BUCKET --exclude "*" --include "*.html" &
aws s3 sync dist s3://$BUCKET --exclude "*" --include "*.js" &
aws s3 sync dist s3://$BUCKET --exclude "*" --include "*.css" &
wait
```

---

## ✅ 최종 체크리스트

### 배포 전
- [ ] GitHub Secrets 모두 설정됨
- [ ] S3 버킷 생성 및 웹호스팅 활성화
- [ ] IAM 권한 설정 완료
- [ ] 로컬 빌드 테스트 성공

### 첫 배포
- [ ] main 브랜치에 push
- [ ] Actions 탭에서 실행 확인
- [ ] S3 웹사이트 URL 접속 테스트
- [ ] CloudFront URL 접속 테스트 (있는 경우)

### 배포 후
- [ ] 웹사이트 정상 동작 확인
- [ ] API 연동 확인
- [ ] 콘솔 에러 없음
- [ ] 모바일 반응형 확인

---

## 📞 문의

문제 발생 시:
1. Actions 탭의 로그 확인
2. AWS CloudWatch 로그 확인
3. GitHub Issues에 문의

---

**마지막 업데이트**: 2025-11-25
**작성자**: Claude Code