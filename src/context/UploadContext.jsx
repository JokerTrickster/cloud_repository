import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import fileApi from '../api/fileApi';

const UploadContext = createContext(null);

export const useUpload = () => {
    const context = useContext(UploadContext);
    if (!context) {
        throw new Error('useUpload must be used within an UploadProvider');
    }
    return context;
};

export const UploadProvider = ({ children }) => {
    const [uploadState, setUploadState] = useState(null);
    const uploadRef = useRef(null);

    const startUpload = useCallback(async (files, fileTags) => {
        // Initialize state
        setUploadState({
            files: files.map(f => ({ name: f.name, size: f.size })),
            progress: {}, // { index: { percent: 0, status: 'pending' } }
            total: files.length,
            completed: 0,
            failed: 0,
            isUploading: true,
            isMinimized: false
        });

        try {
            // Define progress callback
            const onProgress = (index, percent, status = 'uploading') => {
                setUploadState(prev => {
                    if (!prev) return null;
                    const newProgress = {
                        ...prev.progress,
                        [index]: {
                            percent,
                            status: status
                        }
                    };

                    // 전체 진행률 계산
                    const totalPercent = Math.round(
                        Object.values(newProgress).reduce((acc, curr) => acc + curr.percent, 0) / prev.total
                    );

                    return {
                        ...prev,
                        progress: newProgress,
                        totalPercent
                    };
                });
            };     // Start batch upload
            const results = await fileApi.uploadBatchFiles(files, onProgress, fileTags);

            // Handle completion
            const successCount = results.filter(r => r.file_id).length;
            const failedCount = results.filter(r => !r.file_id).length;

            setUploadState(prev => prev ? {
                ...prev,
                completed: successCount,
                failed: failedCount,
                isUploading: false,
                done: true
            } : null);

            // Auto-close after 5 seconds
            setTimeout(() => {
                setUploadState(null);
            }, 5000);

            return results;

        } catch (error) {
            console.error('Upload failed:', error);
            setUploadState(prev => prev ? {
                ...prev,
                error: error.message,
                isUploading: false,
                done: true
            } : null);

            throw error;
        }
    }, []);

    const cancelUpload = useCallback(() => {
        // Implementation for cancellation would go here
        // For now, just clear state
        setUploadState(null);
    }, []);

    const minimizeUpload = useCallback(() => {
        setUploadState(prev => prev ? { ...prev, isMinimized: true } : null);
    }, []);

    const maximizeUpload = useCallback(() => {
        setUploadState(prev => prev ? { ...prev, isMinimized: false } : null);
    }, []);

    const closeUpload = useCallback(() => {
        setUploadState(null);
    }, []);

    return (
        <UploadContext.Provider value={{
            uploadState,
            startUpload,
            cancelUpload,
            minimizeUpload,
            maximizeUpload,
            closeUpload
        }}>
            {children}
        </UploadContext.Provider>
    );
};
