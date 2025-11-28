import React from 'react';
import { useUpload } from '../context/UploadContext';
import { X, Check, AlertCircle, Minimize2, Maximize2, Loader } from 'lucide-react';

const GlobalUploadToast = () => {
    const { uploadState, closeUpload, minimizeUpload, maximizeUpload } = useUpload();

    if (!uploadState) return null;

    const { files, progress, total, completed, failed, isUploading, done, error, isMinimized } = uploadState;

    // Calculate total percentage
    const totalPercent = Math.round(
        Object.values(progress).reduce((sum, item) => sum + item.percent, 0) / total || 0
    );

    if (isMinimized) {
        return (
            <div style={{
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                background: 'white',
                borderRadius: '50%',
                width: '56px',
                height: '56px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 10000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                border: '1px solid var(--border)'
            }} onClick={maximizeUpload}>
                {isUploading ? (
                    <div style={{ position: 'relative', width: '24px', height: '24px' }}>
                        <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                            <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="#eee"
                                strokeWidth="4"
                            />
                            <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="var(--primary)"
                                strokeWidth="4"
                                strokeDasharray={`${totalPercent}, 100`}
                            />
                        </svg>
                    </div>
                ) : (
                    <Check size={24} color="#4CAF50" />
                )}
            </div>
        );
    }

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
            `}</style>

            {/* Header */}
            <div style={{
                padding: '16px',
                background: done
                    ? (failed === 0 ? '#E6F4EA' : error ? '#FEE2E2' : '#FFF8E1')
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
                    {done ? (
                        error ? (
                            <AlertCircle size={20} color="#DC2626" />
                        ) : failed === 0 ? (
                            <Check size={20} color="#4CAF50" />
                        ) : (
                            <Check size={20} color="#FBBC04" />
                        )
                    ) : (
                        <Loader size={16} className="spin" color="var(--primary)" />
                    )}
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>
                        {done
                            ? error
                                ? '업로드 실패'
                                : failed === 0
                                    ? '업로드 완료!'
                                    : '업로드 완료 (일부 실패)'
                            : '업로드 중...'}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                        onClick={minimizeUpload}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            color: 'var(--text-secondary)'
                        }}
                    >
                        <Minimize2 size={16} />
                    </button>
                    <button
                        onClick={closeUpload}
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
            </div>

            {/* Progress */}
            <div style={{ padding: '16px' }}>
                {!done && (
                    <>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '12px'
                        }}>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                {Object.values(progress).filter(p => p.percent === 100).length} / {total} 파일 완료
                            </div>
                            <div style={{
                                fontSize: '20px',
                                fontWeight: '700',
                                color: 'var(--primary)'
                            }}>
                                {totalPercent}%
                            </div>
                        </div>
                        <div style={{
                            height: '8px',
                            background: 'rgba(0,0,0,0.08)',
                            borderRadius: '4px',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                width: `${totalPercent}%`,
                                height: '100%',
                                background: 'linear-gradient(90deg, var(--primary) 0%, #4f9cf9 100%)',
                                transition: 'width 0.3s ease'
                            }} />
                        </div>
                        {/* Current File Status */}
                        <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {files.find((_, i) => progress[i]?.status === 'uploading')?.name ?
                                `업로드 중: ${files.find((_, i) => progress[i]?.status === 'uploading')?.name}` :
                                files.find((_, i) => progress[i]?.status === 'processing')?.name ?
                                    `처리 중 (썸네일): ${files.find((_, i) => progress[i]?.status === 'processing')?.name}` :
                                    '대기 중...'
                            }
                        </div>
                    </>
                )}

                {done && (
                    <div style={{
                        display: 'flex',
                        gap: '16px',
                        fontSize: '14px'
                    }}>
                        {completed > 0 && (
                            <span style={{ color: '#4CAF50', fontWeight: '600' }}>
                                ✓ {completed}개 성공
                            </span>
                        )}
                        {failed > 0 && (
                            <span style={{ color: '#F44336', fontWeight: '600' }}>
                                ✗ {failed}개 실패
                            </span>
                        )}
                    </div>
                )}

                {error && (
                    <div style={{
                        marginTop: '8px',
                        fontSize: '12px',
                        color: '#DC2626',
                        background: '#FEE2E2',
                        padding: '8px',
                        borderRadius: '6px'
                    }}>
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
};

export default GlobalUploadToast;
