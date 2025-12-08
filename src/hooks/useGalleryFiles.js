import { useState, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import fileApi from '../api/fileApi';

export const useGalleryFiles = () => {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [tags, setTags] = useState([]);

    // Performance Measurement Refs
    const loadStartTime = useRef(0);
    const loadedImagesCount = useRef(0);
    const totalImagesToLoad = useRef(0);
    const apiEndTime = useRef(0);

    const loadFiles = async ({ dateRange = {}, filterType, sortOption, favoriteOnly } = {}) => {
        setLoading(true);
        setError('');

        // Reset performance metrics
        loadStartTime.current = performance.now();
        loadedImagesCount.current = 0;
        totalImagesToLoad.current = 0;
        apiEndTime.current = 0;

        console.time('Gallery Load');

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
                    page: 1,
                    size: 100,
                    sort: sortOption === 'latest' ? 'uploadDate' : sortOption,
                    order: sortOption === 'latest' || sortOption === 'oldest' ? (sortOption === 'latest' ? 'desc' : 'asc') : 'desc',
                };

                console.log('[Favorites] Fetching favorites with params:', params);
                const result = await fileApi.getFavorites(params);
                console.log('[Favorites] API response:', result);

                // Transform favorites API response
                const favoritesData = result.data || result;
                console.log('[Favorites] Favorites data:', favoritesData);

                transformedFiles = favoritesData.map(file => transformFileData(file, true, favoriteFileIds));
            } else {
                // Fetch general files list
                const params = {
                    file_type: filterType === 'all' ? undefined : filterType,
                    sort: sortOption,
                    start_date: dateRange?.start ? format(dateRange.start, 'yyyy-MM-dd') : undefined,
                    end_date: dateRange?.end ? format(dateRange.end, 'yyyy-MM-dd') : undefined,
                    page: 1,
                    page_size: 100,
                };

                const result = await fileApi.getFiles(params);

                // Transform API response to match frontend structure
                transformedFiles = result.files.map(file => transformFileData(file, false, favoriteFileIds));
            }

            setFiles(transformedFiles);

            apiEndTime.current = performance.now();
            totalImagesToLoad.current = transformedFiles.length;

            if (transformedFiles.length === 0) {
                console.timeEnd('Gallery Load');
                const totalTime = apiEndTime.current - loadStartTime.current;
                console.log(`[Performance] No files to load. Total time: ${totalTime.toFixed(2)}ms`);
            }

            // Extract unique tags
            const allTags = new Set();
            transformedFiles.forEach(file => {
                file.tags.forEach(tag => allTags.add(tag));
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

        if (loadedImagesCount.current === totalImagesToLoad.current && totalImagesToLoad.current > 0) {
            const endTime = performance.now();
            const totalTime = endTime - loadStartTime.current;
            const apiTime = apiEndTime.current - loadStartTime.current;
            const renderTime = endTime - apiEndTime.current;

            console.timeEnd('Gallery Load');
            console.log(`[Performance] All ${totalImagesToLoad.current} images loaded.`);
            console.log(`[Performance] Total Time: ${totalTime.toFixed(2)}ms`);
            console.log(`[Performance] API Latency: ${apiTime.toFixed(2)}ms`);
            console.log(`[Performance] Image Rendering Time: ${renderTime.toFixed(2)}ms`);
        }
    };

    return {
        files,
        setFiles,
        loading,
        error,
        tags,
        setTags,
        loadFiles,
        handleImageLoad
    };
};

// Helper function to transform file data
function transformFileData(file, isFavoriteList, favoriteFileIds) {
    const fileType = (file.content_type || file.contentType || file.file_type || '').startsWith('image/') ? 'image' : 'video';
    const thumbUrl = file.thumbnail_url || file.thumbnailUrl;
    const isVideoProcessing = fileType === 'video' &&
        (!thumbUrl || file.processing_status === 'pending' || file.processing_status === 'processing');

    // Debug: Log video file info
    if (fileType === 'video') {
        console.log(`[Gallery ${isFavoriteList ? 'Favorites' : ''}] Video file:`, {
            name: file.file_name || file.fileName,
            thumbnail_url: thumbUrl,
            download_url: file.download_url || file.downloadUrl,
            processing_status: file.processing_status,
            isVideoProcessing
        });
    }

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
        name: file.file_name || file.fileName,
        url: thumbnailUrl,
        originalUrl: file.download_url || file.downloadUrl || file.url,
        type: fileType,
        date: format(parseISO(file.created_at || file.uploadedAt || file.uploaded_at), 'yyyy-MM-dd'),
        tags: file.tags ? file.tags.map(t => t.name || t) : [],
        duration: file.duration || null,
        size: file.file_size || file.fileSize,
        created_at: file.created_at || file.uploadedAt || file.uploaded_at,
        folder_id: file.folder_id || null, // Include folder_id for folder filtering
        isFavorite: isFavoriteList ? true : (favoriteFileIds.has(file.id) || file.is_favorite || false),
        processing_status: file.processing_status || (isVideoProcessing ? 'processing' : 'completed'),
        processing_progress: file.processing_progress || 0,
        processing_stage: file.processing_stage || null,
        processing_error: file.processing_error || null,
    };
}
