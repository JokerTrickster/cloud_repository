import React, { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Debug Logger Component - 모바일에서 콘솔 로그를 화면에 표시
 * 개발 환경에서만 활성화
 */
const DebugLogger = () => {
    const [logs, setLogs] = useState([]);
    const [isExpanded, setIsExpanded] = useState(true); // 기본적으로 확장된 상태
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        console.log('🔧 DebugLogger mounted!');
        console.log('🔧 Environment:', import.meta.env.MODE);
        console.log('🔧 Is production?', import.meta.env.PROD);

        // 개발 환경에서만 활성화
        if (import.meta.env.PROD) {
            console.log('🔧 DebugLogger disabled in production');
            return;
        }

        // 콘솔 로그를 가로채서 화면에 표시
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;

        const addLog = (type, args) => {
            const message = args.map(arg => {
                if (typeof arg === 'object') {
                    try {
                        return JSON.stringify(arg, null, 2);
                    } catch {
                        return String(arg);
                    }
                }
                return String(arg);
            }).join(' ');

            const timestamp = new Date().toLocaleTimeString();

            setLogs(prev => {
                const newLogs = [...prev, { type, message, timestamp }];
                // 최대 50개까지만 유지
                return newLogs.slice(-50);
            });
        };

        console.log = (...args) => {
            originalLog(...args);
            // 모든 로그를 표시 (디버깅을 위해)
            addLog('log', args);
        };

        console.error = (...args) => {
            originalError(...args);
            addLog('error', args);
        };

        console.warn = (...args) => {
            originalWarn(...args);
            // 모든 경고를 표시
            addLog('warn', args);
        };

        // 클린업
        return () => {
            console.log = originalLog;
            console.error = originalError;
            console.warn = originalWarn;
        };
    }, []);

    if (import.meta.env.PROD || !isVisible) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: '0',
            left: '0',
            right: '0',
            zIndex: 99999,
            background: 'rgba(0, 0, 0, 0.98)',
            color: '#00ff00',
            fontFamily: 'monospace',
            fontSize: '12px',
            maxHeight: isExpanded ? '60vh' : '50px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 -4px 20px rgba(0, 255, 0, 0.3)',
            transition: 'all 0.3s ease',
            border: '2px solid #00ff00'
        }}>
            {/* Header */}
            <div style={{
                padding: '8px 12px',
                background: 'rgba(0, 0, 0, 1)',
                borderBottom: isExpanded ? '1px solid rgba(0, 255, 0, 0.3)' : 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer'
            }} onClick={() => setIsExpanded(!isExpanded)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                    <span style={{ fontWeight: 'bold', color: '#00ff00' }}>
                        Debug Log ({logs.length})
                    </span>
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsVisible(false);
                    }}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#ff4444',
                        cursor: 'pointer',
                        padding: '4px'
                    }}
                >
                    <X size={16} />
                </button>
            </div>

            {/* Logs */}
            {isExpanded && (
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '8px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                }}>
                    {logs.length === 0 ? (
                        <div style={{ color: '#666', fontStyle: 'italic' }}>
                            대기 중... (업로드 시작 시 로그가 표시됩니다)
                        </div>
                    ) : (
                        logs.map((log, index) => (
                            <div key={index} style={{
                                padding: '4px 8px',
                                background: log.type === 'error'
                                    ? 'rgba(255, 0, 0, 0.1)'
                                    : log.type === 'warn'
                                    ? 'rgba(255, 255, 0, 0.1)'
                                    : 'rgba(0, 255, 0, 0.05)',
                                borderLeft: `2px solid ${
                                    log.type === 'error' ? '#ff4444' :
                                    log.type === 'warn' ? '#ffaa00' :
                                    '#00ff00'
                                }`,
                                borderRadius: '2px',
                                wordBreak: 'break-all'
                            }}>
                                <div style={{
                                    color: log.type === 'error' ? '#ff6666' :
                                           log.type === 'warn' ? '#ffbb44' :
                                           '#00ff00',
                                    fontSize: '9px',
                                    marginBottom: '2px'
                                }}>
                                    [{log.timestamp}] {log.type.toUpperCase()}
                                </div>
                                <div style={{
                                    color: log.type === 'error' ? '#ffcccc' :
                                           log.type === 'warn' ? '#ffeeaa' :
                                           '#ccffcc',
                                    whiteSpace: 'pre-wrap'
                                }}>
                                    {log.message}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Clear Button */}
            {isExpanded && logs.length > 0 && (
                <button
                    onClick={() => setLogs([])}
                    style={{
                        padding: '8px',
                        background: 'rgba(255, 0, 0, 0.2)',
                        border: 'none',
                        color: '#ff6666',
                        cursor: 'pointer',
                        fontSize: '11px',
                        borderTop: '1px solid rgba(255, 0, 0, 0.3)'
                    }}
                >
                    Clear Logs
                </button>
            )}
        </div>
    );
};

export default DebugLogger;
