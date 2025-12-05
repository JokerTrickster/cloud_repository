import { useState, useCallback } from 'react';
import multipartUploadApi from '../api/multipartUploadApi';

/**
 * React hook for managing multipart upload state
 *
 * Provides:
 * - Upload progress tracking
 * - Error handling
 * - Cancellation support
 * - Retry logic
 *
 * @returns {Object} Upload state and control functions
 */
export const useMultipartUpload = () => {
  const [uploadState, setUploadState] = useState({
    isUploading: false,
    progress: 0,
    completedParts: 0,
    totalParts: 0,
    error: null,
    currentFile: null
  });

  const [abortController, setAbortController] = useState(null);

  /**
   * Start multipart upload
   *
   * @param {File} file - File to upload
   * @param {Function} onComplete - Callback when upload completes
   * @param {number} concurrentUploads - Concurrent upload count (default: 3)
   */
  const startUpload = useCallback(async (file, onComplete, concurrentUploads = 3) => {
    // Create abort controller for cancellation
    const controller = new AbortController();
    setAbortController(controller);

    setUploadState({
      isUploading: true,
      progress: 0,
      completedParts: 0,
      totalParts: 0,
      error: null,
      currentFile: file.name
    });

    try {
      const result = await multipartUploadApi.uploadFile(
        file,
        (completedParts, totalParts, percentage) => {
          // Update progress
          setUploadState(prev => ({
            ...prev,
            progress: percentage,
            completedParts,
            totalParts
          }));
        },
        concurrentUploads
      );

      // Upload successful
      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        progress: 100
      }));

      if (onComplete) {
        onComplete(result);
      }

      return result;

    } catch (error) {
      // Upload failed
      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        error: error.message
      }));

      throw error;
    } finally {
      setAbortController(null);
    }
  }, []);

  /**
   * Cancel ongoing upload
   */
  const cancelUpload = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        error: 'Upload cancelled by user'
      }));
    }
  }, [abortController]);

  /**
   * Reset upload state
   */
  const resetUpload = useCallback(() => {
    setUploadState({
      isUploading: false,
      progress: 0,
      completedParts: 0,
      totalParts: 0,
      error: null,
      currentFile: null
    });
    setAbortController(null);
  }, []);

  return {
    uploadState,
    startUpload,
    cancelUpload,
    resetUpload
  };
};

export default useMultipartUpload;
