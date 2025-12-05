import React, { useState, useEffect, memo, useRef } from 'react';
import { Play, Check, MoreVertical, Star } from 'lucide-react';
import ProcessingIndicator from './ProcessingIndicator';
import { formatDuration } from '../utils/thumbnail';

/**
 * Memoized Media Component to prevent re-renders when overlay props change
 */
/**
 * Memoized Media Component to prevent re-renders when overlay props change
 */
const GalleryItemMedia = memo(({ url, type, duration, processing_status, name, isHovered, isSelectionMode, isSelected, index, onLoad }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const imgRef = useRef(null);
    const videoRef = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && imgRef.current) {
                        const img = imgRef.current;
                        if (!img.src || img.src.includes('data:image')) {
                            img.src = url;
                        }
                    }
                });
            },
            {
                rootMargin: '50px',
                threshold: 0.01
            }
        );

        if (imgRef.current) {
            observer.observe(imgRef.current);
        }

        return () => {
            if (imgRef.current) {
                observer.unobserve(imgRef.current);
            }
        };
    }, [url]);

    const handleLoad = () => {
        setIsLoaded(true);
        if (onLoad) onLoad();
    };

    return (
        <>
            {/* Loading Placeholder */}
            {!isLoaded && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.5s infinite'
                }} />
            )}

            <img
                ref={imgRef}
                src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
                alt={name}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transition: 'opacity 0.3s ease-in-out',
                    opacity: isLoaded ? (isSelectionMode && isSelected ? 0.7 : 1) : 0
                }}
                loading="lazy"
                decoding="async"
                fetchPriority={index < 6 ? 'high' : 'low'}
                onLoad={handleLoad}
                onError={(e) => {
                    if (!e.target.src.includes(url)) {
                        e.target.src = url;
                    }
                }}
            />

            {/* Video Preview Overlay */}
            {isHovered && type === 'video' && (
                <video
                    ref={videoRef}
                    src={url}
                    autoPlay
                    muted
                    loop
                    playsInline
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        zIndex: 2
                    }}
                />
            )}

            {/* Video Indicator & Duration */}
            {type === 'video' && (
                <>
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '12px', // Reduced to ~half of 20px
                        height: '12px',
                        borderRadius: '50%',
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backdropFilter: 'blur(4px)',
                        zIndex: 2 // Ensure it stays on top of video preview if desired, or let hover hide it? User said "fixed", so maybe zIndex 3?
                        // Actually user said "disappears when state changes", implying re-render issue.
                        // But if they want it "fixed", they might mean "always visible".
                        // If I put zIndex 3, it will be on top of the playing video.
                        // Usually play icon disappears when playing.
                        // "동영상은 고정으로 박아둬야되는데 왜 자꾸 상태 변경할때마다 사라지는지 궁금하다"
                        // "Video (icon) should be fixed, why does it disappear whenever state changes?"
                        // This strongly suggests the re-render issue.
                        // If I remove !isHovered, it will show during hover/play.
                        // Let's keep it simple: remove !isHovered.
                    }}>
                        <Play size={8} fill="white" color="white" style={{ marginLeft: '1px' }} />
                    </div>
                    {duration && (
                        <div style={{
                            position: 'absolute',
                            bottom: '8px',
                            right: '8px',
                            background: 'rgba(0,0,0,0.7)',
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '500',
                            zIndex: 2
                        }}>
                            {formatDuration(duration)}
                        </div>
                    )}
                </>
            )}

            {/* Processing Indicator */}
            {(processing_status === 'processing' ||
                processing_status === 'pending' ||
                processing_status === 'failed') && (
                    <div style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        maxWidth: 'calc(100% - 16px)',
                        zIndex: 3
                    }}>
                        <ProcessingIndicator file={{ processing_status }} compact={true} />
                    </div>
                )}
        </>
    );
});

GalleryItemMedia.displayName = 'GalleryItemMedia';

/**
 * Memoized Gallery Item Component with Lazy Loading
 * 개별 파일 카드 컴포넌트 (이미지/비디오)
 */
const GalleryItem = memo(({ file, isSelectionMode, isSelected, onToggle, searchTerm, onLoad, index, onOpenOptions, onToggleFavorite }) => {
    const [isHovered, setIsHovered] = useState(false);

    // 디버깅: 동영상 파일 렌더링 정보
    if (file.type === 'video') {
        console.log('[GalleryItem] Rendering video:', {
            name: file.name,
            url: file.url,
            originalUrl: file.originalUrl,
            processing_status: file.processing_status,
            isPlaceholder: file.url?.includes('placeholder')
        });
    }

    // Handle hover for video preview and image preload
    const handleMouseEnter = () => {
        if (!isSelectionMode) {
            setIsHovered(true);
            if (file.type === 'image' && file.originalUrl) {
                // Preload original image on hover
                const img = new Image();
                img.src = file.originalUrl;
            }
        }
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
    };

    return (
        <div
            onClick={(e) => {
                if (isSelectionMode) {
                    onToggle(file.id);
                } else if (file.type === 'video') {
                    e.stopPropagation();
                    setIsHovered(false);
                    if (window.openVideoPlayer) {
                        window.openVideoPlayer(file);
                    }
                } else if (file.type === 'image') {
                    e.stopPropagation();
                    setIsHovered(false);
                    if (window.openImageViewer) {
                        window.openImageViewer(file);
                    }
                }
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{
                position: 'relative',
                paddingBottom: '100%',
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden',
                background: '#eee',
                cursor: 'pointer',
                border: isSelectionMode && isSelected ? '3px solid var(--primary)' : 'none',
                transform: isHovered && !isSelectionMode ? 'scale(1.05)' : 'scale(1)',
                transition: 'transform 0.2s ease-in-out',
                zIndex: isHovered ? 10 : 1
            }}
        >
            <GalleryItemMedia
                url={file.url}
                type={file.type}
                duration={file.duration}
                processing_status={file.processing_status}
                name={file.name}
                isHovered={isHovered}
                isSelectionMode={isSelectionMode}
                isSelected={isSelected}
                index={index}
                onLoad={onLoad}
            />

            {/* Tag Overlay - Hide on hover for cleaner view */}
            {!isHovered && (
                <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '4px',
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                    display: 'flex',
                    gap: '3px',
                    flexWrap: 'wrap',
                    justifyContent: 'flex-start',
                    alignItems: 'flex-end'
                }}>
                    <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', flex: 1 }}>
                        {file.tags.map(tag => (
                            <span key={tag} style={{
                                fontSize: '9px',
                                color: 'white',
                                background: searchTerm === `#${tag}` ? 'var(--primary)' : 'rgba(0,0,0,0.6)',
                                padding: '2px 5px',
                                borderRadius: '3px',
                                backdropFilter: 'blur(2px)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                fontWeight: '500'
                            }}>
                                #{tag}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* More Options Menu Button - Always Visible for Mobile Accessibility */}
            {!isSelectionMode && (
                <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    zIndex: 20
                }} onClick={e => e.stopPropagation()}>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenOptions) {
                                onOpenOptions(file);
                            }
                        }}
                        style={{
                            background: 'rgba(0,0,0,0.6)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '50%',
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            backdropFilter: 'blur(4px)',
                            color: 'white'
                        }}
                    >
                        <MoreVertical size={12} />
                    </button>
                </div>
            )}

            {/* Selection Indicator */}
            {isSelectionMode && (
                <div style={{
                    position: 'absolute',
                    top: '6px',
                    right: '6px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.8)',
                    border: '1.5px solid white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    zIndex: 20
                }}>
                    {isSelected && <Check size={12} color="white" />}
                </div>
            )}

            {/* Favorite Icon */}
            {!isSelectionMode && (
                <div
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onToggleFavorite) {
                            onToggleFavorite(file.id, file.isFavorite);
                        }
                    }}
                    style={{
                        position: 'absolute',
                        top: '8px',
                        left: '8px',
                        zIndex: 20,
                        cursor: 'pointer',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: file.isFavorite ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0,0,0,0.3)',
                        backdropFilter: 'blur(2px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <Star
                        size={12}
                        fill={file.isFavorite ? "#FFD700" : "none"}
                        color={file.isFavorite ? "#FFD700" : "white"}
                        strokeWidth={file.isFavorite ? 0 : 2}
                    />
                </div>
            )}
        </div>
    );
});

GalleryItem.displayName = 'GalleryItem';

export default GalleryItem;
