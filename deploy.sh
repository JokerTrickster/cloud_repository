#!/bin/bash

# ============================================
# CloudBox S3 배포 스크립트
# ============================================

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 설정 변수
BUCKET_NAME="cloudbox-app"  # S3 버킷 이름 변경 필요
DISTRIBUTION_ID=""          # CloudFront Distribution ID (선택사항)
BUILD_DIR="dist"
REGION="ap-northeast-2"     # 서울 리전

# 함수: 에러 체크
check_error() {
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ 에러가 발생했습니다!${NC}"
        exit 1
    fi
}

# 함수: AWS CLI 체크
check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}❌ AWS CLI가 설치되어 있지 않습니다!${NC}"
        echo -e "${YELLOW}설치 방법: https://aws.amazon.com/cli/${NC}"
        exit 1
    fi
}

# 함수: AWS 자격 증명 체크
check_aws_credentials() {
    aws sts get-caller-identity &> /dev/null
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ AWS 자격 증명이 설정되어 있지 않습니다!${NC}"
        echo -e "${YELLOW}실행: aws configure${NC}"
        exit 1
    fi
}

# 메인 스크립트
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}🚀 CloudBox S3 배포 시작${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# 1. 사전 체크
echo -e "${YELLOW}📋 사전 체크...${NC}"
check_aws_cli
check_aws_credentials
echo -e "${GREEN}✅ AWS 설정 확인 완료${NC}"
echo ""

# 2. 프로덕션 빌드
echo -e "${YELLOW}📦 프로덕션 빌드 생성...${NC}"
npm run build
check_error

if [ ! -d "$BUILD_DIR" ]; then
    echo -e "${RED}❌ 빌드 디렉토리가 없습니다!${NC}"
    exit 1
fi

# 빌드 크기 확인
BUILD_SIZE=$(du -sh $BUILD_DIR | cut -f1)
echo -e "${GREEN}✅ 빌드 완료 (크기: ${BUILD_SIZE})${NC}"
echo ""

# 3. S3 버킷 확인
echo -e "${YELLOW}🪣 S3 버킷 확인...${NC}"
aws s3api head-bucket --bucket $BUCKET_NAME 2>/dev/null

if [ $? -ne 0 ]; then
    echo -e "${YELLOW}버킷이 없습니다. 생성하시겠습니까? (y/n)${NC}"
    read -r response
    if [ "$response" = "y" ]; then
        aws s3api create-bucket \
            --bucket $BUCKET_NAME \
            --region $REGION \
            --create-bucket-configuration LocationConstraint=$REGION
        check_error

        # 정적 웹 호스팅 활성화
        aws s3 website s3://$BUCKET_NAME/ \
            --index-document index.html \
            --error-document index.html
        check_error

        echo -e "${GREEN}✅ 버킷 생성 및 웹 호스팅 설정 완료${NC}"
    else
        echo -e "${RED}❌ 배포 취소${NC}"
        exit 1
    fi
fi

# 4. S3 업로드
echo -e "${YELLOW}☁️  S3에 업로드 중...${NC}"

# index.html 업로드 (캐시 없음)
echo -e "  • index.html 업로드..."
aws s3 cp $BUILD_DIR/index.html s3://$BUCKET_NAME/ \
    --cache-control "no-cache, no-store, must-revalidate" \
    --content-type "text/html" \
    --metadata-directive REPLACE
check_error

# 정적 자산 업로드 (장기 캐시)
if [ -d "$BUILD_DIR/assets" ]; then
    echo -e "  • assets 폴더 업로드..."
    aws s3 sync $BUILD_DIR/assets s3://$BUCKET_NAME/assets \
        --cache-control "public, max-age=31536000, immutable" \
        --delete
    check_error
fi

# PWA 파일 업로드
if [ -f "$BUILD_DIR/manifest.json" ]; then
    echo -e "  • PWA manifest 업로드..."
    aws s3 cp $BUILD_DIR/manifest.json s3://$BUCKET_NAME/ \
        --cache-control "public, max-age=3600" \
        --content-type "application/manifest+json"
fi

if [ -f "$BUILD_DIR/sw.js" ] || [ -f "$BUILD_DIR/service-worker.js" ]; then
    echo -e "  • Service Worker 업로드..."
    SW_FILE=$(ls $BUILD_DIR/sw.js 2>/dev/null || ls $BUILD_DIR/service-worker.js 2>/dev/null)
    aws s3 cp $SW_FILE s3://$BUCKET_NAME/ \
        --cache-control "no-cache, no-store, must-revalidate" \
        --content-type "application/javascript"
fi

# 나머지 파일 업로드
echo -e "  • 나머지 파일 업로드..."
aws s3 sync $BUILD_DIR s3://$BUCKET_NAME \
    --exclude "index.html" \
    --exclude "assets/*" \
    --exclude "manifest.json" \
    --exclude "sw.js" \
    --exclude "service-worker.js" \
    --cache-control "public, max-age=3600" \
    --delete
check_error

echo -e "${GREEN}✅ S3 업로드 완료${NC}"
echo ""

# 5. CloudFront 캐시 무효화 (선택사항)
if [ ! -z "$DISTRIBUTION_ID" ]; then
    echo -e "${YELLOW}🔄 CloudFront 캐시 무효화...${NC}"
    INVALIDATION_ID=$(aws cloudfront create-invalidation \
        --distribution-id $DISTRIBUTION_ID \
        --paths "/*" \
        --query 'Invalidation.Id' \
        --output text)

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ 캐시 무효화 시작 (ID: ${INVALIDATION_ID})${NC}"
    else
        echo -e "${YELLOW}⚠️  캐시 무효화 실패 (계속 진행)${NC}"
    fi
    echo ""
fi

# 6. 완료 메시지
echo -e "${BLUE}============================================${NC}"
echo -e "${GREEN}🎉 배포 완료!${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "${GREEN}📍 접속 URL:${NC}"
echo -e "  • S3: ${BLUE}http://${BUCKET_NAME}.s3-website.${REGION}.amazonaws.com${NC}"

if [ ! -z "$DISTRIBUTION_ID" ]; then
    DOMAIN=$(aws cloudfront get-distribution \
        --id $DISTRIBUTION_ID \
        --query 'Distribution.DomainName' \
        --output text 2>/dev/null)
    if [ ! -z "$DOMAIN" ]; then
        echo -e "  • CloudFront: ${BLUE}https://${DOMAIN}${NC}"
    fi
fi

echo ""
echo -e "${YELLOW}💡 팁:${NC}"
echo -e "  • 버킷 정책이 설정되지 않은 경우 퍼블릭 액세스를 활성화하세요"
echo -e "  • CloudFront를 사용하면 HTTPS와 더 빠른 로딩 속도를 제공합니다"
echo ""