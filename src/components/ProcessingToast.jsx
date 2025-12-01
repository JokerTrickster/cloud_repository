import React from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import { X, CheckCircle, AlertCircle, Wifi, WifiOff } from 'lucide-react';

const ProcessingToast = () => {
  const { notifications, isConnected, removeNotification } = useWebSocket();

  return (
    <>
      {/* WebSocket 연결 상태 표시 (개발 모드에서만) */}
      {import.meta.env.DEV && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          background: isConnected ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
          border: `1px solid ${isConnected ? '#4CAF50' : '#F44336'}`,
          borderRadius: '8px',
          fontSize: '12px',
          color: isConnected ? '#4CAF50' : '#F44336'
        }}>
          {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
          <span>{isConnected ? 'WebSocket 연결됨' : 'WebSocket 연결 끊김'}</span>
        </div>
      )}

      {/* 알림 토스트 */}
      {notifications.length > 0 && (
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
                alignItems: 'flex-start',
                gap: '12px',
                animation: 'slideInUp 0.3s ease-out'
              }}
            >
              <div style={{ flexShrink: 0, marginTop: '2px' }}>
                {notification.type === 'success' ? (
                  <CheckCircle size={20} />
                ) : (
                  <AlertCircle size={20} />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>
                  {notification.title}
                </div>
                <div style={{ fontSize: '13px', opacity: 0.9 }}>
                  {notification.message}
                </div>
                {notification.data && notification.data.duration && (
                  <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.7 }}>
                    길이: {Math.floor(notification.data.duration / 60)}:{String(Math.floor(notification.data.duration % 60)).padStart(2, '0')}
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
                  color: 'inherit',
                  flexShrink: 0
                }}
              >
                <X size={16} />
              </button>
            </div>
          ))}

          <style>{`
            @keyframes slideInUp {
              from {
                transform: translateY(100px);
                opacity: 0;
              }
              to {
                transform: translateY(0);
                opacity: 1;
              }
            }
          `}</style>
        </div>
      )}
    </>
  );
};

export default ProcessingToast;
