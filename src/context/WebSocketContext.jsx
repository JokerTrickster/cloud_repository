import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

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
    const token = localStorage.getItem('accessToken');

    if (!token) {
      console.log('[WebSocket] No access token, skipping connection');
      return;
    }

    // WebSocket 연결 (백엔드 URL + token)
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:18080';
    const socketUrl = `${wsUrl}/ws?token=${token}`;

    console.log('[WebSocket] Connecting to:', socketUrl);

    const newSocket = io(wsUrl, {
      path: '/ws',
      query: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    newSocket.on('connect', () => {
      console.log('✅ [WebSocket] Connected');
      setIsConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log(`❌ [WebSocket] Disconnected: ${reason}`);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error);
    });

    // 파일 처리 완료 이벤트
    newSocket.on('file:processed', (data) => {
      console.log('✅ [WebSocket] File processed:', data);

      // 브라우저 알림 (권한이 있는 경우)
      if (Notification.permission === 'granted') {
        new Notification('파일 처리 완료', {
          body: `${data.fileName || '파일'}이 성공적으로 처리되었습니다.`,
          icon: '/icon.png'
        });
      }

      // 토스트 알림 추가
      const notification = {
        id: Date.now(),
        type: 'success',
        title: '파일 처리 완료',
        message: data.fileName || '파일이 성공적으로 처리되었습니다.',
        fileId: data.fileId,
        data
      };

      setNotifications(prev => [...prev, notification]);

      // 5초 후 자동 제거
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 5000);

      // 갤러리 새로고침 트리거 (커스텀 이벤트)
      window.dispatchEvent(new CustomEvent('file:processed', { detail: data }));
    });

    // 파일 처리 실패 이벤트
    newSocket.on('file:processing-failed', (data) => {
      console.error('❌ [WebSocket] File processing failed:', data);

      const notification = {
        id: Date.now(),
        type: 'error',
        title: '파일 처리 실패',
        message: data.error || '파일 처리에 실패했습니다.',
        fileId: data.fileId,
        data
      };

      setNotifications(prev => [...prev, notification]);

      // 10초 후 자동 제거
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 10000);
    });

    setSocket(newSocket);

    // 브라우저 알림 권한 요청
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('[Notification] Permission:', permission);
      });
    }

    return () => {
      console.log('[WebSocket] Cleaning up connection');
      newSocket.close();
    };
  // BUG FIX #2: WebSocket Memory Leak
  // Add token to dependency array to ensure cleanup on token change
  }, [token]); // token was missing from dependency array

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

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
