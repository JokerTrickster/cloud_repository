import axios from 'axios';
import client from './client';
import { generateThumbnail, generateVideoThumbnail, getVideoDuration } from '../utils/thumbnail';

/**
 * CloudRepository File API Client
 * Base URL: http://localhost:18080/api/v1 (via VITE_FILE_API_URL)
 *
 * 모든 요청에 Authorization 헤더 필요: Bearer {access_token}
 */

const fileApi = {
  /**
   * 1. 파일 업로드 URL 요청 (단일)
   * POST /files/upload
   *
   * @param {Object} fileInfo - 파일 정보
   * @param {string} fileInfo.file_name - 파일명 (예: "photo.jpg")
   * @param {string} fileInfo.content_type - MIME 타입 (예: "image/jpeg")
   * @param {string} fileInfo.file_type - 파일 타입 ("image" | "video")
   * @param {number} fileInfo.file_size - 파일 크기 (bytes)
   * @returns {Promise<Object>} { file_id, upload_url, s3_key, expires_in }
   */
  async requestUploadUrl(fileInfo) {
    const { data } = await client.post('/api/v1/files/upload', fileInfo, {
      baseURL: import.meta.env.VITE_FILE_API_URL
    });
    return data;
  },

  /**
   * 2. 배치 업로드 URL 요청 (최대 30개)
   * POST /files/upload/batch
   *
   * @param {Array<Object>} files - 파일 정보 배열 (최대 30개)
   * @returns {Promise<Object>} { results, total_count, success_count, failed_count }
   */
  async requestBatchUploadUrl(files) {
    if (files.length > 30) {
      throw new Error('최대 30개까지만 업로드할 수 있습니다.');
    }
    const { data } = await client.post('/api/v1/files/upload/batch', { files }, {
      baseURL: import.meta.env.VITE_FILE_API_URL
    });
    return data;
  },

  /**
   * S3에 파일 직접 업로드 (Presigned URL 사용)
   * PUT {upload_url}
   *
   * @param {string} uploadUrl - Presigned URL
   * @param {File} file - 업로드할 파일 객체
   * @param {Function} onProgress - 진행률 콜백 (optional)
   * @returns {Promise<void>}
   */
  async uploadToS3(uploadUrl, file, onProgress) {
    // BUG FIX #4: Infinite Timeout in S3 Upload
    // Set 10-minute timeout with AbortController for graceful cancellation
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minutes

    try {
      await axios.put(uploadUrl, file, {
        headers: {
          'Content-Type': file.type,
        },
        timeout: 600000, // 10 minutes timeout (changed from 0 to prevent infinite wait)
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        signal: controller.signal, // Allow manual cancellation
        onUploadProgress: (progressEvent) => {
          if (onProgress) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(percentCompleted);
          }
        },
      });
    } finally {
      clearTimeout(timeoutId);
    }
  },

  /**
   * 전체 업로드 플로우 (URL 요청 + S3 업로드)
   *
   * @param {File} file - 업로드할 파일
   * @param {Function} onProgress - 진행률 콜백 (optional)
   * @returns {Promise<Object>} { file_id, s3_key }
   */
  async uploadFile(file, onProgress) {
    // 1. 업로드 URL 요청
    const uploadInfo = await this.requestUploadUrl({
      file_name: file.name,
      content_type: file.type,
      file_type: file.type.startsWith('image/') ? 'image' : 'video',
      file_size: file.size,
    });

    // 2. S3에 파일 업로드
    await this.uploadToS3(uploadInfo.upload_url, file, onProgress);

    return {
      file_id: uploadInfo.file_id,
      s3_key: uploadInfo.s3_key,
    };
  },

  /**
   * 배치 업로드 플로우 (썸네일 포함)
   *
   * @param {Array<File>} files - 업로드할 파일 배열 (최대 30개)
   * @param {Function} onProgress - 진행률 콜백 (fileIndex, progress)
   * @param {Object} fileTags - 파일별 태그 정보 { fileIndex: { tags: [string] } }
   * @returns {Promise<Array>} 업로드 결과 배열
   */
  async uploadBatchFiles(files, onProgress, fileTags = {}) {
    if (files.length > 30) {
      throw new Error('최대 30개까지만 업로드할 수 있습니다.');
    }

    // ❌ Duration 추출 제거됨 (백엔드에서 처리)
    // ❌ 썸네일 생성 제거됨 (백엔드에서 처리)

    // 1. 배치 업로드 URL 요청 (태그만 포함)
    const fileInfos = files.map((file, index) => {
      const info = {
        file_name: file.name,
        content_type: file.type,
        file_type: file.type.startsWith('image/') ? 'image' : 'video',
        file_size: file.size,
      };

      // 태그 추가
      const tags = fileTags[index]?.tags || [];
      if (tags.length > 0) {
        info.tags = tags;
      }

      return info;
    });

    console.log('📤 Sending batch upload request:', JSON.stringify(fileInfos, null, 2));
    const batchResponse = await this.requestBatchUploadUrl(fileInfos);
    console.log('✅ Batch upload response:', batchResponse);

    // 2. S3에 원본 파일만 업로드 (썸네일은 백엔드에서 처리)
    const uploadPromises = batchResponse.results.map(async (result, index) => {
      const file = files[index];

      // 초기 상태: 업로드 중
      if (onProgress) {
        onProgress(index, 0, 'uploading');
      }

      // S3에 원본 파일 업로드 (100% 진행률)
      await this.uploadToS3(
        result.upload_url,
        file,
        (progress) => {
          if (onProgress) {
            onProgress(index, progress, 'uploading');
          }
        }
      );

      // BUG FIX #3: Upload Notification Silent Failure
      // Set processing_status flag on failure to track incomplete uploads
      let processingStatus = file.type.startsWith('video/') ? 'processing' : 'completed';

      // 업로드 완료 통지 (백엔드에서 백그라운드 처리 시작)
      try {
        console.log(`📡 Notifying upload completion for file ${result.file_id}...`);
        await client.post(`/api/v1/files/${result.file_id}/complete-upload`, {}, {
          baseURL: import.meta.env.VITE_FILE_API_URL
        });
        console.log(`✅ Upload completion notified for file ${result.file_id}`);
      } catch (err) {
        // Mark as failed if notification fails (backend may not process the file)
        console.error(`❌ Failed to notify upload completion for ${file.name}:`, err);
        processingStatus = 'failed'; // Set status to failed to indicate incomplete upload
      }

      // 최종 진행률 100%
      if (onProgress) {
        onProgress(index, 100, 'completed');
      }

      return {
        file_id: result.file_id,
        s3_key: result.s3_key,
        file_name: file.name,
        // Use updated processing status (reflects notification failure)
        processing_status: processingStatus
      };
    });

    return Promise.all(uploadPromises);
  },

  /**
   * 3. 파일 목록 조회
   * GET /files
   *
   * @param {Object} params - 쿼리 파라미터
   * @param {string} params.file_type - "image" | "video" (optional)
   * @param {string} params.keyword - 파일명/태그 검색 (optional)
   * @param {Array<string>} params.tags - 태그 필터 (optional)
   * @param {string} params.sort - "latest" | "oldest" | "name" | "size" (optional)
   * @param {string} params.start_date - YYYY-MM-DD (optional)
   * @param {string} params.end_date - YYYY-MM-DD (optional)
   * @param {number} params.page - 페이지 번호 (기본: 1)
   * @param {number} params.page_size - 페이지 크기 (기본: 20, 최대: 100)
   * @returns {Promise<Object>} { files, total_count, page, page_size }
   */
  async getFiles(params = {}) {
    const { data } = await client.get('/api/v1/files', {
      params,
      baseURL: import.meta.env.VITE_FILE_API_URL
    });
    return data;
  },

  /**
   * 4. 파일 다운로드 URL 요청
   * GET /files/:id/download
   *
   * @param {number} fileId - 파일 ID
   * @returns {Promise<Object>} { download_url, file_name, expires_in }
   */
  async getDownloadUrl(fileId) {
    const { data } = await client.get(`/api/v1/files/${fileId}/download`, {
      baseURL: import.meta.env.VITE_FILE_API_URL
    });
    return data;
  },

  /**
   * 파일 다운로드 (브라우저에서 다운로드 트리거)
   *
   * @param {number} fileId - 파일 ID
   * @param {string} fileName - 저장할 파일명 (optional)
   */
  async downloadFile(fileId, fileName) {
    try {
      const { download_url, file_name } = await this.getDownloadUrl(fileId);
      const finalFileName = fileName || file_name;

      try {
        // Method 1: Fetch as blob (best for CORS-enabled URLs)
        const response = await fetch(download_url, {
          mode: 'cors',
          credentials: 'omit'
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        // Trigger download
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = finalFileName;
        link.style.display = 'none';

        document.body.appendChild(link);
        link.click();

        // Cleanup
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        }, 100);

      } catch (fetchError) {
        console.warn('Blob download failed, trying direct download:', fetchError);

        // Method 2: Fallback to direct link (for CORS issues)
        // This may open in browser instead of downloading on some browsers
        const link = document.createElement('a');
        link.href = download_url;
        link.download = finalFileName;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.style.display = 'none';

        document.body.appendChild(link);
        link.click();

        setTimeout(() => {
          document.body.removeChild(link);
        }, 100);
      }

    } catch (error) {
      console.error('Download failed:', error);
      throw new Error(`파일 다운로드에 실패했습니다: ${error.message}`);
    }
  },

  /**
   * 배치 다운로드 (여러 파일을 순차적으로 다운로드)
   *
   * @param {Array<number>} fileIds - 파일 ID 배열
   */
  async downloadBatchFiles(fileIds) {
    for (const fileId of fileIds) {
      await this.downloadFile(fileId);
      // 브라우저의 다운로드 제한을 피하기 위해 약간의 딜레이
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  },

  /**
   * 5. 파일 삭제
   * DELETE /files/:id
   *
   * @param {number} fileId - 파일 ID
   * @returns {Promise<Object>} { message }
   */
  async deleteFile(fileId) {
    const { data } = await client.delete(`/api/v1/files/${fileId}`, {
      baseURL: import.meta.env.VITE_FILE_API_URL
    });
    return data;
  },

  /**
   * 배치 삭제
   *
   * @param {Array<number>} fileIds - 파일 ID 배열
   * @returns {Promise<Array>} 삭제 결과 배열
   */
  async deleteBatchFiles(fileIds) {
    const deletePromises = fileIds.map(fileId =>
      this.deleteFile(fileId).catch(error => ({
        fileId,
        error: error.message,
      }))
    );
    return Promise.all(deletePromises);
  },

  /**
   * 6. 사용자 통계 조회
   * GET /api/v1/user/stats
   *
   * @returns {Promise<Object>} { storage: { used, total, percentage }, monthlyStats: { uploads, downloads, tagsCreated } }
   */
  async getUserStats() {
    const { data } = await client.get('/api/v1/user/stats', {
      baseURL: import.meta.env.VITE_FILE_API_URL
    });
    return data;
  },

  /**
   * 7. 활동 내역 조회
   * GET /api/v1/user/activity
   *
   * @param {string} month - 조회할 년월 (형식: YYYY-MM)
   * @returns {Promise<Object>} { "2025-11-26": { uploads, downloads, tags }, ... }
   */
  async getActivity(month) {
    const { data } = await client.get('/api/v1/user/activity', {
      params: { month },
      baseURL: import.meta.env.VITE_FILE_API_URL
    });
    return data;
  },

  /**
   * 8. 즐겨찾기 추가
   * POST /api/v1/favorites
   *
   * @param {number} fileId - 파일 ID
   * @returns {Promise<Object>} { success, favoritedAt }
   */
  async addFavorite(fileId) {
    console.log('[API] Adding favorite:', { fileId, type: typeof fileId });
    const { data } = await client.post('/api/v1/favorites',
      { fileId },
      { baseURL: import.meta.env.VITE_FILE_API_URL }
    );
    console.log('[API] Add favorite response:', data);
    return data;
  },

  /**
   * 9. 즐겨찾기 해제
   * DELETE /api/v1/favorites/:fileId
   *
   * @param {number} fileId - 파일 ID
   * @returns {Promise<void>} 204 No Content
   */
  async removeFavorite(fileId) {
    console.log('[API] Removing favorite:', { fileId, type: typeof fileId });
    await client.delete(`/api/v1/favorites/${fileId}`, {
      baseURL: import.meta.env.VITE_FILE_API_URL
    });
    console.log('[API] Remove favorite success');
  },

  /**
   * 10. 즐겨찾기 토글 (추가/해제)
   *
   * @param {number} fileId - 파일 ID
   * @param {boolean} isFavorite - 현재 즐겨찾기 상태
   * @returns {Promise<Object>}
   */
  async toggleFavorite(fileId, isFavorite) {
    if (isFavorite) {
      return this.removeFavorite(fileId);
    } else {
      return this.addFavorite(fileId);
    }
  },

  /**
   * 11. 즐겨찾기 목록 조회
   * GET /api/v1/favorites
   *
   * @param {Object} params - 쿼리 파라미터
   * @param {number} params.page - 페이지 번호 (기본: 1)
   * @param {number} params.size - 페이지 크기 (기본: 20, 최대: 100)
   * @param {string} params.sort - 정렬 기준 (uploadDate, fileName)
   * @param {string} params.order - 정렬 순서 (asc, desc)
   * @param {string} params.q - 파일명 검색
   * @param {string} params.ext - 확장자 필터
   * @param {string} params.tag - 태그 필터
   * @returns {Promise<Object>} { data: [...], pagination: {...} }
   */
  async getFavorites(params = {}) {
    const { data } = await client.get('/api/v1/favorites', {
      params,
      baseURL: import.meta.env.VITE_FILE_API_URL
    });
    return data;
  },
};

/**
 * 파일 검증 유틸리티
 */
export const fileValidation = {
  /**
   * 허용된 MIME 타입
   */
  ALLOWED_TYPES: {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    video: ['video/mp4', 'video/webm', 'video/avi', 'video/mov'],
  },

  /**
   * 파일 타입 검증
   *
   * @param {File} file
   * @returns {boolean}
   */
  isValidType(file) {
    const allAllowedTypes = [
      ...this.ALLOWED_TYPES.image,
      ...this.ALLOWED_TYPES.video,
    ];
    return allAllowedTypes.includes(file.type);
  },

  /**
   * 전체 검증
   *
   * @param {File} file
   * @returns {{ valid: boolean, error?: string }}
   */
  validate(file) {
    if (!this.isValidType(file)) {
      return {
        valid: false,
        error: `지원하지 않는 파일 형식입니다. (${file.type})`,
      };
    }

    return { valid: true };
  },

  /**
   * 파일 배열 검증
   *
   * @param {Array<File>} files
   * @returns {{ valid: boolean, errors: Array<string> }}
   */
  validateBatch(files) {
    const errors = [];

    if (files.length > 30) {
      errors.push('최대 30개까지만 업로드할 수 있습니다.');
    }

    files.forEach((file, index) => {
      const result = this.validate(file);
      if (!result.valid) {
        errors.push(`${index + 1}. ${file.name}: ${result.error}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  /**
   * 파일 처리 상태 조회
   * GET /files/:id/processing-status
   *
   * @param {number} fileId - 파일 ID
   * @returns {Promise<Object>} 처리 상태 정보
   */
  async getProcessingStatus(fileId) {
    const { data } = await client.get(`/api/v1/files/${fileId}/processing-status`, {
      baseURL: import.meta.env.VITE_FILE_API_URL
    });
    return data;
  },

  /**
   * 배치 파일 처리 상태 조회
   * POST /files/processing-status/batch
   *
   * @param {Array<number>} fileIds - 파일 ID 배열
   * @returns {Promise<Object>} { results: Array<Object> }
   */
  async getBatchProcessingStatus(fileIds) {
    const { data } = await client.post('/api/v1/files/processing-status/batch',
      { file_ids: fileIds },
      { baseURL: import.meta.env.VITE_FILE_API_URL }
    );
    return data;
  },

  /**
   * 파일 태그 일괄 업데이트 (기존 태그 교체)
   * PUT /api/v1/files/:id/tags
   *
   * @param {number} fileId - 파일 ID
   * @param {string[]} tags - 새로운 태그 배열
   * @returns {Promise<{file_id: number, tags: string[], updated_at: string}>}
   */
  async updateFileTags(fileId, tags) {
    const { data } = await client.put(
      `/api/v1/files/${fileId}/tags`,
      { tags },
      { baseURL: import.meta.env.VITE_FILE_API_URL }
    );
    return data;
  },

  /**
   * 파일에 태그 추가
   * POST /api/v1/files/:id/tags
   *
   * @param {number} fileId - 파일 ID
   * @param {string} tag - 추가할 태그
   * @returns {Promise<{file_id: number, tag: string, updated_at: string}>}
   */
  async addFileTag(fileId, tag) {
    const { data } = await client.post(
      `/api/v1/files/${fileId}/tags`,
      { tag },
      { baseURL: import.meta.env.VITE_FILE_API_URL }
    );
    return data;
  },

  /**
   * 파일에서 태그 삭제
   * DELETE /api/v1/files/:id/tags/:tag
   *
   * @param {number} fileId - 파일 ID
   * @param {string} tag - 삭제할 태그
   * @returns {Promise<void>}
   */
  async removeFileTag(fileId, tag) {
    await client.delete(
      `/api/v1/files/${fileId}/tags/${encodeURIComponent(tag)}`,
      { baseURL: import.meta.env.VITE_FILE_API_URL }
    );
  }
};

export default fileApi;
