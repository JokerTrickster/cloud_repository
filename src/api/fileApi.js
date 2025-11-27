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
    await axios.put(uploadUrl, file, {
      headers: {
        'Content-Type': file.type,
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      },
    });
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

    // 1. 비디오 duration 추출 (병렬 처리, 타임아웃 3초)
    const durationPromises = files.map(async (file) => {
      if (file.type.startsWith('video/')) {
        try {
          // 타임아웃 적용 (3초)
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Duration extraction timeout')), 3000)
          );

          return await Promise.race([
            getVideoDuration(file),
            timeoutPromise
          ]);
        } catch (error) {
          console.warn(`Failed to get duration for ${file.name}:`, error);
          return null;
        }
      }
      return null;
    });

    let durations = [];
    try {
      durations = await Promise.all(durationPromises);
    } catch (error) {
      console.warn('Duration extraction failed, continuing without durations:', error);
      durations = files.map(() => null);
    }

    // 2. 배치 업로드 URL 요청 (태그 + duration 포함)
    const fileInfos = files.map((file, index) => {
      const info = {
        file_name: file.name,
        content_type: file.type,
        file_type: file.type.startsWith('image/') ? 'image' : 'video',
        file_size: file.size,
      };

      // 태그와 duration은 서버가 지원하는 경우에만 포함
      const tags = fileTags[index]?.tags || [];
      console.log(`[File ${index}] Tags from fileTags:`, tags);
      if (tags.length > 0) {
        info.tags = tags;
        console.log(`[File ${index}] Tags added to request:`, info.tags);
      } else {
        console.log(`[File ${index}] No tags to add`);
      }

      if (durations[index]) {
        info.duration = durations[index];
        console.log(`[File ${index}] Duration:`, info.duration);
      }

      return info;
    });

    console.log('📤 Sending batch upload request:', JSON.stringify(fileInfos, null, 2));
    const batchResponse = await this.requestBatchUploadUrl(fileInfos);
    console.log('✅ Batch upload response:', batchResponse);

    // 2. 각 파일을 S3에 업로드 (원본 + 썸네일)
    const uploadPromises = batchResponse.results.map(async (result, index) => {
      const file = files[index];

      // 원본 파일 업로드 (진행률 0-80%)
      await this.uploadToS3(
        result.upload_url,
        file,
        (progress) => {
          if (onProgress) {
            // 원본 업로드는 전체의 80%
            onProgress(index, Math.round(progress * 0.8));
          }
        }
      );

      // 썸네일 생성 및 업로드 (진행률 80-100%)
      if (result.thumbnail_upload_url) {
        try {
          let thumbnail = null;

          // 이미지 썸네일 생성
          if (file.type.startsWith('image/')) {
            thumbnail = await generateThumbnail(file, {
              maxWidth: 200,
              maxHeight: 200,
              quality: 0.8
            });
          }
          // 비디오 썸네일 생성 (첫 프레임 캡처)
          else if (file.type.startsWith('video/')) {
            thumbnail = await generateVideoThumbnail(file, {
              maxWidth: 200,
              maxHeight: 200,
              quality: 0.8,
              seekTime: 1 // 1초 시점 캡처
            });
          }

          if (thumbnail) {
            // 썸네일 업로드
            await axios.put(result.thumbnail_upload_url, thumbnail, {
              headers: {
                'Content-Type': 'image/jpeg',
              }
            });
          }
        } catch (err) {
          console.warn(`Failed to upload thumbnail for ${file.name}:`, err);
          // 썸네일 업로드 실패는 무시하고 계속 진행
        }
      }

      // 최종 진행률 100%
      if (onProgress) {
        onProgress(index, 100);
      }

      return {
        file_id: result.file_id,
        s3_key: result.s3_key,
        file_name: file.name,
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
};

export default fileApi;
