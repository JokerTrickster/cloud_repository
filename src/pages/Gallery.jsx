import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import fileApi from '../api/fileApi';
import FileUpload from '../components/FileUpload';
import TagEditModal from '../components/TagEditModal';
import OptionsModal from '../components/OptionsModal';
import DateRangeCalendar from '../components/DateRangeCalendar';
import VideoPlayerModal from '../components/VideoPlayerModal';
import ImageViewerModal from '../components/ImageViewerModal';
import SelectionActionBar from '../components/SelectionActionBar';
import GalleryFilters from '../components/GalleryFilters';
import GalleryToolbar from '../components/GalleryToolbar';
import GallerySearchBar from '../components/GallerySearchBar';
import TagFilterBar from '../components/TagFilterBar';
import GalleryGrid from '../components/GalleryGrid';
import { useGalleryFiles } from '../hooks/useGalleryFiles';
import useFileProcessingMonitor from '../hooks/useFileProcessingMonitor';

const Gallery = () => {
    const location = useLocation();
    const { files, setFiles, loading, error, tags, setTags, loadFiles, handleImageLoad } = useGalleryFiles();
    const [searchTerm, setSearchTerm] = useState('');
    const [playingVideo, setPlayingVideo] = useState(null);
    const [viewingImage, setViewingImage] = useState(null);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [sortOption, setSortOption] = useState('latest'); // latest, oldest, name, size
    const [filterType, setFilterType] = useState('all'); // all, image, video
    const [favoriteOnly, setFavoriteOnly] = useState(false); // Show only favorites
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [targetDate, setTargetDate] = useState('');
    const [dateRange, setDateRange] = useState({ start: null, end: null });
    const [showCalendar, setShowCalendar] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [showUpload, setShowUpload] = useState(false);
    const [uploadState, setUploadState] = useState(null); // Background upload state
    const [editingFile, setEditingFile] = useState(null);
    const [optionsModalFile, setOptionsModalFile] = useState(null);

    // Load files from API
    useEffect(() => {
        loadFiles({ dateRange, filterType, sortOption, favoriteOnly });
    }, [dateRange, filterType, sortOption, favoriteOnly]);

    // Handle URL query param for date navigation
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const dateParam = params.get('date');
        if (dateParam) {
            setTargetDate(dateParam);
            // Wait for render then scroll
            setTimeout(() => {
                const element = document.getElementById(`date-${dateParam}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 500);
        }
    }, [location.search]);

    // Listen for file:processed events from WebSocket
    useEffect(() => {
        const handleFileProcessed = (event) => {
            console.log('[Gallery] File processed event received:', event.detail);
            // Reload gallery to show the newly processed file
            loadFiles();
        };

        window.addEventListener('file:processed', handleFileProcessed);

        return () => {
            window.removeEventListener('file:processed', handleFileProcessed);
        };
    }, []);

    // Screen Wake Lock
    const wakeLockRef = useRef(null);

    useEffect(() => {
        const requestWakeLock = async () => {
            if ('wakeLock' in navigator) {
                try {
                    wakeLockRef.current = await navigator.wakeLock.request('screen');
                    console.log('[WakeLock] Screen Wake Lock active');
                } catch (err) {
                    console.error('[WakeLock] Failed to acquire lock:', err);
                }
            }
        };

        const releaseWakeLock = async () => {
            if (wakeLockRef.current) {
                try {
                    await wakeLockRef.current.release();
                    wakeLockRef.current = null;
                    console.log('[WakeLock] Screen Wake Lock released');
                } catch (err) {
                    console.error('[WakeLock] Failed to release lock:', err);
                }
            }
        };

        // If uploading and not done, request lock
        if (uploadState && !uploadState.done) {
            requestWakeLock();
        } else {
            releaseWakeLock();
        }

        // Re-acquire lock if visibility changes (e.g. user switches tabs and comes back)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && uploadState && !uploadState.done) {
                requestWakeLock();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            releaseWakeLock();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [uploadState]);

    // Warn user before closing tab/window if upload is in progress
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (uploadState && !uploadState.done) {
                e.preventDefault();
                e.returnValue = '업로드가 진행 중입니다. 페이지를 나가면 업로드가 중단됩니다.';
                return e.returnValue;
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [uploadState]);

    // 파일 처리 상태 업데이트 핸들러
    const handleProcessingStatusUpdate = useCallback((statusResults) => {
        setFiles(prevFiles => {
            const updatedFiles = [...prevFiles];
            let hasChanges = false;

            statusResults.forEach(status => {
                const index = updatedFiles.findIndex(f => f.id === status.file_id);
                if (index !== -1) {
                    const file = updatedFiles[index];

                    // 상태가 변경된 경우에만 업데이트
                    if (
                        file.processing_status !== status.status ||
                        file.processing_progress !== status.progress ||
                        file.processing_stage !== status.stage
                    ) {
                        updatedFiles[index] = {
                            ...file,
                            processing_status: status.status,
                            processing_progress: status.progress,
                            processing_stage: status.stage,
                            processing_error: status.error,
                        };
                        hasChanges = true;

                        // 완료된 경우 썸네일 URL 업데이트
                        if (status.status === 'completed' && status.thumbnail_url) {
                            updatedFiles[index].thumbnail_url = status.thumbnail_url;
                            updatedFiles[index].url = status.thumbnail_url;
                        }
                    }
                }
            });

            // 모든 파일이 완료되면 갤러리 새로고침
            const allCompleted = statusResults.every(s => s.status === 'completed' || s.status === 'failed');
            if (allCompleted && hasChanges) {
                console.log('[Gallery] All files processed, reloading gallery');
                setTimeout(() => loadFiles(), 1000);
            }

            return hasChanges ? updatedFiles : prevFiles;
        });
    }, []);

    // 파일 처리 상태 모니터링 시작
    useFileProcessingMonitor(files, handleProcessingStatusUpdate, {
        enabled: true,
        interval: 5000, // 5초마다 폴링
        maxDuration: 600000, // 최대 10분
    });

    const handleScrollToDate = (e) => {
        const date = e.target.value;
        setTargetDate(date);
        const element = document.getElementById(`date-${date}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const handleDateRangeSelect = (date) => {
        if (!dateRange.start || (dateRange.start && dateRange.end)) {
            setDateRange({ start: date, end: null });
        } else {
            // Ensure start is before end
            if (date < dateRange.start) {
                setDateRange({ start: date, end: dateRange.start });
            } else {
                setDateRange({ start: dateRange.start, end: date });
            }
            setShowCalendar(false); // Close calendar after selecting range
        }
    };

    // Memoized Filter and Sort Logic (client-side filtering for search term only)
    const filteredFiles = useMemo(() => {
        return files.filter(file => {
            const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                file.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase().replace('#', '')));

            return matchesSearch;
        });
    }, [files, searchTerm]);

    // Memoized Grouping
    const groupedFiles = useMemo(() => {
        return filteredFiles.reduce((acc, file) => {
            const date = file.date;
            if (!acc[date]) acc[date] = [];
            acc[date].push(file);
            return acc;
        }, {});
    }, [filteredFiles]);

    const toggleSelection = (id) => {
        if (selectedFiles.includes(id)) {
            setSelectedFiles(selectedFiles.filter(fid => fid !== id));
        } else {
            if (selectedFiles.length >= 30) {
                alert('최대 30개까지만 선택할 수 있습니다.');
                return;
            }
            setSelectedFiles([...selectedFiles, id]);
        }
    };

    const handleDownload = async () => {
        try {
            await fileApi.downloadBatchFiles(selectedFiles);
            setSelectedFiles([]);
            setIsSelectionMode(false);
        } catch (err) {
            console.error('Download failed:', err);
            alert('다운로드에 실패했습니다.');
        }
    };

    // Set up video player and image viewer callbacks
    useEffect(() => {
        window.openVideoPlayer = (file) => {
            setPlayingVideo(file);
        };
        window.openImageViewer = (file) => {
            setViewingImage(file);
        };
        return () => {
            window.openVideoPlayer = null;
            window.openImageViewer = null;
        };
    }, []);


    const handleDelete = async () => {
        if (window.confirm(`${selectedFiles.length}개의 파일을 삭제하시겠습니까?`)) {
            try {
                await fileApi.deleteBatchFiles(selectedFiles);
                setSelectedFiles([]);
                setIsSelectionMode(false);
                // Reload files
                loadFiles();
            } catch (err) {
                console.error('Delete failed:', err);
                alert('삭제에 실패했습니다.');
            }
        }
    };

    const handleUploadStart = (files, fileTags, uploadFn) => {
        // 업로드 상태 초기화
        setUploadState({
            files: files.map(f => ({ name: f.name, size: f.size })),
            progress: {},
            total: files.length,
            completed: 0,
            failed: 0,
            done: false
        });

        // 모달 즉시 닫기
        setShowUpload(false);

        // 백그라운드에서 업로드 실행
        uploadFn(
            (fileIndex, progress, status) => {
                // BUG FIX #1: Upload Progress Race Condition
                // Use functional update to avoid state collision during concurrent uploads
                setUploadState(prev => {
                    // Defensive: return null if state is cleared during upload
                    if (!prev) return null;

                    // Atomic update: ensure progress object is immutable
                    const newProgress = { ...prev.progress, [fileIndex]: progress };
                    const completedCount = Object.values(newProgress).filter(p => p === 100).length;

                    console.log(`[Gallery] Upload progress - File ${fileIndex}: ${progress}% (${status})`);

                    return {
                        ...prev,
                        progress: newProgress,
                        completed: completedCount
                    };
                });
            }
        ).then(results => {
            // 업로드 완료
            const successCount = results.filter(r => r.file_id).length;
            const failedCount = results.filter(r => !r.file_id).length;

            setUploadState(prev => prev ? {
                ...prev,
                completed: successCount,
                failed: failedCount,
                done: true
            } : null);

            // 갤러리 새로고침
            loadFiles();

            // 5초 후 토스트 자동 닫기
            setTimeout(() => {
                setUploadState(null);
            }, 5000);
        }).catch(error => {
            console.error('Upload failed:', error);
            setUploadState(prev => prev ? {
                ...prev,
                error: error.message,
                done: true,
                failed: prev.total
            } : null);

            // 에러 시에도 5초 후 닫기
            setTimeout(() => {
                setUploadState(null);
            }, 5000);
        });
    };

    // Web Share API - 모바일에서 사진/동영상 공유
    const handleShare = async (file) => {
        try {
            // Check if Web Share API is supported
            if (!navigator.share) {
                alert('이 브라우저는 공유 기능을 지원하지 않습니다.');
                return;
            }

            // Fetch the file as blob
            const response = await fetch(file.originalUrl || file.url);
            const blob = await response.blob();

            // Create File object
            const fileExtension = file.name.split('.').pop();
            const fileName = file.name || `file.${fileExtension}`;
            const shareFile = new File([blob], fileName, { type: blob.type });

            // Check if files can be shared
            if (navigator.canShare && !navigator.canShare({ files: [shareFile] })) {
                alert('이 파일은 공유할 수 없습니다.');
                return;
            }

            // Share
            await navigator.share({
                files: [shareFile],
                title: file.name,
                text: `${file.name} 공유`
            });

        } catch (error) {
            // User cancelled or error occurred
            if (error.name !== 'AbortError') {
                console.error('Share failed:', error);
                alert('공유에 실패했습니다.');
            }
        }
    };

    // Download file (fallback for desktop)
    const handleDownloadFile = async (file) => {
        try {
            await fileApi.downloadFile(file.id, file.name);
        } catch (error) {
            console.error('Download failed:', error);
            alert('다운로드에 실패했습니다.');
        }
    };

    // Toggle favorite with optimistic update
    const handleToggleFavorite = async (fileId, currentFavorite) => {
        // Optimistic update
        setFiles(prevFiles =>
            prevFiles.map(f =>
                f.id === fileId ? { ...f, isFavorite: !currentFavorite } : f
            )
        );

        try {
            // API call
            console.log('[Favorite] Toggling favorite:', { fileId, currentFavorite, action: currentFavorite ? 'remove' : 'add' });
            await fileApi.toggleFavorite(fileId, currentFavorite);
            console.log('[Favorite] Success');
        } catch (error) {
            console.error('[Favorite] Toggle failed:', error);
            console.error('[Favorite] Error details:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
                statusText: error.response?.statusText
            });

            // Rollback on failure
            setFiles(prevFiles =>
                prevFiles.map(f =>
                    f.id === fileId ? { ...f, isFavorite: currentFavorite } : f
                )
            );

            // Show error message with details
            const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message;
            alert(`즐겨찾기 변경에 실패했습니다.\n에러: ${errorMsg}\n\n백엔드 서버 로그를 확인해주세요.`);
        }
    };

    // Handle tag update from TagEditor
    const handleTagUpdate = (fileId, newTags) => {
        console.log('[Tags] Updating tags:', { fileId, newTags });
        setFiles(prevFiles =>
            prevFiles.map(f =>
                f.id === fileId ? { ...f, tags: newTags } : f
            )
        );
    };

    const openTagEditor = (file) => {
        setEditingFile(file);
    };

    return (
        <div style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column', paddingBottom: '80px' }}>
            <style>{`
                .gallery-grid {
                    display: grid;
                    grid-template-columns: repeat(5, 1fr);
                    gap: 2px;
                }
                @media (max-width: 768px) {
                    .gallery-grid {
                        grid-template-columns: repeat(5, 1fr);
                        gap: 1px;
                    }
                }  .gallery-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }
        .image-slider-container {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        @media (max-width: 768px) {
          .gallery-grid {
            grid-template-columns: repeat(5, 1fr) !important;
            gap: 1px !important;
          }
          .image-slider-container {
            display: none !important;
          }
          .gallery-toolbar {
            gap: 8px;
          }
          .gallery-toolbar select {
            font-size: 12px;
            padding: 6px;
          }
          .gallery-toolbar button {
            font-size: 12px;
            padding: 6px 12px;
          }
        }

        /* Shimmer loading animation */
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

            {/* Header Controls */}
            <div style={{ marginBottom: '16px', flexShrink: 0 }}>
                <GallerySearchBar
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                />

                {/* Filter Tabs */}
                <GalleryFilters
                    filterType={filterType}
                    onFilterChange={setFilterType}
                    favoriteOnly={favoriteOnly}
                    onFavoriteToggle={() => setFavoriteOnly(!favoriteOnly)}
                />

                {/* Tag Filter Bar */}
                <TagFilterBar
                    tags={tags}
                    searchTerm={searchTerm}
                    onTagClick={(tag) => setSearchTerm(searchTerm === `#${tag}` ? '' : `#${tag}`)}
                    onTagRemove={(tag) => {
                        setTags(tags.filter(t => t !== tag));
                        if (searchTerm === `#${tag}`) setSearchTerm('');
                    }}
                    onTagAdd={(tag) => setTags([...tags, tag])}
                />

                {/* Toolbar with Calendar */}
                <div style={{ position: 'relative' }}>
                    <GalleryToolbar
                        sortOption={sortOption}
                        onSortChange={setSortOption}
                        dateRange={dateRange}
                        onDateRangeButtonClick={() => setShowCalendar(!showCalendar)}
                        onDateRangeClear={() => setDateRange({ start: null, end: null })}
                        showCalendar={showCalendar}
                        onUploadClick={() => setShowUpload(true)}
                        onSelectionModeToggle={() => setIsSelectionMode(true)}
                        isSelectionMode={isSelectionMode}
                    />
                    {showCalendar && (
                        <DateRangeCalendar
                            currentMonth={currentMonth}
                            onMonthChange={setCurrentMonth}
                            dateRange={dateRange}
                            onDateSelect={handleDateRangeSelect}
                            onClear={() => { setDateRange({ start: null, end: null }); setShowCalendar(false); }}
                        />
                    )}
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div style={{
                    padding: '12px',
                    background: '#FEE2E2',
                    border: '1px solid #FCA5A5',
                    borderRadius: 'var(--radius-sm)',
                    color: '#DC2626',
                    marginBottom: '16px',
                    fontSize: '14px'
                }}>
                    {error}
                </div>
            )}

            {/* Gallery Grid */}
            <GalleryGrid
                loading={loading}
                files={files}
                groupedFiles={groupedFiles}
                filteredFiles={filteredFiles}
                isSelectionMode={isSelectionMode}
                selectedFiles={selectedFiles}
                searchTerm={searchTerm}
                onToggleSelection={toggleSelection}
                onImageLoad={handleImageLoad}
                onOpenOptions={setOptionsModalFile}
                onShowUpload={() => setShowUpload(true)}
                onToggleFavorite={handleToggleFavorite}
                uploadState={uploadState}
            />

            {/* File Upload Modal */}
            {showUpload && (
                <FileUpload
                    onUploadStart={handleUploadStart}
                    onClose={() => setShowUpload(false)}
                />
            )}

            {/* Selection Action Bar */}
            {isSelectionMode && (
                <SelectionActionBar
                    selectedCount={selectedFiles.length}
                    onCancel={() => { setIsSelectionMode(false); setSelectedFiles([]); }}
                    onDownload={handleDownload}
                    onDelete={handleDelete}
                />
            )}

            {/* Video Player Modal */}
            <VideoPlayerModal
                video={playingVideo}
                onClose={() => setPlayingVideo(null)}
                onShare={handleShare}
                onDownload={handleDownloadFile}
            />

            {/* Image Viewer Modal */}
            <ImageViewerModal
                image={viewingImage}
                onClose={() => setViewingImage(null)}
                onShare={handleShare}
                onDownload={handleDownloadFile}
            />

            {/* Upload Progress Toast */}
            {/* Fixed Upload Progress Bar at Bottom */}
            {uploadState && (
                <div style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'var(--surface)',
                    borderTop: '1px solid var(--border)',
                    padding: '16px 24px',
                    boxShadow: '0 -2px 8px rgba(0,0,0,0.1)',
                    zIndex: 1000
                }}>
                    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <div>
                                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                                    {uploadState.done ? '업로드 완료' : '파일 업로드 중...'}
                                </span>
                                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', marginLeft: '12px' }}>
                                    {uploadState.completed}/{uploadState.total} 파일
                                    {uploadState.failed > 0 && ` (실패: ${uploadState.failed})`}
                                </span>
                            </div>
                            <button
                                onClick={() => setUploadState(null)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    color: 'var(--text-tertiary)'
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Warning Message */}
                        {!uploadState.done && (
                            <div style={{
                                marginBottom: '12px',
                                padding: '8px 12px',
                                background: '#FFF3E0',
                                border: '1px solid #FFE0B2',
                                borderRadius: '4px',
                                fontSize: '13px',
                                color: '#E65100',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                                <span>⚠️</span>
                                <span>업로드 중에는 화면을 끄거나 페이지를 벗어나지 마세요.</span>
                            </div>
                        )}
                        {/* Individual File Progress */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {uploadState.files.map((file, index) => {
                                const progress = uploadState.progress[index] || 0;
                                const isComplete = progress === 100;
                                return (
                                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            flex: 1,
                                            fontSize: '13px',
                                            color: 'var(--text-secondary)',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            minWidth: 0
                                        }}>
                                            {file.name}
                                        </div>
                                        <div style={{
                                            flex: 2,
                                            position: 'relative',
                                            height: '6px',
                                            background: 'var(--background)',
                                            borderRadius: '3px',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                height: '100%',
                                                width: `${progress}%`,
                                                background: isComplete ? '#4CAF50' : 'var(--primary)',
                                                transition: 'width 0.3s ease',
                                                borderRadius: '3px'
                                            }} />
                                        </div>
                                        <div style={{
                                            width: '50px',
                                            textAlign: 'right',
                                            fontSize: '13px',
                                            fontWeight: '500',
                                            color: isComplete ? '#4CAF50' : 'var(--text-primary)'
                                        }}>
                                            {progress}%
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
            {/* Tag Edit Modal */}
            {editingFile && (
                <TagEditModal
                    file={editingFile}
                    onClose={() => setEditingFile(null)}
                    onUpdate={handleTagUpdate}
                />
            )}

            {optionsModalFile && (
                <OptionsModal
                    file={optionsModalFile}
                    onClose={() => setOptionsModalFile(null)}
                    onTagEdit={(file) => {
                        setOptionsModalFile(null);
                        setEditingFile(file);
                    }}
                    onToggleFavorite={(fileId, isFavorite) => {
                        handleToggleFavorite(fileId, isFavorite);
                    }}
                />
            )}
        </div>
    );
};

// Set up video player callback
if (typeof window !== 'undefined') {
    window.openVideoPlayer = null;
}

export default Gallery;
