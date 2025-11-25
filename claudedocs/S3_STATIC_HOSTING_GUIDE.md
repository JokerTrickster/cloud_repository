# S3 정적 웹 호스팅 가이드 (CloudRepository)

## 📋 목차
1. [사전 준비](#사전-준비)
2. [빌드 설정](#빌드-설정)
3. [S3 버킷 설정](#s3-버킷-설정)
4. [CloudFront 설정](#cloudfront-설정)
5. [배포 스크립트](#배포-스크립트)
6. [CI/CD 자동화](#cicd-자동화)

---

## 🔧 사전 준비

### 필요한 도구
- AWS CLI 설치
- AWS 계정 및 권한
- 도메인 (선택사항)

```bash
# AWS CLI 설치
brew install awscli  # macOS
# 또는
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /

# AWS 설정
aws configure
# AWS Access Key ID: YOUR_KEY
# AWS Secret Access Key: YOUR_SECRET
# Default region: ap-northeast-2 (서울)
# Default output format: json
```

---

## 🏗️ 빌드 설정

### 1. 환경 변수 설정

**`.env.production`** 생성:
```env
# 프로덕션 API 엔드포인트
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_AUTH_API_URL=https://auth.yourdomain.com
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

### 2. vite.config.js 수정

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Cloud Storage PWA',
        short_name: 'CloudBox',
        description: 'Secure Cloud Storage PWA',
        theme_color: '#ffffff',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          utils: ['date-fns', 'axios']
        }
      }
    }
  }
})
```

### 3. 빌드 실행

```bash
# 프로덕션 빌드
npm run build

# 빌드 결과 확인
ls -la dist/
# index.html
# assets/
# favicon.ico
# ...
```

---

## 🪣 S3 버킷 설정

### 1. S3 버킷 생성

```bash
# 버킷 생성 (버킷 이름은 전 세계적으로 유일해야 함)
aws s3api create-bucket \
  --bucket cloudbox-app \
  --region ap-northeast-2 \
  --create-bucket-configuration LocationConstraint=ap-northeast-2
```

### 2. 정적 웹 호스팅 활성화

**`s3-website-config.json`**:
```json
{
  "IndexDocument": {
    "Suffix": "index.html"
  },
  "ErrorDocument": {
    "Key": "index.html"
  },
  "RoutingRules": [
    {
      "Condition": {
        "HttpErrorCodeReturnedEquals": "404"
      },
      "Redirect": {
        "ReplaceKeyWith": "index.html"
      }
    }
  ]
}
```

```bash
# 웹 호스팅 설정
aws s3api put-bucket-website \
  --bucket cloudbox-app \
  --website-configuration file://s3-website-config.json
```

### 3. 버킷 정책 설정

**`bucket-policy.json`**:
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

```bash
# 버킷 정책 적용
aws s3api put-bucket-policy \
  --bucket cloudbox-app \
  --policy file://bucket-policy.json
```

### 4. CORS 설정

**`cors-config.json`**:
```json
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedOrigins": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

```bash
aws s3api put-bucket-cors \
  --bucket cloudbox-app \
  --cors-configuration file://cors-config.json
```

---

## ☁️ CloudFront 설정 (권장)

### 1. CloudFront 배포 생성

**`cloudfront-config.json`**:
```json
{
  "CallerReference": "cloudbox-app-001",
  "Comment": "CloudBox App Distribution",
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-cloudbox-app",
        "DomainName": "cloudbox-app.s3-website.ap-northeast-2.amazonaws.com",
        "CustomOriginConfig": {
          "HTTPPort": 80,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "http-only"
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-cloudbox-app",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"]
    },
    "Compress": true,
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": { "Forward": "none" }
    },
    "TrustedSigners": {
      "Enabled": false,
      "Quantity": 0
    },
    "MinTTL": 0,
    "DefaultTTL": 86400,
    "MaxTTL": 31536000
  },
  "CustomErrorResponses": {
    "Quantity": 1,
    "Items": [
      {
        "ErrorCode": 404,
        "ResponseCode": 200,
        "ResponsePagePath": "/index.html",
        "ErrorCachingMinTTL": 300
      }
    ]
  },
  "Enabled": true
}
```

```bash
# CloudFront 배포 생성
aws cloudfront create-distribution \
  --distribution-config file://cloudfront-config.json
```

### 2. 캐시 정책 설정

```bash
# index.html은 캐시하지 않음 (항상 최신 버전)
aws s3 cp dist/index.html s3://cloudbox-app/ \
  --metadata-directive REPLACE \
  --cache-control "no-cache, no-store, must-revalidate"

# 정적 자산은 장기 캐시
aws s3 cp dist/assets/ s3://cloudbox-app/assets/ \
  --recursive \
  --cache-control "public, max-age=31536000, immutable"
```

---

## 🚀 배포 스크립트

### `deploy.sh` 생성:

```bash
#!/bin/bash

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BUCKET_NAME="cloudbox-app"
DISTRIBUTION_ID="YOUR_CLOUDFRONT_DISTRIBUTION_ID"
BUILD_DIR="dist"

echo -e "${YELLOW}🚀 CloudBox 배포 시작...${NC}"

# 1. 빌드
echo -e "${GREEN}📦 프로덕션 빌드 생성...${NC}"
npm run build

if [ ! -d "$BUILD_DIR" ]; then
    echo -e "${RED}❌ 빌드 디렉토리가 없습니다!${NC}"
    exit 1
fi

# 2. S3 동기화
echo -e "${GREEN}☁️  S3에 업로드 중...${NC}"

# 기존 파일 삭제 (선택사항)
# aws s3 rm s3://$BUCKET_NAME --recursive

# index.html 업로드 (캐시 없음)
aws s3 cp $BUILD_DIR/index.html s3://$BUCKET_NAME/ \
  --cache-control "no-cache, no-store, must-revalidate" \
  --content-type "text/html"

# 정적 자산 업로드 (장기 캐시)
aws s3 sync $BUILD_DIR/assets s3://$BUCKET_NAME/assets \
  --cache-control "public, max-age=31536000, immutable" \
  --delete

# 나머지 파일 업로드
aws s3 sync $BUILD_DIR s3://$BUCKET_NAME \
  --exclude "index.html" \
  --exclude "assets/*" \
  --cache-control "public, max-age=3600" \
  --delete

# 3. CloudFront 캐시 무효화
if [ ! -z "$DISTRIBUTION_ID" ]; then
    echo -e "${GREEN}🔄 CloudFront 캐시 무효화...${NC}"
    aws cloudfront create-invalidation \
      --distribution-id $DISTRIBUTION_ID \
      --paths "/*"
fi

echo -e "${GREEN}✅ 배포 완료!${NC}"
echo -e "웹사이트: https://cloudbox-app.s3-website.ap-northeast-2.amazonaws.com"
```

```bash
# 실행 권한 부여
chmod +x deploy.sh

# 배포 실행
./deploy.sh
```

---

## 🔄 CI/CD 자동화 (GitHub Actions)

### `.github/workflows/deploy.yml`:

```yaml
name: Deploy to S3

on:
  push:
    branches: [ main ]

env:
  AWS_REGION: ap-northeast-2
  S3_BUCKET: cloudbox-app
  CLOUDFRONT_DISTRIBUTION_ID: ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }}

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout code
      uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Build application
      run: npm run build
      env:
        VITE_API_BASE_URL: ${{ secrets.VITE_API_BASE_URL }}
        VITE_GOOGLE_CLIENT_ID: ${{ secrets.VITE_GOOGLE_CLIENT_ID }}

    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v2
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: ${{ env.AWS_REGION }}

    - name: Deploy to S3
      run: |
        aws s3 cp dist/index.html s3://${{ env.S3_BUCKET }}/ \
          --cache-control "no-cache, no-store, must-revalidate"

        aws s3 sync dist/assets s3://${{ env.S3_BUCKET }}/assets \
          --cache-control "public, max-age=31536000, immutable" \
          --delete

        aws s3 sync dist s3://${{ env.S3_BUCKET }} \
          --exclude "index.html" \
          --exclude "assets/*" \
          --cache-control "public, max-age=3600" \
          --delete

    - name: Invalidate CloudFront
      if: env.CLOUDFRONT_DISTRIBUTION_ID != ''
      run: |
        aws cloudfront create-invalidation \
          --distribution-id ${{ env.CLOUDFRONT_DISTRIBUTION_ID }} \
          --paths "/*"
```

### GitHub Secrets 설정:
```
Settings → Secrets → New repository secret

필수:
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- VITE_API_BASE_URL
- VITE_GOOGLE_CLIENT_ID

선택:
- CLOUDFRONT_DISTRIBUTION_ID
```

---

## 🌐 도메인 연결 (선택사항)

### Route 53 설정:

```bash
# A 레코드 생성 (CloudFront)
aws route53 change-resource-record-sets \
  --hosted-zone-id YOUR_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "app.yourdomain.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z2FDTNDATAQYW2",
          "DNSName": "d1234567890.cloudfront.net",
          "EvaluateTargetHealth": false
        }
      }
    }]
  }'
```

---

## ⚠️ 중요 고려사항

### 1. API 엔드포인트 변경

**`src/api/client.js`** 수정:
```javascript
const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://api.yourdomain.com',
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### 2. React Router 처리

S3는 클라이언트 라우팅을 이해하지 못하므로, 모든 404를 index.html로 리다이렉트:
- S3: ErrorDocument → index.html
- CloudFront: Custom Error Response 설정

### 3. 환경별 설정

```javascript
// src/config/environment.js
const config = {
  development: {
    API_URL: 'http://localhost:18080',
    AUTH_URL: 'http://localhost:18081'
  },
  production: {
    API_URL: import.meta.env.VITE_API_BASE_URL,
    AUTH_URL: import.meta.env.VITE_AUTH_API_URL
  }
};

export default config[import.meta.env.MODE];
```

### 4. PWA 설정

Service Worker가 HTTPS에서만 작동하므로 CloudFront 사용 권장

### 5. 보안 헤더 추가 (Lambda@Edge)

```javascript
exports.handler = async (event) => {
  const response = event.Records[0].cf.response;
  const headers = response.headers;

  headers['strict-transport-security'] = [{
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubdomains; preload'
  }];

  headers['content-security-policy'] = [{
    key: 'Content-Security-Policy',
    value: "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline';"
  }];

  headers['x-content-type-options'] = [{
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  }];

  headers['x-frame-options'] = [{
    key: 'X-Frame-Options',
    value: 'DENY'
  }];

  return response;
};
```

---

## 📊 비용 예상

### S3 비용 (서울 리전)
- 저장: $0.025/GB/월
- 요청: GET $0.0004/1000건
- 데이터 전송: $0.126/GB (인터넷으로)

### CloudFront 비용
- 데이터 전송: $0.085/GB (한국)
- HTTP 요청: $0.0075/10,000건

### 월 예상 비용 (소규모)
- S3: ~$1
- CloudFront: ~$5-10
- **합계**: $6-11/월

---

## 🧪 테스트

### 로컬 프리뷰:
```bash
npm run build
npm run preview
# http://localhost:4173
```

### S3 웹사이트 URL:
```
http://cloudbox-app.s3-website.ap-northeast-2.amazonaws.com
```

### CloudFront URL:
```
https://d1234567890.cloudfront.net
```

---

## 🔧 트러블슈팅

### 1. 403 Forbidden
```bash
# 버킷 정책 확인
aws s3api get-bucket-policy --bucket cloudbox-app

# 파일 권한 확인
aws s3api get-object-acl --bucket cloudbox-app --key index.html
```

### 2. 라우팅 문제
- ErrorDocument가 index.html로 설정되었는지 확인
- CloudFront Custom Error Response 확인

### 3. 캐시 문제
```bash
# CloudFront 캐시 무효화
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

### 4. CORS 에러
- S3 CORS 정책 확인
- API 서버 CORS 헤더 확인

---

## ✅ 체크리스트

### 배포 전
- [ ] 프로덕션 환경 변수 설정
- [ ] 빌드 테스트
- [ ] API 엔드포인트 확인
- [ ] Google OAuth 리디렉션 URL 업데이트

### S3 설정
- [ ] 버킷 생성
- [ ] 정적 웹 호스팅 활성화
- [ ] 버킷 정책 설정
- [ ] CORS 설정

### CloudFront 설정
- [ ] 배포 생성
- [ ] Custom Error Response
- [ ] 캐시 정책
- [ ] 보안 헤더 (Lambda@Edge)

### 배포 후
- [ ] 웹사이트 접속 테스트
- [ ] 라우팅 테스트
- [ ] API 연동 테스트
- [ ] PWA 설치 테스트

---

**마지막 업데이트**: 2025-11-25
**작성자**: Claude Code