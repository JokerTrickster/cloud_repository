# 프론트엔드 비동기 처리 연동 가이드

## 📋 개요

백엔드 비동기 처리 시스템과 연동하여 WebSocket으로 실시간 알림을 받는 프론트엔드 구현 가이드입니다.

## 🎯 변경 사항 요약

### Before (현재)
```
사용자 → 파일 선택
  ↓
S3 업로드 + 썸네일 생성 (프론트엔드)
  ↓
완료
```

### After (비동기)
```
사용자 → 파일 선택
  ↓
S3 업로드만 완료 (빠름!)
  ↓
백엔드로 완료 통지
  ↓
[백그라운드에서 처리]
  ↓
WebSocket으로 완료 알림 받기 🔔
```

---

## 📦 1단계: 패키지 설치

```bash
cd /Users/luxrobo/project/cloud_repository
npm install socket.io-client
```

---

## 🗂️ 2단계: 프로젝트 구조

```
src/
├── context/
│   └── WebSocketContext.jsx   # WebSocket 컨텍스트
├── components/
│   └── ProcessingToast.jsx    # 처리 완료 알림 UI
├── api/
│   └── fileApi.js              # 파일 API (수정)
└── App.jsx                     # 앱 루트 (수정)
```

---

## 📝 3단계: 코드 구현

### 1️⃣ src/context/WebSocketContext.jsx (새로 생성)

```javascript
import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

const WebSocketContext = createContext(null);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('access_token');

    if (!token) {
      console.log('No access token, skipping WebSocket connection');
      return;
    }

    // WebSocket 연결
    const newSocket = io(import.meta.env.VITE_WS_URL || 'http://localhost:3000', {
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('✅ WebSocket connected');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
      setIsConnected(false);
    });

    // 파일 처리 완료 이벤트
    newSocket.on('file:processed', (data) => {
      console.log('✅ File processed:', data);

      // 브라우저 알림 (권한이 있는 경우)
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
        fileId: data.fileId,
        data
      }]);

      // 5초 후 자동 제거
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.fileId !== data.fileId));
      }, 5000);
    });

    // 파일 처리 실패 이벤트
    newSocket.on('file:processing-failed', (data) => {
      console.error('❌ File processing failed:', data);

      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        message: `파일 처리 실패: ${data.error}`,
        fileId: data.fileId,
        data
      }]);

      // 10초 후 자동 제거
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.fileId !== data.fileId));
      }, 10000);
    });

    setSocket(newSocket);

    // 브라우저 알림 권한 요청
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      newSocket.close();
    };
  }, []);

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <WebSocketContext.Provider value={{
      socket,
      notifications,
      isConnected,
      removeNotification
    }}>
      {children}
    </WebSocketContext.Provider>
  );
};
```

### 2️⃣ src/components/ProcessingToast.jsx (새로 생성)

```javascript
import React from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import { X, CheckCircle, AlertCircle } from 'lucide-react';

const ProcessingToast = () => {
  const { notifications, removeNotification } = useWebSocket();

  if (notifications.length === 0) return null;

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
            alignItems: 'center',
            gap: '12px',
            animation: 'slideInUp 0.3s ease-out'
          }}
        >
          {notification.type === 'success' ? (
            <CheckCircle size={20} />
          ) : (
            <AlertCircle size={20} />
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '600', fontSize: '14px' }}>
              {notification.message}
            </div>
            {notification.data && (
              <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.8 }}>
                파일 ID: {notification.data.fileId}
              </div>
            )}
          </div>
          <button
            onClick={() => removeNotification(notification.id)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: 'inherit'
            }}
          >
            <X size={16} />
          </button>
        </div>
      ))}

      <style>{`
        @keyframes slideInUp {
          from { transform: translateY(100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default ProcessingToast;
```

### 3️⃣ src/api/fileApi.js 수정

```javascript
// 기존 uploadBatchFiles 함수 수정

async uploadBatchFiles(files, onProgress, fileTags = {}) {
  if (files.length > 30) {
    throw new Error('최대 30개까지만 업로드할 수 있습니다.');
  }

  // 대용량 파일 기준 (50MB)
  const LARGE_FILE_THRESHOLD = 50 * 1024 * 1024;

  // Duration 추출은 더 이상 하지 않음 (백엔드에서 처리)
  // 썸네일도 백엔드에서 생성

  // 배치 업로드 URL 요청 (duration 제거)
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

    // Duration 제거됨 (백엔드에서 처리)
    return info;
  });

  const batchResponse = await this.requestBatchUploadUrl(fileInfos);

  // S3 업로드만 수행 (썸네일 생성 제거)
  const uploadPromises = batchResponse.results.map(async (result, index) => {
    const file = files[index];

    if (onProgress) {
      onProgress(index, 0, 'uploading');
    }

    // 원본 파일 업로드 (100% 진행률)
    await this.uploadToS3(
      result.upload_url,
      file,
      (progress) => {
        if (onProgress) {
          onProgress(index, progress, 'uploading');
        }
      }
    );

    // 업로드 완료 통지 (백엔드에서 백그라운드 처리 시작)
    try {
      await client.post(`/api/v1/files/${result.file_id}/complete-upload`, {}, {
        baseURL: import.meta.env.VITE_FILE_API_URL
      });
    } catch (err) {
      console.warn(`Failed to notify upload completion for ${file.name}:`, err);
    }

    if (onProgress) {
      onProgress(index, 100, 'completed');
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

### 4️⃣ src/App.jsx 수정

```javascript
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { WebSocketProvider } from './context/WebSocketContext';
import ProcessingToast from './components/ProcessingToast';
// ... 기존 imports

function App() {
  return (
    <BrowserRouter>
      <WebSocketProvider>
        {/* 기존 앱 컴포넌트 */}
        <YourAppContent />

        {/* 처리 완료 알림 토스트 */}
        <ProcessingToast />
      </WebSocketProvider>
    </BrowserRouter>
  );
}

export default App;
```

### 5️⃣ src/pages/Gallery.jsx 수정

```javascript
// 업로드 토스트 메시지 수정

{/* 대용량 파일 안내 메시지 */}
{uploadState.files.some(f => f.size > 50 * 1024 * 1024) && (
  <div style={{
    marginTop: '12px',
    padding: '8px 12px',
    background: 'rgba(26, 115, 232, 0.08)',
    borderLeft: '3px solid var(--primary)',
    borderRadius: '4px',
    fontSize: '12px',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  }}>
    <span style={{ fontSize: '14px' }}>🔔</span>
    <span>대용량 파일은 백그라운드에서 처리됩니다. 완료 시 알림을 받습니다.</span>
  </div>
)}
```

---

## 🔧 4단계: 환경 변수 설정

### .env 파일 수정

```env
# 기존 변수들...

# WebSocket URL (백엔드 서버 주소)
VITE_WS_URL=http://localhost:3000
```

---

## 🧪 5단계: 테스트

### 1️⃣ 로컬 테스트 순서

```bash
# 1. Redis 실행 확인
redis-cli ping

# 2. 백엔드 서버 시작
cd ../joker_backend
npm run dev

# 3. 프론트엔드 서버 시작 (새 터미널)
cd /Users/luxrobo/project/cloud_repository
npm run dev

# 4. 브라우저에서 테스트
# http://localhost:5173
```

### 2️⃣ 테스트 시나리오

1. **작은 파일 업로드 (<50MB)**
   - 즉시 썸네일 생성됨
   - 처리 완료 즉시

2. **큰 파일 업로드 (>50MB)**
   - S3 업로드만 완료
   - "백그라운드에서 처리됩니다" 메시지 표시
   - 몇 초 후 "파일 처리 완료" 알림 수신
   - 갤러리 자동 새로고침

3. **브라우저 닫기 테스트**
   - 파일 업로드 중 브라우저 닫기
   - 다시 열면 처리 완료 알림 수신

---

## 📊 6단계: 디버깅

### WebSocket 연결 확인

브라우저 콘솔에서:

```javascript
// WebSocket 연결 상태 확인
const { isConnected } = useWebSocket();
console.log('WebSocket connected:', isConnected);

// 수동으로 이벤트 리스닝
socket.on('file:processed', (data) => {
  console.log('Received:', data);
});
```

### 네트워크 탭 확인

1. 브라우저 개발자 도구 → Network → WS
2. WebSocket 연결 확인
3. 메시지 송수신 확인

---

## 🚨 문제 해결

### 문제 1: WebSocket 연결 실패

**원인**: CORS 설정 또는 토큰 문제

**해결**:
```javascript
// 백엔드 socket/index.js에서 CORS 확인
cors: {
  origin: 'http://localhost:5173', // 프론트엔드 주소
  methods: ['GET', 'POST'],
  credentials: true
}
```

### 문제 2: 알림이 표시되지 않음

**원인**: 이벤트 리스너 미등록

**해결**:
```javascript
// WebSocketContext.jsx에서 이벤트 확인
socket.on('file:processed', (data) => {
  console.log('Event received:', data); // 로그 확인
});
```

### 문제 3: 브라우저 알림이 작동하지 않음

**원인**: 알림 권한 거부

**해결**:
```javascript
// 권한 재요청
Notification.requestPermission().then(permission => {
  console.log('Notification permission:', permission);
});
```

---

## ✅ 완료 체크리스트

- [ ] socket.io-client 설치 완료
- [ ] WebSocketContext 구현 완료
- [ ] ProcessingToast 컴포넌트 구현 완료
- [ ] fileApi.js 수정 완료 (썸네일 생성 제거)
- [ ] App.jsx에 WebSocketProvider 추가
- [ ] Gallery.jsx 안내 메시지 수정
- [ ] 환경 변수 설정 완료
- [ ] 로컬 테스트 성공
- [ ] WebSocket 연결 확인
- [ ] 파일 처리 완료 알림 수신 확인

---

## 🎉 완료!

이제 대용량 파일을 업로드해도:
- ✅ 브라우저 부담 없음
- ✅ 빠른 업로드 완료
- ✅ 백그라운드 처리
- ✅ 실시간 알림
- ✅ 브라우저 닫아도 OK

궁금한 점이나 문제가 발생하면 알려주세요!
