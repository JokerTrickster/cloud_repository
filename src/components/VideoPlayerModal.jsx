import React from 'react';
import { Share2, Download, ChevronLeft } from 'lucide-react';

const VideoPlayerModal = ({ video, onClose, onShare, onDownload }) => {
    if (!video) return null;

    return (
        <div
            onClick={onClose}
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
                    maxWidth: '90vw',
                    maxHeight: '90vh',
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
                    alignItems: 'center'
                }}>
                    {/* Share Button (Mobile) */}
                    {navigator.share && (
                        <button
                            onClick={() => onShare(video)}
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
                            onClick={() => onDownload(video)}
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
                <video
                    src={video.originalUrl || video.url}
                    controls
                    autoPlay
                    style={{
                        maxWidth: '100%',
                        maxHeight: '90vh',
                        borderRadius: '8px'
                    }}
                />
            </div>
        </div>
    );
};

export default VideoPlayerModal;
