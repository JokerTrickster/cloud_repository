import React from 'react';
import { Check, X, AlertCircle } from 'lucide-react';

const UploadProgressToast = ({ uploadState, onClose }) => {
    if (!uploadState) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            minWidth: '320px',
            maxWidth: '400px',
            zIndex: 10000,
            border: '1px solid var(--border)',
            overflow: 'hidden',
            animation: 'slideInUp 0.3s ease-out'
        }}>
            <style>{`
                @keyframes slideInUp {
                    from { transform: translateY(100px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>

            {/* Header */}
            <div style={{
                padding: '16px',
                background: uploadState.done
                    ? (uploadState.failed === 0 ? '#E6F4EA' : uploadState.error ? '#FEE2E2' : '#FFF8E1')
                    : 'linear-gradient(135deg, rgba(26, 115, 232, 0.05) 0%, rgba(79, 156, 249, 0.05) 100%)',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    {uploadState.done ? (
                        uploadState.error ? (
                            <AlertCircle size={20} color="#DC2626" />
                        ) : uploadState.failed === 0 ? (
                            <Check size={20} color="#4CAF50" />
                        ) : (
                            <Check size={20} color="#FBBC04" />
                        )
                    ) : (
                        <div style={{
                            width: '16px',
                            height: '16px',
                            border: '2px solid var(--primary)',
                            borderTopColor: 'transparent',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                        }} />
                    )}
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>
                        {uploadState.done
                            ? uploadState.error
                                ? '업로드 실패'
                                : uploadState.failed === 0
                                    ? '업로드 완료!'
                                    : '업로드 완료 (일부 실패)'
                            : '업로드 중...'}
                    </div>
                </div>
                <button
                    onClick={onClose}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        color: 'var(--text-secondary)'
                    }}
                >
                    <X size={16} />
                </button>
            </div>

            {/* Progress */}
            <div style={{ padding: '16px' }}>
                {!uploadState.done && (
                    <>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '12px'
                        }}>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                {uploadState.completed} / {uploadState.total} 파일 완료
                            </div>
                            <div style={{
                                fontSize: '20px',
                                fontWeight: '700',
                                color: 'var(--primary)'
                            }}>
                                {Math.round(
                                    Object.values(uploadState.progress).reduce((sum, val) => sum + val, 0) / uploadState.total || 0
                                )}%
                            </div>
                        </div>
                        <div style={{
                            height: '8px',
                            background: 'rgba(0,0,0,0.08)',
                            borderRadius: '4px',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                width: `${Object.values(uploadState.progress).reduce((sum, val) => sum + val, 0) / uploadState.total || 0}%`,
                                height: '100%',
                                background: 'linear-gradient(90deg, var(--primary) 0%, #4f9cf9 100%)',
                                transition: 'width 0.3s ease'
                            }} />
                        </div>

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
                    </>
                )}

                {uploadState.done && (
                    <div style={{
                        display: 'flex',
                        gap: '16px',
                        fontSize: '14px'
                    }}>
                        {uploadState.completed > 0 && (
                            <span style={{ color: '#4CAF50', fontWeight: '600' }}>
                                ✓ {uploadState.completed}개 성공
                            </span>
                        )}
                        {uploadState.failed > 0 && (
                            <span style={{ color: '#F44336', fontWeight: '600' }}>
                                ✗ {uploadState.failed}개 실패
                            </span>
                        )}
                    </div>
                )}

                {uploadState.error && (
                    <div style={{
                        marginTop: '8px',
                        fontSize: '12px',
                        color: '#DC2626',
                        background: '#FEE2E2',
                        padding: '8px',
                        borderRadius: '6px'
                    }}>
                        {uploadState.error}
                    </div>
                )}

                {uploadState.done && !uploadState.error && (
                    <div style={{
                        marginTop: '8px',
                        fontSize: '12px',
                        color: 'var(--text-tertiary)'
                    }}>
                        5초 후 자동으로 닫힙니다...
                    </div>
                )}
            </div>
        </div>
    );
};

export default UploadProgressToast;
