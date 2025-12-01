# 대용량 동영상 업로드 개선 방안

## 현재 구조 분석

### 업로드 플로우
```
1. 사용자 파일 선택
2. Duration 추출 (타임아웃 3초) - 프론트엔드
3. 배치 업로드 URL 요청 - 백엔드
4. S3 직접 업로드 (Presigned URL) - 프론트엔드
5. 썸네일 생성 (타임아웃 10초) - 프론트엔드
6. 썸네일 S3 업로드 - 프론트엔드
```

### 현재 문제점

#### 1. 프론트엔드 블로킹
- **문제**: 썸네일 생성과 duration 추출이 프론트엔드에서 실행됨
- **영향**:
  - 대용량 파일(100MB+)의 경우 브라우저 메모리 부담
  - 썸네일 생성 중 UI 반응성 저하
  - 타임아웃 시 실패 처리 불명확

#### 2. 동기적 처리
- **문제**: 모든 파일의 썸네일이 완료될 때까지 대기
- **영향**:
  - 30개 파일 업로드 시 총 대기 시간 = 30 × 10초 = 최대 5분
  - 사용자가 페이지를 떠나면 업로드 중단

#### 3. 에러 핸들링 부족
- **문제**: 타임아웃 발생 시 null 반환만 수행
- **영향**:
  - 사용자가 실패 원인을 알 수 없음
  - 재시도 메커니즘 없음

#### 4. 모바일 환경 고려 부족
- **문제**: 모바일 브라우저의 메모리 제한
- **영향**:
  - 대용량 동영상 로딩 시 브라우저 크래시 가능
  - 백그라운드 탭에서 작업 중단 가능

## 개선 방안

### 방안 1: 백엔드 비동기 처리 (권장)

#### 아키텍처
```
[프론트엔드]                [백엔드]                    [워커]
    │                          │                         │
    ├─ 1. 파일 업로드 URL 요청 ─→│                         │
    │  (duration 없음)          │                         │
    │                          │                         │
    ├─ 2. S3 직접 업로드 ───────→ S3                      │
    │                          │                         │
    ├─ 3. 업로드 완료 통지 ─────→│                         │
    │                          ├─ 4. 작업 큐 등록 ───────→│
    │                          │                         │
    │                          │    5. 썸네일 생성 ←──────┤
    │                          │    6. Duration 추출     │
    │                          │    7. S3 업로드         │
    │                          │                         │
    │← 8. 완료 알림 (WebSocket)─┤← 9. 작업 완료 통지 ─────┤
    │                          │                         │
    └─ 10. 갤러리 새로고침      │                         │
```

#### 구현 상세

##### 백엔드 (Node.js + Bull Queue)

```javascript
// queue/videoProcessor.js
const Queue = require('bull');
const AWS = require('aws-sdk');
const ffmpeg = require('fluent-ffmpeg');
const s3 = new AWS.S3();

const videoQueue = new Queue('video-processing', {
  redis: process.env.REDIS_URL
});

// 작업 처리
videoQueue.process(async (job) => {
  const { fileId, s3Key, userId } = job.data;

  try {
    // 1. S3에서 파일 다운로드 (스트림 방식)
    const s3Stream = s3.getObject({
      Bucket: process.env.S3_BUCKET,
      Key: s3Key
    }).createReadStream();

    // 2. Duration 추출
    const duration = await extractDuration(s3Stream);

    // 3. 썸네일 생성 (seekTime = duration / 2)
    const thumbnail = await generateThumbnail(s3Stream, duration / 2);

    // 4. 썸네일 S3 업로드
    const thumbnailKey = `thumbnails/${fileId}.jpg`;
    await s3.putObject({
      Bucket: process.env.S3_BUCKET,
      Key: thumbnailKey,
      Body: thumbnail,
      ContentType: 'image/jpeg'
    }).promise();

    // 5. DB 업데이트
    await db.files.update({
      where: { id: fileId },
      data: {
        duration,
        thumbnailUrl: thumbnailKey,
        processingStatus: 'completed'
      }
    });

    // 6. 사용자에게 알림 전송 (WebSocket)
    io.to(`user:${userId}`).emit('file:processed', {
      fileId,
      duration,
      thumbnailUrl: thumbnailKey,
      status: 'completed'
    });

    return { success: true, fileId };

  } catch (error) {
    console.error('Processing failed:', error);

    // DB 업데이트 (실패 상태)
    await db.files.update({
      where: { id: fileId },
      data: {
        processingStatus: 'failed',
        processingError: error.message
      }
    });

    // 사용자에게 실패 알림
    io.to(`user:${userId}`).emit('file:processing-failed', {
      fileId,
      error: error.message
    });

    throw error;
  }
});

// Duration 추출 함수
async function extractDuration(videoStream) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoStream)
      .ffprobe((err, metadata) => {
        if (err) reject(err);
        else resolve(metadata.format.duration);
      });
  });
}

// 썸네일 생성 함수
async function generateThumbnail(videoStream, seekTime) {
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
      .on('data', chunk => chunks.push(chunk));
  });
}

module.exports = videoQueue;
```

##### 백엔드 API 업데이트

```javascript
// routes/files.js
const express = require('express');
const videoQueue = require('../queue/videoProcessor');

router.post('/files/:id/complete-upload', async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  // 파일 정보 조회
  const file = await db.files.findUnique({ where: { id } });

  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }

  // 비디오 파일인 경우 처리 큐에 추가
  if (file.fileType === 'video') {
    await videoQueue.add({
      fileId: file.id,
      s3Key: file.s3Key,
      userId
    }, {
      attempts: 3, // 재시도 3번
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });

    // 즉시 응답 (처리 중 상태)
    return res.json({
      success: true,
      file: {
        ...file,
        processingStatus: 'processing'
      }
    });
  }

  // 이미지는 즉시 처리
  return res.json({
    success: true,
    file
  });
});
```

##### 프론트엔드 (React + WebSocket)

```javascript
// context/WebSocketContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

const WebSocketContext = createContext(null);

export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const newSocket = io(import.meta.env.VITE_WS_URL, {
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected');
    });

    // 파일 처리 완료 이벤트
    newSocket.on('file:processed', (data) => {
      console.log('File processed:', data);

      // 브라우저 알림
      if (Notification.permission === 'granted') {
        new Notification('파일 처리 완료', {
          body: `파일이 성공적으로 처리되었습니다.`,
          icon: '/icon.png'
        });
      }

      // 토스트 알림 추가
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'success',
        message: '파일 처리 완료',
        fileId: data.fileId
      }]);
    });

    // 파일 처리 실패 이벤트
    newSocket.on('file:processing-failed', (data) => {
      console.error('File processing failed:', data);

      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        message: `파일 처리 실패: ${data.error}`,
        fileId: data.fileId
      }]);
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  return (
    <WebSocketContext.Provider value={{ socket, notifications, setNotifications }}>
      {children}
    </WebSocketContext.Provider>
  );
};
```

```javascript
// api/fileApi.js - 업데이트
async uploadBatchFiles(files, onProgress, fileTags = {}) {
  if (files.length > 30) {
    throw new Error('최대 30개까지만 업로드할 수 있습니다.');
  }

  // Duration 추출 제거 - 백엔드에서 처리

  // 배치 업로드 URL 요청
  const fileInfos = files.map((file, index) => {
    const info = {
      file_name: file.name,
      content_type: file.type,
      file_type: file.type.startsWith('image/') ? 'image' : 'video',
      file_size: file.size,
    };

    const tags = fileTags[index]?.tags || [];
    if (tags.length > 0) {
      info.tags = tags;
    }

    // Duration 제거됨
    return info;
  });

  const batchResponse = await this.requestBatchUploadUrl(fileInfos);

  // S3 업로드만 수행
  const uploadPromises = batchResponse.results.map(async (result, index) => {
    const file = files[index];

    if (onProgress) {
      onProgress(index, 0);
    }

    // 원본 파일 업로드
    await this.uploadToS3(
      result.upload_url,
      file,
      (progress) => {
        if (onProgress) {
          onProgress(index, progress);
        }
      }
    );

    // 업로드 완료 통지
    await client.post(`/api/v1/files/${result.file_id}/complete-upload`, {}, {
      baseURL: import.meta.env.VITE_FILE_API_URL
    });

    if (onProgress) {
      onProgress(index, 100);
    }

    return {
      file_id: result.file_id,
      s3_key: result.s3_key,
      file_name: file.name,
      processing_status: file.type.startsWith('video/') ? 'processing' : 'completed'
    };
  });

  return Promise.all(uploadPromises);
}
```

```javascript
// components/ProcessingToast.jsx - 새로운 컴포넌트
import React, { useEffect } from 'react';
import { useWebSocket } from '../context/WebSocketContext';

const ProcessingToast = () => {
  const { notifications, setNotifications } = useWebSocket();

  useEffect(() => {
    // 브라우저 알림 권한 요청
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      {notifications.map(notification => (
        <div
          key={notification.id}
          style={{
            background: notification.type === 'success' ? '#E6F4EA' : '#FEE2E2',
            color: notification.type === 'success' ? '#137333' : '#DC2626',
            padding: '16px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            minWidth: '320px',
            maxWidth: '400px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            animation: 'slideInUp 0.3s ease-out'
          }}
        >
          <span style={{ fontWeight: '600' }}>{notification.message}</span>
          <button
            onClick={() => removeNotification(notification.id)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '18px',
              color: 'inherit'
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default ProcessingToast;
```

#### 장점
- ✅ 프론트엔드 메모리 부담 감소
- ✅ 사용자 경험 개선 (즉시 업로드 완료)
- ✅ 재시도 메커니즘 내장
- ✅ 확장 가능 (워커 수평 확장)
- ✅ 실시간 알림 제공

#### 단점
- ❌ 백엔드 인프라 복잡도 증가
- ❌ Redis 등 추가 의존성 필요
- ❌ WebSocket 서버 필요

---

### 방안 2: Service Worker 활용 (중간 방안)

#### 아키텍처
```
[프론트엔드]              [Service Worker]           [백엔드]
    │                          │                        │
    ├─ 1. 파일 업로드 요청 ───→│                        │
    │                          ├─ 2. S3 업로드 ────────→│
    │                          │                        │
    │← 3. 즉시 응답 ───────────┤                        │
    │  (업로드 진행 중)         │                        │
    │                          ├─ 4. 썸네일 생성       │
    │                          │  (백그라운드 스레드)   │
    │                          │                        │
    │                          ├─ 5. 썸네일 업로드 ────→│
    │                          │                        │
    │← 6. 완료 알림 ───────────┤                        │
    │  (postMessage)           │                        │
```

#### 구현 상세

```javascript
// public/sw.js
self.addEventListener('message', async (event) => {
  if (event.data.type === 'PROCESS_VIDEO') {
    const { file, uploadUrl, thumbnailUploadUrl } = event.data;

    try {
      // 1. S3 업로드
      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type
        }
      });

      // 2. 썸네일 생성 (OffscreenCanvas 사용)
      const thumbnail = await generateThumbnailInWorker(file);

      // 3. 썸네일 업로드
      await fetch(thumbnailUploadUrl, {
        method: 'PUT',
        body: thumbnail,
        headers: {
          'Content-Type': 'image/jpeg'
        }
      });

      // 4. 완료 알림
      event.source.postMessage({
        type: 'UPLOAD_COMPLETE',
        fileId: event.data.fileId
      });

    } catch (error) {
      event.source.postMessage({
        type: 'UPLOAD_ERROR',
        error: error.message
      });
    }
  }
});

async function generateThumbnailInWorker(file) {
  // OffscreenCanvas를 사용한 썸네일 생성
  // (구현 세부사항 생략)
}
```

#### 장점
- ✅ 백엔드 변경 최소화
- ✅ 프론트엔드만으로 개선 가능
- ✅ 백그라운드 처리 가능

#### 단점
- ❌ Service Worker 지원 브라우저 제한
- ❌ 대용량 파일 처리 시 여전히 브라우저 부담
- ❌ 에러 핸들링 복잡도 증가

---

### 방안 3: 간단한 개선 (최소 변경)

#### 현재 코드 개선 사항

```javascript
// api/fileApi.js
async uploadBatchFiles(files, onProgress, fileTags = {}) {
  if (files.length > 30) {
    throw new Error('최대 30개까지만 업로드할 수 있습니다.');
  }

  // 1. 파일 크기별 처리 전략
  const LARGE_FILE_THRESHOLD = 50 * 1024 * 1024; // 50MB

  // 2. Duration 추출 (큰 파일은 스킵)
  const durationPromises = files.map(async (file, index) => {
    if (file.type.startsWith('video/')) {
      // 큰 파일은 duration 추출 스킵
      if (file.size > LARGE_FILE_THRESHOLD) {
        console.log(`Large file detected (${file.name}), skipping duration extraction`);
        return null;
      }

      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Duration extraction timeout')), 3000)
        );

        return await Promise.race([
          getVideoDuration(file),
          timeoutPromise
        ]);
      } catch (error) {
        console.warn(`Failed to get duration for ${file.name}:`, error);
        return null;
      }
    }
    return null;
  });

  let durations = await Promise.all(durationPromises);

  // 3. 배치 업로드 URL 요청
  const fileInfos = files.map((file, index) => {
    const info = {
      file_name: file.name,
      content_type: file.type,
      file_type: file.type.startsWith('image/') ? 'image' : 'video',
      file_size: file.size,
    };

    const tags = fileTags[index]?.tags || [];
    if (tags.length > 0) {
      info.tags = tags;
    }

    if (durations[index]) {
      info.duration = durations[index];
    }

    return info;
  });

  const batchResponse = await this.requestBatchUploadUrl(fileInfos);

  // 4. 업로드 (큰 파일은 썸네일 스킵)
  const uploadPromises = batchResponse.results.map(async (result, index) => {
    const file = files[index];
    const isLargeFile = file.size > LARGE_FILE_THRESHOLD;

    if (onProgress) {
      onProgress(index, 0, 'uploading');
    }

    // 원본 업로드
    await this.uploadToS3(
      result.upload_url,
      file,
      (progress) => {
        if (onProgress) {
          const percent = isLargeFile ? progress : Math.round(progress * 0.8);
          onProgress(index, percent, 'uploading');
        }
      }
    );

    // 큰 파일은 썸네일 생성 스킵
    if (isLargeFile) {
      console.log(`Large file (${file.name}), skipping thumbnail generation`);

      if (onProgress) {
        onProgress(index, 100, 'completed');
      }

      return {
        file_id: result.file_id,
        s3_key: result.s3_key,
        file_name: file.name,
        thumbnail_skipped: true
      };
    }

    // 작은 파일만 썸네일 생성
    if (result.thumbnail_upload_url) {
      if (onProgress) {
        onProgress(index, 80, 'processing');
      }

      try {
        let thumbnail = null;
        if (file.type.startsWith('video/')) {
          const duration = durations[index];
          const seekTime = duration ? duration / 2 : 1;
          thumbnail = await generateVideoThumbnail(file, { seekTime });
        } else if (file.type.startsWith('image/')) {
          thumbnail = await generateThumbnail(file);
        }

        if (thumbnail) {
          await axios.put(result.thumbnail_upload_url, thumbnail, {
            headers: { 'Content-Type': 'image/jpeg' },
            timeout: 30000,
          });
        }
      } catch (err) {
        console.warn(`Failed to upload thumbnail for ${file.name}:`, err);
      }
    }

    if (onProgress) {
      onProgress(index, 100, 'completed');
    }

    return {
      file_id: result.file_id,
      s3_key: result.s3_key,
      file_name: file.name,
    };
  });

  return Promise.all(uploadPromises);
}
```

```javascript
// components/UploadToast.jsx - 개선된 진행률 표시
const UploadToast = ({ uploadState, onClose }) => {
  if (!uploadState) return null;

  const { files, progress, total, completed, failed, done, error } = uploadState;

  const totalPercent = Math.round(
    Object.values(progress).reduce((sum, item) => sum + item.percent, 0) / total || 0
  );

  // 큰 파일 감지
  const largeFiles = files.filter(f => f.size > 50 * 1024 * 1024);
  const hasLargeFiles = largeFiles.length > 0;

  return (
    <div style={{ /* 스타일 */ }}>
      {/* 헤더 */}
      <div>
        {done ? '업로드 완료' : '업로드 중...'}
      </div>

      {/* 진행률 */}
      <div>
        {!done && (
          <>
            <div>{completed} / {total} 파일 완료</div>
            <div>{totalPercent}%</div>

            {/* 큰 파일 안내 메시지 */}
            {hasLargeFiles && (
              <div style={{
                marginTop: '8px',
                fontSize: '12px',
                color: 'var(--text-tertiary)',
                fontStyle: 'italic'
              }}>
                💡 대용량 파일은 썸네일이 나중에 생성됩니다
              </div>
            )}

            {/* 현재 파일 상태 */}
            <div style={{ /* 스타일 */ }}>
              {files.find((_, i) => progress[i]?.status === 'uploading')?.name ?
                `업로드 중: ${files.find((_, i) => progress[i]?.status === 'uploading')?.name}` :
                files.find((_, i) => progress[i]?.status === 'processing')?.name ?
                  `처리 중: ${files.find((_, i) => progress[i]?.status === 'processing')?.name}` :
                  '대기 중...'
              }
            </div>
          </>
        )}
      </div>
    </div>
  );
};
```

#### 장점
- ✅ 최소한의 코드 변경
- ✅ 즉시 적용 가능
- ✅ 백엔드 변경 불필요

#### 단점
- ❌ 대용량 파일 썸네일 없음
- ❌ Duration 정보 부족
- ❌ 근본적인 해결책 아님

---

## 권장 구현 단계

### Phase 1: 즉시 적용 (방안 3)
1. 파일 크기별 처리 전략 도입
2. 큰 파일(50MB+)은 썸네일 생성 스킵
3. 사용자에게 안내 메시지 표시

### Phase 2: 중기 개선 (방안 1 준비)
1. WebSocket 서버 구축
2. 백엔드 큐 시스템 설계
3. 프론트엔드 알림 시스템 구현

### Phase 3: 완전 비동기화 (방안 1)
1. 백엔드 워커 구현
2. S3 → 워커 → 알림 플로우 구축
3. 프론트엔드 WebSocket 연동

---

## 예상 효과

| 항목 | 현재 | 방안 1 적용 후 |
|------|------|---------------|
| 100MB 파일 업로드 | ~30초 (썸네일 포함) | ~10초 (업로드만) |
| 30개 파일 일괄 업로드 | ~5분 | ~2분 |
| 브라우저 메모리 사용 | 높음 | 낮음 |
| 사용자 대기 시간 | 길음 | 짧음 |
| 재시도 메커니즘 | 없음 | 있음 |

---

## 참고 자료

- [Bull Queue Documentation](https://github.com/OptimalBits/bull)
- [WebSocket vs Server-Sent Events](https://ably.com/topic/websockets-vs-sse)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Notification API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
