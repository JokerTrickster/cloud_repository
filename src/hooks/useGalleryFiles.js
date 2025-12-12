import { useState, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import fileApi from '../api/fileApi';
import folderApi from '../api/folderApi';

export const useGalleryFiles = () => {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [tags, setTags] = useState([]);
    const [hasMore, setHasMore] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);

    // Performance Measurement Refs
    const loadStartTime = useRef(0);
    const loadedImagesCount = useRef(0);
    const totalImagesToLoad = useRef(0);
    const apiEndTime = useRef(0);

    // Keep track of last load params to detect filter changes
    const lastParamsRef = useRef({});

    const loadFiles = async ({ dateRange = {}, filterType, sortOption, favoriteOnly, folderId, append = false } = {}) => {
        setLoading(true);
        setError('');

        // Detect if filters changed - if so, reset pagination
        const currentParams = { dateRange, filterType, sortOption, favoriteOnly, folderId };
        const paramsChanged = JSON.stringify(currentParams) !== JSON.stringify(lastParamsRef.current);

        if (paramsChanged && !append) {
            setCurrentPage(1);
            setHasMore(true);
            lastParamsRef.current = currentParams;
        }

        const pageToLoad = append ? currentPage + 1 : 1;

        // Reset performance metrics
        loadStartTime.current = performance.now();
        loadedImagesCount.current = 0;
        totalImagesToLoad.current = 0;
        apiEndTime.current = 0;

        try {
            let transformedFiles = [];
            let favoriteFileIds = new Set();

            // Load favorites list (if backend doesn't provide is_favorite field)
            try {
                const favoritesResult = await fileApi.getFavorites({ page: 1, size: 100 });
                favoriteFileIds = new Set(favoritesResult.data.map(f => f.id));
            } catch (error) {
                console.warn('Failed to load favorites list:', error);
            }

            if (favoriteOnly) {
                // Fetch favorites list (separate API)
                const params = {
                    page: pageToLoad,
                    size: 50, // Reduced from 100 for progressive loading
                    sort: sortOption === 'latest' ? 'uploadDate' : sortOption,
                    order: sortOption === 'latest' || sortOption === 'oldest' ? (sortOption === 'latest' ? 'desc' : 'asc') : 'desc',
                };

                const result = await fileApi.getFavorites(params);

                // Transform favorites API response
                const favoritesData = result.data || result;

                transformedFiles = favoritesData.map(file => transformFileData(file, true, favoriteFileIds));

                // Check if there are more pages
                setHasMore(transformedFiles.length === 50);
            } else if (folderId) {
                // Fetch files in specific folder
                const result = await folderApi.getFolderFiles(folderId);

                // Handle response structure
                const rawFiles = result.files || result.data || (Array.isArray(result) ? result : []);

                // Transform files (backend provides download_url and thumbnail_url)
                let files = (rawFiles || []).map(file => transformFileData(file, false, favoriteFileIds)).filter(f => f !== null);

                // Client-side Filtering
                if (filterType && filterType !== 'all') {
                    files = files.filter(f => f.type === filterType);
                }

                if (dateRange?.start) {
                    const startDate = format(dateRange.start, 'yyyy-MM-dd');
                    files = files.filter(f => f.date >= startDate);
                }
                if (dateRange?.end) {
                    const endDate = format(dateRange.end, 'yyyy-MM-dd');
                    files = files.filter(f => f.date <= endDate);
                }

                // Client-side Sorting
                files.sort((a, b) => {
                    switch (sortOption) {
                        case 'latest':
                            return new Date(b.created_at) - new Date(a.created_at);
                        case 'oldest':
                            return new Date(a.created_at) - new Date(b.created_at);
                        case 'name':
                            return a.name.localeCompare(b.name);
                        case 'size':
                            return b.size - a.size;
                        default:
                            return 0;
                    }
                });

                transformedFiles = files;

            } else {
                // Fetch general files list (Root or All)
                const params = {
                    file_type: filterType === 'all' ? undefined : filterType,
                    sort: sortOption,
                    start_date: dateRange?.start ? format(dateRange.start, 'yyyy-MM-dd') : undefined,
                    end_date: dateRange?.end ? format(dateRange.end, 'yyyy-MM-dd') : undefined,
                    page: pageToLoad,
                    page_size: 50, // Reduced from 100 for progressive loading
                };

                const result = await fileApi.getFiles(params);

                // Transform API response to match frontend structure
                // Handle various API response structures: { files: [] }, { data: [] }, or []
                const rawFiles = result.files || result.data || (Array.isArray(result) ? result : []);

                if (!rawFiles) {
                    console.warn('[Gallery] Unexpected API response format:', result);
                }

                transformedFiles = (rawFiles || []).map(file => transformFileData(file, false, favoriteFileIds)).filter(f => f !== null);

                // Check if there are more pages
                setHasMore(transformedFiles.length === 50);
            }

            // Append or replace files based on append flag
            if (append) {
                setFiles(prev => [...prev, ...transformedFiles]);
                setCurrentPage(pageToLoad);
            } else {
                setFiles(transformedFiles);
                setCurrentPage(1);
            }

            apiEndTime.current = performance.now();
            totalImagesToLoad.current = transformedFiles.length;

            // Extract unique tags
            const allTags = new Set();
            transformedFiles.forEach(file => {
                if (file && file.tags) {
                    file.tags.forEach(tag => allTags.add(tag));
                }
            });
            setTags(Array.from(allTags).slice(0, 5));

        } catch (err) {
            console.error('Failed to load files:', err);
            console.error('Error details:', {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status
            });

            const errorMessage = err.response?.data?.error
                || err.response?.data?.message
                || err.message
                || '파일을 불러오는데 실패했습니다.';

            setError(`${errorMessage}\n\n콘솔(F12)에서 자세한 에러를 확인하세요.`);
        } finally {
            setLoading(false);
        }
    };

    const handleImageLoad = () => {
        loadedImagesCount.current += 1;
        // Performance tracking removed for production
    };

    const loadMore = async ({ dateRange, filterType, sortOption, favoriteOnly, folderId } = {}) => {
        if (!hasMore || loading) return;

        await loadFiles({
            dateRange,
            filterType,
            sortOption,
            favoriteOnly,
            folderId,
            append: true
        });
    };

    return {
        files,
        setFiles,
        loading,
        error,
        tags,
        setTags,
        loadFiles,
        loadMore,
        hasMore,
        handleImageLoad
    };
};

// Helper function to transform file data
function transformFileData(file, isFavoriteList, favoriteFileIds) {
    if (!file) return null;

    const fileType = (file.content_type || file.contentType || file.file_type || '').startsWith('image/') ? 'image' : 'video';
    const thumbUrl = file.thumbnail_url || file.thumbnailUrl;
    const isVideoProcessing = fileType === 'video' &&
        (!thumbUrl || file.processing_status === 'pending' || file.processing_status === 'processing');

    // Determine thumbnail URL
    let thumbnailUrl;
    if (fileType === 'video') {
        // Video: Use thumbnail only if processing is complete
        if (thumbUrl && file.processing_status === 'completed') {
            thumbnailUrl = thumbUrl;
        } else {
            // Processing or no thumbnail, use placeholder
            thumbnailUrl = `https://via.placeholder.com/300/4A5568/FFFFFF?text=${encodeURIComponent('처리 중...')}`;
        }
    } else {
        // Image: thumbnail_url > download_url > placeholder
        thumbnailUrl = thumbUrl || file.download_url || file.downloadUrl ||
            `https://via.placeholder.com/300?text=${file.file_name || file.fileName}`;
    }

    return {
        id: file.id,
        name: file.file_name || file.fileName || 'Unknown',
        url: thumbnailUrl,
        originalUrl: file.download_url || file.downloadUrl || file.url,
        type: fileType,
        date: file.created_at || file.uploadedAt || file.uploaded_at ? format(parseISO(file.created_at || file.uploadedAt || file.uploaded_at), 'yyyy-MM-dd') : '',
        tags: file.tags ? file.tags.map(t => t.name || t) : [],
        duration: file.duration || null,
        size: file.file_size || file.fileSize || 0,
        created_at: file.created_at || file.uploadedAt || file.uploaded_at,
        folder_id: file.folder_id || null, // Include folder_id for folder filtering
        isFavorite: isFavoriteList ? true : (favoriteFileIds.has(file.id) || file.is_favorite || false),
        processing_status: file.processing_status || (isVideoProcessing ? 'processing' : 'completed'),
        processing_progress: file.processing_progress || 0,
        processing_stage: file.processing_stage || null,
        processing_error: file.processing_error || null,
    };
}
