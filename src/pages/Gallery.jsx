import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import fileApi from '../api/fileApi';
import folderApi from '../api/folderApi';
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
import DebugLogger from '../components/DebugLogger';
import FolderSidebar from '../components/FolderSidebar';
import CreateFolderModal from '../components/CreateFolderModal';
import MoveFilesModal from '../components/MoveFilesModal';
import ShareModal from '../components/ShareModal';
import UploadProgressModal from '../components/UploadProgressModal';
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

    // Folder management state
    const [folders, setFolders] = useState([]);
    const [currentFolder, setCurrentFolder] = useState(null); // null = root
    const [showCreateFolder, setShowCreateFolder] = useState(false);
    const [showMoveFiles, setShowMoveFiles] = useState(false);
    const [editingFolder, setEditingFolder] = useState(null);
    const [createFolderParentId, setCreateFolderParentId] = useState(null);
    const [isFolderSidebarOpen, setIsFolderSidebarOpen] = useState(false); // Mobile sidebar state

    // Share management state
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareTarget, setShareTarget] = useState(null); // { type, id, name }

    // Load files from API
    useEffect(() => {
        loadFiles({
            dateRange,
            filterType,
            sortOption,
            favoriteOnly,
            folderId: currentFolder?.id
        });
    }, [dateRange, filterType, sortOption, favoriteOnly, currentFolder]);

    // Handle URL query param for date navigation
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const dateParam = params.get('date');
        if (dateParam && !loading && files.length > 0) {
            setTargetDate(dateParam);
            // Wait for DOM to update after files are loaded
            requestAnimationFrame(() => {
                setTimeout(() => {
                    const element = document.getElementById(`date-${dateParam}`);
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }, 100);
            });
        }
    }, [location.search, loading, files.length]);

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

    const handleScrollToDate = useCallback((e) => {
        const date = e.target.value;
        setTargetDate(date);
        const element = document.getElementById(`date-${date}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, []);

    const handleDateRangeSelect = useCallback((date) => {
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
    }, [dateRange]);

    // Memoized Filter and Sort Logic (client-side filtering for search term only)
    const filteredFiles = useMemo(() => {
        if (!files || files.length === 0) {
            return [];
        }

        return files.filter(file => {
            const fileTags = file.tags || [];
            const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                fileTags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase().replace('#', '')));
            return matchesSearch;
        });
    }, [files, searchTerm]);

    // Memoized Grouping (kept for compatibility, but using finalGroupedFiles instead)
    const groupedFiles = useMemo(() => {
        return filteredFiles.reduce((acc, file) => {
            const date = file.date;
            if (!acc[date]) acc[date] = [];
            acc[date].push(file);
            return acc;
        }, {});
    }, [filteredFiles]);

    const toggleSelection = useCallback((id) => {
        if (selectedFiles.includes(id)) {
            setSelectedFiles(selectedFiles.filter(fid => fid !== id));
        } else {
            if (selectedFiles.length >= 30) {
                alert('최대 30개까지만 선택할 수 있습니다.');
                return;
            }
            setSelectedFiles([...selectedFiles, id]);
        }
    }, [selectedFiles]);

    const handleDownload = useCallback(async () => {
        try {
            await fileApi.downloadBatchFiles(selectedFiles);
            setSelectedFiles([]);
            setIsSelectionMode(false);
        } catch (err) {
            console.error('Download failed:', err);
            alert('다운로드에 실패했습니다.');
        }
    }, [selectedFiles]);

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


    const handleDelete = useCallback(async () => {
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
    }, [selectedFiles, loadFiles]);

    const handleUploadStart = useCallback((files, fileTags, uploadFn) => {
        console.log('[Gallery] Starting upload for', files.length, 'files');
        console.log('[Gallery] File sizes:', files.map(f => `${f.name}: ${(f.size / 1024 / 1024 / 1024).toFixed(2)}GB`));

        // 업로드 상태 초기화
        setUploadState({
            files: files.map(f => ({ name: f.name, size: f.size })),
            progress: {},
            total: files.length,
            completed: 0,
            failed: 0,
            done: false
        });

        console.log('[Gallery] Upload state initialized, closing modal');

        // 모달 즉시 닫기
        setShowUpload(false);

        console.log('[Gallery] Calling uploadFn...');

        // 백그라운드에서 업로드 실행
        try {
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
                console.log('[Gallery] Upload completed, results:', results);

                // 업로드 완료
                const successCount = results.filter(r => r.file_id).length;
                const failedCount = results.filter(r => !r.file_id).length;

                console.log(`[Gallery] Success: ${successCount}, Failed: ${failedCount}`);

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
                    console.log('[Gallery] Auto-closing upload state');
                    setUploadState(null);
                }, 5000);
            }).catch(error => {
                console.error('[Gallery] Upload failed with error:', error);
                console.error('[Gallery] Error stack:', error.stack);
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
        } catch (syncError) {
            console.error('[Gallery] Synchronous error in uploadFn:', syncError);
            console.error('[Gallery] Sync error stack:', syncError.stack);
            setUploadState(prev => prev ? {
                ...prev,
                error: `동기 에러: ${syncError.message}`,
                done: true,
                failed: prev.total
            } : null);
        }
    }, [loadFiles]);

    // Share handler - 폴더/파일 공유 모달 열기
    const handleShare = useCallback((type, id, name) => {
        setShareTarget({ type, id, name });
        setShowShareModal(true);
    }, []);

    // Web Share API - 모바일에서 사진/동영상 공유
    const handleWebShare = useCallback(async (file) => {
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
    }, []);

    // Download file (fallback for desktop)
    const handleDownloadFile = useCallback(async (file) => {
        try {
            await fileApi.downloadFile(file.id, file.name);
        } catch (error) {
            console.error('Download failed:', error);
            alert('다운로드에 실패했습니다.');
        }
    }, []);

    // Toggle favorite with optimistic update
    const handleToggleFavorite = useCallback(async (fileId, currentFavorite) => {
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
    }, []);

    // Handle tag update from TagEditor
    const handleTagUpdate = useCallback((fileId, newTags) => {
        console.log('[Tags] Updating tags:', { fileId, newTags });
        setFiles(prevFiles =>
            prevFiles.map(f =>
                f.id === fileId ? { ...f, tags: newTags } : f
            )
        );
    }, []);

    const openTagEditor = useCallback((file) => {
        setEditingFile(file);
    }, []);

    // Load folders on mount
    useEffect(() => {
        loadFolders();
    }, []);

    // Load folders function
    const loadFolders = async () => {
        try {
            const folderData = await folderApi.getFolders();
            setFolders(folderData || []);
        } catch (err) {
            console.error('[Gallery] Failed to load folders:', err);
        }
    };

    // Filter files by current folder
    // Note: When currentFolder is set, loadFiles already loads folder-specific files via backend API
    // So we don't need to filter again - just return filteredFiles directly
    const folderFilteredFiles = useMemo(() => {
        console.log('[FolderFilter] Files loaded:', {
            totalFiles: filteredFiles?.length || 0,
            currentFolder: currentFolder?.id || 'root',
            currentFolderName: currentFolder?.folder_name || 'root'
        });

        if (!filteredFiles || filteredFiles.length === 0) {
            console.log('[FolderFilter] No files to filter');
            return [];
        }

        if (currentFolder === null) {
            // Root view: Show files without folder (client-side filter needed)
            const rootFiles = filteredFiles.filter(file => !file.folder_id || file.folder_id === null);
            console.log('[FolderFilter] Root files:', {
                count: rootFiles.length,
                fileIds: rootFiles.map(f => f.id),
                sample: rootFiles.slice(0, 3).map(f => ({ id: f.id, name: f.name, folder_id: f.folder_id }))
            });
            return rootFiles;
        }

        // Folder view: Backend already returned folder-specific files via loadFiles({ folderId })
        // No additional filtering needed - just return all filteredFiles
        console.log('[FolderFilter] Folder files (from backend):', {
            folderId: currentFolder.id,
            folderName: currentFolder.folder_name,
            count: filteredFiles.length,
            fileIds: filteredFiles.map(f => f.id)
        });
        return filteredFiles;
    }, [filteredFiles, currentFolder]);

    // Update groupedFiles to use folder-filtered files
    const finalGroupedFiles = useMemo(() => {
        if (!folderFilteredFiles || folderFilteredFiles.length === 0) {
            return {};
        }

        return folderFilteredFiles.reduce((acc, file) => {
            const date = file.date;
            if (!acc[date]) acc[date] = [];
            acc[date].push(file);
            return acc;
        }, {});
    }, [folderFilteredFiles]);

    // Folder handlers
    const handleFolderSelect = useCallback((folder) => {
        console.log('[Gallery] Folder selected:', folder?.id || 'root');
        setCurrentFolder(folder);
        setSelectedFiles([]); // Clear selection when changing folders
        // Note: useEffect will automatically reload files when currentFolder changes
    }, []);

    const handleCreateFolder = useCallback((parentFolderId) => {
        setCreateFolderParentId(parentFolderId);
        setEditingFolder(null);
        setShowCreateFolder(true);
    }, []);

    const handleRenameFolder = useCallback((folder) => {
        setEditingFolder(folder);
        setShowCreateFolder(true);
    }, []);

    const handleFolderSubmit = useCallback(async (folderName, parentFolderId) => {
        try {
            if (editingFolder) {
                // Rename existing folder
                await folderApi.updateFolder(editingFolder.id, { folder_name: folderName });
            } else {
                // Create new folder
                await folderApi.createFolder({
                    folder_name: folderName,
                    parent_folder_id: parentFolderId
                });
            }
            loadFolders(); // Reload folders
        } catch (err) {
            console.error('[Gallery] Folder operation failed:', err);
            throw err;
        }
    }, [editingFolder, loadFolders]);

    const handleDeleteFolder = useCallback(async (folderId) => {
        try {
            await folderApi.deleteFolder(folderId);
            loadFolders(); // Reload folders
            loadFiles(); // Reload files (they moved to root)
            if (currentFolder?.id === folderId) {
                setCurrentFolder(null); // Reset to root if deleted folder was selected
            }
        } catch (err) {
            console.error('[Gallery] Delete folder failed:', err);

            // Enhanced error handling with specific messages
            const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message;
            const statusCode = err.response?.status;

            let userMessage = '폴더 삭제에 실패했습니다.';

            if (statusCode === 404) {
                userMessage = '폴더를 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.';
            } else if (statusCode === 403) {
                userMessage = '폴더를 삭제할 권한이 없습니다.';
            } else if (statusCode === 400) {
                if (errorMsg?.includes('sub') || errorMsg?.includes('하위')) {
                    userMessage = '하위 폴더가 있는 폴더는 삭제할 수 없습니다.\n먼저 하위 폴더를 삭제해주세요.';
                } else if (errorMsg?.includes('file') || errorMsg?.includes('파일')) {
                    userMessage = '폴더에 파일이 있어 삭제할 수 없습니다.\n먼저 파일을 이동하거나 삭제해주세요.';
                } else {
                    userMessage = `폴더 삭제 실패: ${errorMsg}`;
                }
            } else if (statusCode === 500) {
                userMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
            } else if (errorMsg) {
                userMessage = `폴더 삭제 실패: ${errorMsg}`;
            }

            alert(userMessage);

            // Reload folders in case state changed
            loadFolders();
        }
    }, [currentFolder, loadFolders, loadFiles]);

    const handleMoveFilesToFolder = useCallback(() => {
        console.log('[Gallery] handleMoveFilesToFolder called:', {
            selectedFilesCount: selectedFiles.length,
            selectedFileIds: selectedFiles
        });

        if (selectedFiles.length === 0) {
            console.log('[Gallery] No files selected, showing alert');
            alert('이동할 파일을 선택하세요.');
            return;
        }

        console.log('[Gallery] Opening move files modal');
        setShowMoveFiles(true);
    }, [selectedFiles]);

    const handleMoveFiles = useCallback(async (targetFolderId) => {
        try {
            console.log('[MoveFiles] Starting move operation:', {
                selectedFiles,
                targetFolderId,
                currentFolderId: currentFolder?.id,
                fileCount: selectedFiles.length
            });

            const result = await folderApi.moveFiles(selectedFiles, targetFolderId);
            console.log('[MoveFiles] API response:', result);

            setSelectedFiles([]);
            setIsSelectionMode(false);

            // Reload folders first to get updated file counts
            console.log('[MoveFiles] Reloading folders...');
            await loadFolders();

            // Then reload files for current folder to refresh the view
            console.log('[MoveFiles] Reloading files for current folder...');
            await loadFiles({
                dateRange,
                filterType,
                sortOption,
                favoriteOnly,
                folderId: currentFolder?.id
            });

            console.log('[MoveFiles] Move operation complete');
        } catch (err) {
            console.error('[Gallery] Move files failed:', err);

            // Enhanced error handling with specific messages
            const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message;
            const statusCode = err.response?.status;

            let userMessage = '파일 이동에 실패했습니다.';

            if (statusCode === 404) {
                userMessage = '폴더를 찾을 수 없습니다. 폴더가 삭제되었을 수 있습니다.';
            } else if (statusCode === 403) {
                userMessage = '파일을 이동할 권한이 없습니다.';
            } else if (statusCode === 400) {
                if (errorMsg?.includes('limit') || errorMsg?.includes('제한')) {
                    userMessage = '한번에 이동할 수 있는 파일 개수를 초과했습니다.\n파일을 나눠서 이동해주세요.';
                } else if (errorMsg?.includes('not found')) {
                    userMessage = '일부 파일을 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.';
                } else {
                    userMessage = `파일 이동 실패: ${errorMsg}`;
                }
            } else if (statusCode === 500) {
                userMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
            } else if (errorMsg) {
                userMessage = `파일 이동 실패: ${errorMsg}`;
            }

            alert(userMessage);

            // Reload to sync state
            loadFiles();
            loadFolders();

            throw err;
        }
    }, [selectedFiles, currentFolder, dateRange, filterType, sortOption, favoriteOnly, loadFolders, loadFiles]);

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
            {/* Folder Sidebar */}
            <FolderSidebar
                folders={folders}
                currentFolder={currentFolder}
                onFolderSelect={handleFolderSelect}
                onCreateFolder={handleCreateFolder}
                onRenameFolder={handleRenameFolder}
                onDeleteFolder={handleDeleteFolder}
                onShare={handleShare}
                isOpen={isFolderSidebarOpen}
                onClose={() => setIsFolderSidebarOpen(false)}
            />

            {/* Main Gallery Content */}
            <div style={{
                flex: 1,
                padding: '16px',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                paddingBottom: '80px',
                overflow: 'auto',
                width: '100%' // Ensure full width on mobile
            }}>
                <style>{`
                .gallery-grid {
                    display: grid;
                    grid-template-columns: repeat(5, 1fr);
                    gap: 2px;
                    /* Performance optimizations */
                    will-change: contents;
                    contain: layout;
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
                        onFolderClick={() => setIsFolderSidebarOpen(true)}
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
                            onShareFolder={() => handleShare('folder', currentFolder?.id, currentFolder?.folder_name)}
                            currentFolder={currentFolder}
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
                    groupedFiles={finalGroupedFiles}
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
                        onMoveToFolder={handleMoveFilesToFolder}
                    />
                )}

                {/* Video Player Modal */}
                <VideoPlayerModal
                    video={playingVideo}
                    onClose={() => setPlayingVideo(null)}
                    onShare={handleWebShare}
                    onDownload={handleDownloadFile}
                />

                {/* Image Viewer Modal */}
                <ImageViewerModal
                    image={viewingImage}
                    onClose={() => setViewingImage(null)}
                    onShare={handleWebShare}
                    onDownload={handleDownloadFile}
                />

                {/* Upload Progress Modal */}
                <UploadProgressModal
                    uploadState={uploadState}
                    onClose={() => setUploadState(null)}
                />
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
                        onShare={(file) => {
                            setOptionsModalFile(null);
                            handleShare('file', file.id, file.name);
                        }}
                    />
                )}

                {/* Folder Modals */}
                {showCreateFolder && (
                    <CreateFolderModal
                        onClose={() => {
                            setShowCreateFolder(false);
                            setEditingFolder(null);
                            setCreateFolderParentId(null);
                        }}
                        onSubmit={handleFolderSubmit}
                        editingFolder={editingFolder}
                        defaultParentId={createFolderParentId}
                    />
                )}

                {showMoveFiles && (
                    <MoveFilesModal
                        selectedFiles={files.filter(f => selectedFiles.includes(f.id))}
                        folders={folders}
                        onClose={() => setShowMoveFiles(false)}
                        onMove={handleMoveFiles}
                    />
                )}

                {/* Share Modal */}
                {showShareModal && (
                    <ShareModal
                        isOpen={showShareModal}
                        onClose={() => {
                            setShowShareModal(false);
                            setShareTarget(null);
                        }}
                        resourceType={shareTarget?.type}
                        resourceId={shareTarget?.id}
                        resourceName={shareTarget?.name}
                    />
                )}

                {/* Debug Logger for mobile debugging */}
                <DebugLogger />
            </div>
        </div>
    );
};

// Set up video player callback
if (typeof window !== 'undefined') {
    window.openVideoPlayer = null;
}

export default Gallery;
