import axios from 'axios';
import client from './client';

/**
 * Multipart Upload API for handling large files (>5GB S3 limit)
 *
 * Flow:
 * 1. initiate() - Start multipart upload and get uploadId
 * 2. getPresignedUrls() - Get presigned URLs for each part
 * 3. uploadPart() - Upload individual parts to S3
 * 4. complete() - Finalize multipart upload
 * 5. abort() - Cancel upload if needed
 */

const multipartUploadApi = {
  /**
   * Step 1: Initiate multipart upload
   * POST /api/v1/files/multipart/initiate
   *
   * @param {Object} params
   * @param {string} params.fileName - 파일명
   * @param {number} params.fileSize - 파일 크기 (bytes)
   * @param {string} params.contentType - MIME 타입
   * @returns {Promise<{uploadId: string, fileKey: string, partSize: number}>}
   */
  async initiate({ fileName, fileSize, contentType }) {
    const { data } = await client.post(
      '/api/v1/files/multipart/initiate',
      {
        fileName,
        fileSize,
        contentType
      },
      {
        baseURL: import.meta.env.VITE_FILE_API_URL
      }
    );
    return data;
  },

  /**
   * Step 2: Get presigned URLs for parts
   * POST /api/v1/files/multipart/presigned-urls
   *
   * @param {Object} params
   * @param {string} params.uploadId - Multipart upload ID
   * @param {string} params.fileKey - S3 file key
   * @param {Array<number>} params.partNumbers - Part numbers to get URLs for
   * @returns {Promise<{urls: Array<{partNumber: number, url: string}>}>}
   */
  async getPresignedUrls({ uploadId, fileKey, partNumbers }) {
    const { data } = await client.post(
      '/api/v1/files/multipart/presigned-urls',
      {
        uploadId,
        fileKey,
        partNumbers
      },
      {
        baseURL: import.meta.env.VITE_FILE_API_URL
      }
    );
    return data;
  },

  /**
   * Step 3: Upload a single part to S3
   *
   * @param {string} presignedUrl - Presigned URL for the part
   * @param {Blob} partData - Part data to upload
   * @param {string} contentType - MIME type
   * @param {Function} onProgress - Progress callback (optional)
   * @returns {Promise<string>} ETag of uploaded part
   */
  async uploadPart(presignedUrl, partData, contentType, onProgress) {
    const response = await axios.put(presignedUrl, partData, {
      headers: {
        'Content-Type': contentType
      },
      timeout: 600000, // 10 minutes
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      }
    });

    // Extract ETag from response headers and remove quotes
    const etag = response.headers.etag || response.headers['etag'];
    if (!etag) {
      throw new Error('ETag not found in response headers');
    }
    return etag.replace(/"/g, '');
  },

  /**
   * Step 3 with retry: Upload part with automatic retry on failure
   *
   * @param {string} presignedUrl - Presigned URL
   * @param {Blob} partData - Part data
   * @param {string} contentType - MIME type
   * @param {number} maxRetries - Maximum retry attempts (default: 3)
   * @param {Function} onProgress - Progress callback (optional)
   * @returns {Promise<string>} ETag
   */
  async uploadPartWithRetry(presignedUrl, partData, contentType, maxRetries = 3, onProgress) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.uploadPart(presignedUrl, partData, contentType, onProgress);
      } catch (error) {
        lastError = error;
        console.warn(`Part upload attempt ${attempt}/${maxRetries} failed:`, error.message);

        if (attempt < maxRetries) {
          // Exponential backoff: wait 1s, 2s, 3s...
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    throw new Error(`Part upload failed after ${maxRetries} attempts: ${lastError.message}`);
  },

  /**
   * Step 4: Complete multipart upload
   * POST /api/v1/files/multipart/complete
   *
   * @param {Object} params
   * @param {string} params.uploadId - Multipart upload ID
   * @param {string} params.fileKey - S3 file key
   * @param {Array<{partNumber: number, etag: string}>} params.parts - Uploaded parts with ETags
   * @returns {Promise<{fileId: string, s3Key: string, fileUrl: string}>}
   */
  async complete({ uploadId, fileKey, parts }) {
    const { data } = await client.post(
      '/api/v1/files/multipart/complete',
      {
        uploadId,
        fileKey,
        parts
      },
      {
        baseURL: import.meta.env.VITE_FILE_API_URL
      }
    );
    return data;
  },

  /**
   * Step 5: Abort multipart upload
   * POST /api/v1/files/multipart/abort
   *
   * @param {Object} params
   * @param {string} params.uploadId - Multipart upload ID
   * @param {string} params.fileKey - S3 file key
   * @returns {Promise<void>}
   */
  async abort({ uploadId, fileKey }) {
    await client.post(
      '/api/v1/files/multipart/abort',
      {
        uploadId,
        fileKey
      },
      {
        baseURL: import.meta.env.VITE_FILE_API_URL
      }
    );
  },

  /**
   * Complete multipart upload flow
   * Handles file splitting, parallel upload, progress tracking
   *
   * @param {File} file - File to upload
   * @param {Function} onProgress - Progress callback (current, total, percentage)
   * @param {number} concurrentUploads - Number of concurrent part uploads (default: 3)
   * @returns {Promise<{fileId: string, s3Key: string}>}
   */
  async uploadFile(file, onProgress, concurrentUploads = 3) {
    let uploadId, fileKey, partSize;

    try {
      // Step 1: Initiate multipart upload
      const initiateResponse = await this.initiate({
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type
      });

      uploadId = initiateResponse.uploadId;
      fileKey = initiateResponse.fileKey;
      partSize = initiateResponse.partSize;

      console.log(`[Multipart] Initiated upload: ${uploadId}, partSize: ${partSize}`);

      // Step 2: Calculate parts
      const totalParts = Math.ceil(file.size / partSize);
      const partNumbers = Array.from({ length: totalParts }, (_, i) => i + 1);

      console.log(`[Multipart] Total parts: ${totalParts}`);

      // Step 3: Get presigned URLs (can be batched)
      const { urls } = await this.getPresignedUrls({
        uploadId,
        fileKey,
        partNumbers
      });

      console.log(`[Multipart] Got ${urls.length} presigned URLs`);

      // Step 4: Upload parts in parallel batches
      const uploadedParts = [];
      let completedParts = 0;

      // Initial progress report
      if (onProgress) {
        onProgress(0, totalParts, 0);
      }

      for (let i = 0; i < totalParts; i += concurrentUploads) {
        const batch = urls.slice(i, i + concurrentUploads);
        const batchStartIndex = i; // Capture for closure

        const batchResults = await Promise.all(
          batch.map(async ({ partNumber, url }, batchIndex) => {
            const start = (partNumber - 1) * partSize;
            const end = Math.min(start + partSize, file.size);
            const blob = file.slice(start, end);

            console.log(`[Multipart] Uploading part ${partNumber}/${totalParts}`);

            const etag = await this.uploadPartWithRetry(
              url,
              blob,
              file.type,
              3,
              (partProgress) => {
                // Calculate overall progress with current batch position
                const currentCompletedParts = batchStartIndex + batchIndex;
                const overallProgress = Math.round(
                  ((currentCompletedParts + (partProgress / 100)) / totalParts) * 100
                );
                if (onProgress) {
                  onProgress(currentCompletedParts, totalParts, overallProgress);
                }
              }
            );

            return { partNumber, etag };
          })
        );

        uploadedParts.push(...batchResults);
        completedParts += batch.length;

        // Update progress after batch completion
        const overallProgress = Math.round((completedParts / totalParts) * 100);
        if (onProgress) {
          onProgress(completedParts, totalParts, overallProgress);
        }

        console.log(`[Multipart] Completed ${completedParts}/${totalParts} parts (${overallProgress}%)`);
      }

      // Step 5: Complete multipart upload
      console.log('[Multipart] Completing upload...');
      const result = await this.complete({
        uploadId,
        fileKey,
        parts: uploadedParts
      });

      console.log('[Multipart] Upload completed:', result.fileId);
      return result;

    } catch (error) {
      // Abort upload on error
      console.error('[Multipart] Upload failed:', error);
      if (uploadId && fileKey) {
        try {
          console.log('[Multipart] Aborting upload...');
          await this.abort({ uploadId, fileKey });
        } catch (abortError) {
          console.error('[Multipart] Abort failed:', abortError);
        }
      }
      throw error;
    }
  }
};

export default multipartUploadApi;
