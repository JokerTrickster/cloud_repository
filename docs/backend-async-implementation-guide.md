# 백엔드 비동기 처리 구현 가이드

## 📋 개요

대용량 파일 업로드 후 썸네일 생성과 Duration 추출을 백엔드에서 비동기로 처리하고, 완료 시 WebSocket으로 알림을 보내는 시스템 구현 가이드입니다.

## 🎯 목표

- 프론트엔드는 S3 업로드만 완료하면 끝
- 백엔드에서 썸네일 생성 및 Duration 추출을 백그라운드 처리
- WebSocket으로 실시간 완료 알림
- 브라우저를 닫아도 처리 계속 진행

---

## 📦 1단계: 패키지 설치

### joker_backend 디렉토리에서 실행

```bash
cd ../joker_backend

# 필수 패키지 설치
npm install bull redis socket.io fluent-ffmpeg

# FFmpeg 시스템 설치 (macOS)
brew install ffmpeg

# Redis 설치 및 실행 (macOS)
brew install redis
brew services start redis
```

### 설치 확인

```bash
# Redis 실행 확인
redis-cli ping
# 응답: PONG

# FFmpeg 설치 확인
ffmpeg -version
```

---

## 🗂️ 2단계: 프로젝트 구조

```
joker_backend/
├── config/
│   └── redis.js          # Redis 설정
├── queue/
│   └── videoProcessor.js # 비디오 처리 워커
├── routes/
│   └── files.js          # 파일 API (수정)
├── socket/
│   └── index.js          # WebSocket 핸들러
├── utils/
│   └── ffmpeg.js         # FFmpeg 유틸리티
└── server.js             # 메인 서버 (수정)
```

---

## 📝 3단계: 코드 구현

### 1️⃣ config/redis.js

```javascript
const Redis = require('ioredis');

const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

redisClient.on('connect', () => {
  console.log('✅ Redis connected');
});

redisClient.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});

module.exports = redisClient;
```

### 2️⃣ utils/ffmpeg.js

```javascript
const ffmpeg = require('fluent-ffmpeg');
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Readable } = require('stream');

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-northeast-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

/**
 * S3에서 비디오 다운로드 (스트림)
 */
async function getVideoStreamFromS3(bucket, key) {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key
  });

  const response = await s3Client.send(command);
  return response.Body; // Readable stream
}

/**
 * 비디오 Duration 추출
 */
function extractDuration(videoStream) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoStream)
      .ffprobe((err, metadata) => {
        if (err) {
          reject(err);
        } else {
          const duration = metadata.format.duration;
          resolve(Math.round(duration * 100) / 100); // 소수점 2자리
        }
      });
  });
}

/**
 * 비디오 썸네일 생성
 */
function generateThumbnail(videoStream, seekTime = 0) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    ffmpeg(videoStream)
      .seekInput(seekTime)
      .frames(1)
      .size('200x200')
      .outputFormat('mjpeg')
      .on('error', reject)
      .on('end', () => resolve(Buffer.concat(chunks)))
      .pipe()
      .on('data', chunk => chunks.push(chunk))
      .on('error', reject);
  });
}

/**
 * S3에 썸네일 업로드
 */
async function uploadThumbnailToS3(bucket, key, thumbnailBuffer) {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: thumbnailBuffer,
    ContentType: 'image/jpeg'
  });

  await s3Client.send(command);
}

module.exports = {
  getVideoStreamFromS3,
  extractDuration,
  generateThumbnail,
  uploadThumbnailToS3
};
```

### 3️⃣ queue/videoProcessor.js

```javascript
const Queue = require('bull');
const redisClient = require('../config/redis');
const {
  getVideoStreamFromS3,
  extractDuration,
  generateThumbnail,
  uploadThumbnailToS3
} = require('../utils/ffmpeg');

// Bull Queue 생성
const videoQueue = new Queue('video-processing', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  }
});

// 작업 처리
videoQueue.process(async (job) => {
  const { fileId, s3Key, userId, bucket } = job.data;

  console.log(`[VideoProcessor] Processing file ${fileId}...`);

  try {
    // 1. S3에서 비디오 스트림 가져오기
    const videoStream = await getVideoStreamFromS3(bucket, s3Key);

    // 2. Duration 추출
    console.log(`[VideoProcessor] Extracting duration for file ${fileId}...`);
    const duration = await extractDuration(videoStream);

    // 3. 썸네일 생성 (첫 프레임)
    console.log(`[VideoProcessor] Generating thumbnail for file ${fileId}...`);
    const videoStream2 = await getVideoStreamFromS3(bucket, s3Key);
    const seekTime = duration > 0 ? duration / 2 : 0; // 중간 또는 첫 프레임
    const thumbnail = await generateThumbnail(videoStream2, seekTime);

    // 4. 썸네일 S3 업로드
    const thumbnailKey = `thumbnails/${fileId}.jpg`;
    console.log(`[VideoProcessor] Uploading thumbnail for file ${fileId}...`);
    await uploadThumbnailToS3(bucket, thumbnailKey, thumbnail);

    // 5. DB 업데이트
    console.log(`[VideoProcessor] Updating database for file ${fileId}...`);
    await updateFileInDatabase(fileId, {
      duration,
      thumbnail_url: `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${thumbnailKey}`,
      processing_status: 'completed'
    });

    // 6. WebSocket으로 완료 알림
    const io = require('../server').io;
    if (io) {
      io.to(`user:${userId}`).emit('file:processed', {
        fileId,
        duration,
        thumbnailUrl: thumbnailKey,
        status: 'completed'
      });
    }

    console.log(`✅ [VideoProcessor] File ${fileId} processing completed`);

    return { success: true, fileId, duration };

  } catch (error) {
    console.error(`❌ [VideoProcessor] Processing failed for file ${fileId}:`, error);

    // DB 업데이트 (실패 상태)
    await updateFileInDatabase(fileId, {
      processing_status: 'failed',
      processing_error: error.message
    });

    // WebSocket으로 실패 알림
    const io = require('../server').io;
    if (io) {
      io.to(`user:${userId}`).emit('file:processing-failed', {
        fileId,
        error: error.message
      });
    }

    throw error;
  }
});

// DB 업데이트 함수 (실제 DB 모델에 맞게 수정)
async function updateFileInDatabase(fileId, data) {
  // 예시: Prisma 사용 시
  // const { prisma } = require('../config/database');
  // await prisma.file.update({
  //   where: { id: fileId },
  //   data
  // });

  // 예시: Sequelize 사용 시
  // const { File } = require('../models');
  // await File.update(data, { where: { id: fileId } });

  console.log(`[DB] Updated file ${fileId}:`, data);
}

// 작업 추가 함수
async function addVideoProcessingJob(fileData) {
  const job = await videoQueue.add(fileData, {
    attempts: 3, // 재시도 3번
    backoff: {
      type: 'exponential',
      delay: 2000 // 2초부터 시작
    }
  });

  console.log(`[VideoQueue] Job ${job.id} added for file ${fileData.fileId}`);
  return job;
}

module.exports = {
  videoQueue,
  addVideoProcessingJob
};
```

### 4️⃣ socket/index.js

```javascript
const socketIo = require('socket.io');

function initializeSocket(server) {
  const io = socketIo(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // 인증 미들웨어
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication error'));
    }

    // JWT 검증 (실제 구현에 맞게 수정)
    try {
      // const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // socket.userId = decoded.userId;

      // 임시: 토큰에서 userId 추출
      socket.userId = extractUserIdFromToken(token);
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  // 연결 처리
  io.on('connection', (socket) => {
    console.log(`✅ WebSocket connected: ${socket.id} (User: ${socket.userId})`);

    // 사용자별 룸에 참가
    socket.join(`user:${socket.userId}`);

    // 연결 해제
    socket.on('disconnect', () => {
      console.log(`❌ WebSocket disconnected: ${socket.id}`);
    });
  });

  return io;
}

// 토큰에서 userId 추출 (실제 구현에 맞게 수정)
function extractUserIdFromToken(token) {
  // 예시: JWT 디코딩
  // const jwt = require('jsonwebtoken');
  // const decoded = jwt.verify(token, process.env.JWT_SECRET);
  // return decoded.userId;

  return 1; // 임시
}

module.exports = initializeSocket;
```

### 5️⃣ routes/files.js 수정

기존 파일 API에 다음 엔드포인트 추가:

```javascript
const express = require('express');
const router = express.Router();
const { addVideoProcessingJob } = require('../queue/videoProcessor');

/**
 * POST /api/v1/files/:id/complete-upload
 * 파일 업로드 완료 통지 (백그라운드 처리 시작)
 */
router.post('/:id/complete-upload', authenticateUser, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    // 파일 정보 조회
    const file = await getFileById(id);

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // 비디오 파일인 경우 처리 큐에 추가
    if (file.file_type === 'video') {
      await addVideoProcessingJob({
        fileId: file.id,
        s3Key: file.s3_key,
        userId,
        bucket: process.env.S3_BUCKET
      });

      // 즉시 응답 (처리 중 상태)
      return res.json({
        success: true,
        file: {
          ...file,
          processing_status: 'processing'
        }
      });
    }

    // 이미지는 즉시 완료
    return res.json({
      success: true,
      file: {
        ...file,
        processing_status: 'completed'
      }
    });

  } catch (error) {
    console.error('Complete upload error:', error);
    res.status(500).json({ error: 'Failed to process upload completion' });
  }
});

// 파일 조회 함수 (실제 DB 모델에 맞게 수정)
async function getFileById(id) {
  // 예시: Prisma 사용 시
  // const { prisma } = require('../config/database');
  // return await prisma.file.findUnique({ where: { id: parseInt(id) } });

  return {
    id,
    file_name: 'test.mp4',
    file_type: 'video',
    s3_key: 'files/test.mp4'
  };
}

module.exports = router;
```

### 6️⃣ server.js 수정

```javascript
const express = require('express');
const http = require('http');
const initializeSocket = require('./socket');

const app = express();
const server = http.createServer(app);

// WebSocket 초기화
const io = initializeSocket(server);

// Express에 io 인스턴스 저장 (다른 라우트에서 사용하기 위해)
app.set('io', io);
module.exports.io = io;

// 기존 라우트
app.use('/api/v1/files', require('./routes/files'));

// 서버 시작
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔌 WebSocket ready`);
});
```

---

## 🔧 4단계: 환경 변수 설정

### .env 파일 추가

```env
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# AWS S3
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET=your_bucket_name

# WebSocket
FRONTEND_URL=http://localhost:5173

# JWT
JWT_SECRET=your_jwt_secret
```

---

## 🧪 5단계: 테스트

### 1️⃣ Redis 연결 테스트

```bash
node -e "require('./config/redis')"
# 출력: ✅ Redis connected
```

### 2️⃣ 수동으로 작업 추가 테스트

```javascript
// test-queue.js
const { addVideoProcessingJob } = require('./queue/videoProcessor');

addVideoProcessingJob({
  fileId: 1,
  s3Key: 'files/test.mp4',
  userId: 1,
  bucket: 'your-bucket'
}).then(() => {
  console.log('Job added successfully');
  process.exit(0);
});
```

```bash
node test-queue.js
```

### 3️⃣ WebSocket 연결 테스트

프론트엔드에서:

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: localStorage.getItem('access_token')
  }
});

socket.on('connect', () => {
  console.log('✅ WebSocket connected');
});

socket.on('file:processed', (data) => {
  console.log('✅ File processing completed:', data);
});

socket.on('file:processing-failed', (data) => {
  console.error('❌ File processing failed:', data);
});
```

---

## 📊 6단계: 모니터링

### Bull Queue Dashboard (선택사항)

```bash
npm install bull-board

# server.js에 추가
const { createBullBoard } = require('@bull-board/api');
const { BullAdapter } = require('@bull-board/api/bullAdapter');
const { ExpressAdapter } = require('@bull-board/express');

const serverAdapter = new ExpressAdapter();
createBullBoard({
  queues: [new BullAdapter(videoQueue)],
  serverAdapter
});

app.use('/admin/queues', serverAdapter.getRouter());
```

브라우저에서 `http://localhost:3000/admin/queues` 접속하여 작업 모니터링

---

## 🚀 7단계: 배포 시 고려사항

### 1️⃣ Redis 설정
- **개발**: 로컬 Redis
- **프로덕션**: AWS ElastiCache, Redis Cloud 등

### 2️⃣ 워커 프로세스 분리
```bash
# 별도 워커 프로세스 실행
node worker.js
```

worker.js:
```javascript
require('./queue/videoProcessor');
console.log('🔧 Video processor worker started');
```

### 3️⃣ 스케일링
- 워커 프로세스를 여러 개 실행하여 병렬 처리
- Redis를 통해 작업 분산

---

## ✅ 완료 체크리스트

- [ ] Redis 설치 및 실행 확인
- [ ] FFmpeg 설치 확인
- [ ] npm 패키지 설치 완료
- [ ] Redis 연결 설정
- [ ] FFmpeg 유틸리티 구현
- [ ] Bull Queue 워커 구현
- [ ] WebSocket 서버 구축
- [ ] 파일 업로드 완료 API 추가
- [ ] 환경 변수 설정
- [ ] 로컬 테스트 성공
- [ ] 프론트엔드 WebSocket 연동

---

## 🔗 다음 단계

백엔드 구현 완료 후:
1. 프론트엔드 WebSocket 연동 (별도 가이드 제공)
2. 업로드 플로우 수정 (썸네일 생성 제거)
3. 통합 테스트

궁금한 점이나 문제가 발생하면 알려주세요!
