import React, { useState } from 'react';
import { Share2, Download, ChevronLeft } from 'lucide-react';

const ImageViewerModal = ({ image, onClose, onShare, onDownload }) => {
    const [imageLoading, setImageLoading] = useState(true);

    if (!image) return null;

    return (
        <div
            onClick={onClose}
            onKeyDown={(e) => {
                if (e.key === 'Escape') {
                    onClose();
                }
            }}
            tabIndex={0}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.9)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px'
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    maxWidth: '95vw',
                    maxHeight: '95vh',
                    position: 'relative'
                }}
            >
                {/* Action Buttons */}
                <div style={{
                    position: 'absolute',
                    top: '-40px',
                    right: '0',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                    zIndex: 10
                }}>
                    {/* Share Button (Mobile) */}
                    {navigator.share && (
                        <button
                            onClick={() => onShare(image)}
                            style={{
                                background: 'rgba(255,255,255,0.1)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: '8px',
                                color: 'white',
                                cursor: 'pointer',
                                padding: '8px 12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '14px',
                                fontWeight: '500'
                            }}
                        >
                            <Share2 size={18} />
                            공유
                        </button>
                    )}
                    {/* Download Button (Desktop) */}
                    {!navigator.share && (
                        <button
                            onClick={() => onDownload(image)}
                            style={{
                                background: 'rgba(255,255,255,0.1)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: '8px',
                                color: 'white',
                                cursor: 'pointer',
                                padding: '8px 12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '14px',
                                fontWeight: '500'
                            }}
                        >
                            <Download size={18} />
                            다운로드
                        </button>
                    )}
                    {/* Back/Close Button */}
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.1)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '8px',
                            color: 'white',
                            cursor: 'pointer',
                            padding: '8px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '14px',
                            fontWeight: '500'
                        }}
                    >
                        <ChevronLeft size={18} />
                        뒤로가기
                    </button>
                </div>

                {/* Loading state */}
                {imageLoading && (
                    <>
                        {/* Thumbnail placeholder (shows immediately) */}
                        <img
                            src={image.url}
                            alt={image.name}
                            style={{
                                maxWidth: '100%',
                                maxHeight: '95vh',
                                objectFit: 'contain',
                                borderRadius: '8px',
                                filter: 'blur(8px)',
                                opacity: 0.5
                            }}
                        />

                        {/* Loading overlay */}
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            zIndex: 10,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '16px',
                            background: 'rgba(0,0,0,0.7)',
                            padding: '24px 32px',
                            borderRadius: '12px',
                            backdropFilter: 'blur(10px)'
                        }}>
                            <div style={{
                                width: '64px',
                                height: '64px',
                                border: '4px solid rgba(255,255,255,0.2)',
                                borderTopColor: 'white',
                                borderRadius: '50%',
                                animation: 'spin 0.8s linear infinite'
                            }} />
                            <div style={{
                                color: 'white',
                                fontSize: '14px',
                                fontWeight: '500'
                            }}>
                                원본 이미지 로딩 중...
                            </div>
                        </div>
                    </>
                )}

                {/* Original image (loads in background) */}
                <img
                    src={image.originalUrl || image.url}
                    alt={image.name}
                    onLoad={() => setImageLoading(false)}
                    style={{
                        maxWidth: '100%',
                        maxHeight: '95vh',
                        objectFit: 'contain',
                        borderRadius: '8px',
                        opacity: imageLoading ? 0 : 1,
                        transition: 'opacity 0.3s ease-in-out',
                        position: imageLoading ? 'absolute' : 'relative',
                        top: 0,
                        left: 0
                    }}
                />
            </div>
        </div>
    );
};

export default ImageViewerModal;
