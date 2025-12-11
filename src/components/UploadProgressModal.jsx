import React, { useMemo } from 'react';
import { Check, X, AlertCircle, Upload, FileIcon, Image, Video } from 'lucide-react';

const UploadProgressModal = ({ uploadState, onClose }) => {
    // Calculate overall progress - hooks must be called before any early return
    const overallProgress = useMemo(() => {
        if (!uploadState || !uploadState.progress || uploadState.total === 0) return 0;
        const totalProgress = Object.values(uploadState.progress).reduce((sum, val) => sum + val, 0);
        return Math.round(totalProgress / uploadState.total);
    }, [uploadState]);

    // Group files by status for better display
    const { uploadingFiles, completedFiles, failedFiles } = useMemo(() => {
        if (!uploadState || !uploadState.files) {
            return { uploadingFiles: [], completedFiles: [], failedFiles: [] };
        }

        const uploading = [];
        const completed = [];
        const failed = [];

        uploadState.files.forEach((file, index) => {
            const progress = uploadState.progress?.[index] || 0;
            const fileWithProgress = { ...file, index, progress };

            if (progress === 100) {
                completed.push(fileWithProgress);
            } else if (progress === -1 || (uploadState.done && progress < 100)) {
                failed.push(fileWithProgress);
            } else {
                uploading.push(fileWithProgress);
            }
        });

        return { uploadingFiles: uploading, completedFiles: completed, failedFiles: failed };
    }, [uploadState]);

    // Early return after all hooks
    if (!uploadState) return null;

    // Format file size
    const formatFileSize = (bytes) => {
        if (!bytes) return '0 B';
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
    };

    // Get file icon based on name
    const getFileIcon = (fileName) => {
        const ext = fileName?.split('.').pop()?.toLowerCase() || '';
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'].includes(ext)) {
            return <Image size={16} />;
        }
        if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) {
            return <Video size={16} />;
        }
        return <FileIcon size={16} />;
    };

    return (
        <>
            {/* Backdrop */}
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.6)',
                    zIndex: 10000,
                    backdropFilter: 'blur(4px)'
                }}
                onClick={uploadState.done ? onClose : undefined}
            />

            {/* Modal */}
            <div style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'var(--surface, white)',
                borderRadius: '16px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                width: 'min(90vw, 500px)',
                maxHeight: '85vh',
                zIndex: 10001,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                animation: 'modalSlideIn 0.3s ease-out'
            }}>
                <style>{`
                    @keyframes modalSlideIn {
                        from { transform: translate(-50%, -50%) scale(0.9); opacity: 0; }
                        to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.5; }
                    }
                    .upload-file-item:hover {
                        background: var(--background, #f5f5f5) !important;
                    }
                `}</style>

                {/* Header - Sticky */}
                <div style={{
                    padding: '20px',
                    background: uploadState.done
                        ? (uploadState.failed === 0 ? '#E8F5E9' : uploadState.error ? '#FFEBEE' : '#FFF8E1')
                        : 'linear-gradient(135deg, #1a73e8 0%, #4f9cf9 100%)',
                    color: uploadState.done ? 'inherit' : 'white',
                    flexShrink: 0
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '16px'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                        }}>
                            {uploadState.done ? (
                                uploadState.error ? (
                                    <AlertCircle size={28} color="#D32F2F" />
                                ) : uploadState.failed === 0 ? (
                                    <Check size={28} color="#388E3C" />
                                ) : (
                                    <AlertCircle size={28} color="#F9A825" />
                                )
                            ) : (
                                <div style={{
                                    width: '28px',
                                    height: '28px',
                                    border: '3px solid white',
                                    borderTopColor: 'transparent',
                                    borderRadius: '50%',
                                    animation: 'spin 1s linear infinite'
                                }} />
                            )}
                            <div>
                                <div style={{
                                    fontWeight: '700',
                                    fontSize: '18px',
                                    color: uploadState.done ? 'var(--text-primary, #333)' : 'white'
                                }}>
                                    {uploadState.done
                                        ? uploadState.error
                                            ? '업로드 실패'
                                            : uploadState.failed === 0
                                                ? '업로드 완료!'
                                                : '업로드 완료 (일부 실패)'
                                        : '파일 업로드 중...'}
                                </div>
                                <div style={{
                                    fontSize: '14px',
                                    opacity: 0.9,
                                    marginTop: '2px',
                                    color: uploadState.done ? 'var(--text-secondary, #666)' : 'rgba(255,255,255,0.9)'
                                }}>
                                    {uploadState.completed} / {uploadState.total} 파일 완료
                                    {uploadState.failed > 0 && ` (${uploadState.failed}개 실패)`}
                                </div>
                            </div>
                        </div>

                        {uploadState.done && (
                            <button
                                onClick={onClose}
                                style={{
                                    background: 'rgba(0,0,0,0.1)',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '36px',
                                    height: '36px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--text-secondary, #666)'
                                }}
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>

                    {/* Overall Progress Bar */}
                    {!uploadState.done && (
                        <div>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '8px'
                            }}>
                                <span style={{ fontSize: '13px', opacity: 0.9 }}>전체 진행률</span>
                                <span style={{ fontSize: '20px', fontWeight: '700' }}>{overallProgress}%</span>
                            </div>
                            <div style={{
                                height: '10px',
                                background: 'rgba(255,255,255,0.3)',
                                borderRadius: '5px',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    width: `${overallProgress}%`,
                                    height: '100%',
                                    background: 'white',
                                    borderRadius: '5px',
                                    transition: 'width 0.3s ease'
                                }} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Warning Message */}
                {!uploadState.done && (
                    <div style={{
                        padding: '12px 20px',
                        background: '#FFF3E0',
                        borderBottom: '1px solid #FFE0B2',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '14px',
                        color: '#E65100',
                        flexShrink: 0
                    }}>
                        <span style={{ fontSize: '18px' }}>⚠️</span>
                        <span style={{ fontWeight: '500' }}>업로드 중 화면을 끄거나 페이지를 벗어나지 마세요</span>
                    </div>
                )}

                {/* File List - Scrollable */}
                <div style={{
                    flex: 1,
                    overflow: 'auto',
                    padding: '12px 0'
                }}>
                    {/* Currently Uploading Files */}
                    {uploadingFiles.length > 0 && (
                        <div style={{ marginBottom: '8px' }}>
                            <div style={{
                                padding: '8px 20px',
                                fontSize: '12px',
                                fontWeight: '600',
                                color: 'var(--text-secondary, #666)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>
                                업로드 중 ({uploadingFiles.length})
                            </div>
                            {uploadingFiles.map((file) => (
                                <div
                                    key={file.index}
                                    className="upload-file-item"
                                    style={{
                                        padding: '12px 20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        transition: 'background 0.2s'
                                    }}
                                >
                                    <div style={{ color: 'var(--primary, #1a73e8)', flexShrink: 0 }}>
                                        {getFileIcon(file.name)}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontSize: '14px',
                                            fontWeight: '500',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            marginBottom: '6px',
                                            color: 'var(--text-primary, #333)'
                                        }}>
                                            {file.name}
                                        </div>
                                        <div style={{
                                            height: '4px',
                                            background: 'var(--background, #e0e0e0)',
                                            borderRadius: '2px',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{
                                                width: `${file.progress}%`,
                                                height: '100%',
                                                background: 'var(--primary, #1a73e8)',
                                                borderRadius: '2px',
                                                transition: 'width 0.3s ease'
                                            }} />
                                        </div>
                                    </div>
                                    <div style={{
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        color: 'var(--primary, #1a73e8)',
                                        minWidth: '45px',
                                        textAlign: 'right'
                                    }}>
                                        {file.progress}%
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Completed Files */}
                    {completedFiles.length > 0 && (
                        <div style={{ marginBottom: '8px' }}>
                            <div style={{
                                padding: '8px 20px',
                                fontSize: '12px',
                                fontWeight: '600',
                                color: '#388E3C',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                                <Check size={14} />
                                완료 ({completedFiles.length})
                            </div>
                            {completedFiles.slice(0, 5).map((file) => (
                                <div
                                    key={file.index}
                                    className="upload-file-item"
                                    style={{
                                        padding: '10px 20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        opacity: 0.7
                                    }}
                                >
                                    <div style={{ color: '#388E3C', flexShrink: 0 }}>
                                        <Check size={16} />
                                    </div>
                                    <div style={{
                                        flex: 1,
                                        fontSize: '13px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        color: 'var(--text-secondary, #666)'
                                    }}>
                                        {file.name}
                                    </div>
                                    <div style={{
                                        fontSize: '12px',
                                        color: 'var(--text-tertiary, #999)'
                                    }}>
                                        {formatFileSize(file.size)}
                                    </div>
                                </div>
                            ))}
                            {completedFiles.length > 5 && (
                                <div style={{
                                    padding: '8px 20px',
                                    fontSize: '12px',
                                    color: 'var(--text-tertiary, #999)',
                                    textAlign: 'center'
                                }}>
                                    외 {completedFiles.length - 5}개 파일 완료
                                </div>
                            )}
                        </div>
                    )}

                    {/* Failed Files */}
                    {failedFiles.length > 0 && (
                        <div>
                            <div style={{
                                padding: '8px 20px',
                                fontSize: '12px',
                                fontWeight: '600',
                                color: '#D32F2F',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                                <X size={14} />
                                실패 ({failedFiles.length})
                            </div>
                            {failedFiles.map((file) => (
                                <div
                                    key={file.index}
                                    className="upload-file-item"
                                    style={{
                                        padding: '10px 20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        background: '#FFF5F5'
                                    }}
                                >
                                    <div style={{ color: '#D32F2F', flexShrink: 0 }}>
                                        <AlertCircle size={16} />
                                    </div>
                                    <div style={{
                                        flex: 1,
                                        fontSize: '13px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        color: '#D32F2F'
                                    }}>
                                        {file.name}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Empty State (shouldn't happen normally) */}
                    {uploadingFiles.length === 0 && completedFiles.length === 0 && failedFiles.length === 0 && (
                        <div style={{
                            padding: '40px 20px',
                            textAlign: 'center',
                            color: 'var(--text-tertiary, #999)'
                        }}>
                            <Upload size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                            <div>파일을 준비하는 중...</div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '16px 20px',
                    borderTop: '1px solid var(--border, #e0e0e0)',
                    background: 'var(--surface, white)',
                    flexShrink: 0
                }}>
                    {uploadState.done ? (
                        <button
                            onClick={onClose}
                            style={{
                                width: '100%',
                                padding: '14px',
                                background: 'var(--primary, #1a73e8)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '15px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'opacity 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                        >
                            확인
                        </button>
                    ) : (
                        <div style={{
                            textAlign: 'center',
                            fontSize: '13px',
                            color: 'var(--text-tertiary, #999)'
                        }}>
                            {uploadState.total > 10 && (
                                <div style={{ marginBottom: '4px' }}>
                                    대용량 업로드 중입니다. 잠시만 기다려주세요.
                                </div>
                            )}
                            <div style={{ animation: 'pulse 2s ease-in-out infinite' }}>
                                업로드가 완료될 때까지 이 창을 닫지 마세요
                            </div>
                        </div>
                    )}
                </div>

                {/* Error Details */}
                {uploadState.error && (
                    <div style={{
                        padding: '12px 20px',
                        background: '#FFEBEE',
                        borderTop: '1px solid #FFCDD2',
                        fontSize: '13px',
                        color: '#C62828'
                    }}>
                        <strong>오류:</strong> {uploadState.error}
                    </div>
                )}
            </div>
        </>
    );
};

export default UploadProgressModal;
