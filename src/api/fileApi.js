import axios from 'axios';
import client from './client';

/**
 * CloudRepository File API Client
 * Base URL: http://localhost:18080/api/v1
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
    const { data } = await client.post('/api/v1/files/upload', fileInfo);
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
    const { data } = await client.post('/api/v1/files/upload/batch', { files });
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
   * 배치 업로드 플로우
   *
   * @param {Array<File>} files - 업로드할 파일 배열 (최대 30개)
   * @param {Function} onProgress - 진행률 콜백 (fileIndex, progress)
   * @returns {Promise<Array>} 업로드 결과 배열
   */
  async uploadBatchFiles(files, onProgress) {
    if (files.length > 30) {
      throw new Error('최대 30개까지만 업로드할 수 있습니다.');
    }

    // 1. 배치 업로드 URL 요청
    const fileInfos = files.map(file => ({
      file_name: file.name,
      content_type: file.type,
      file_type: file.type.startsWith('image/') ? 'image' : 'video',
      file_size: file.size,
    }));

    const batchResponse = await this.requestBatchUploadUrl(fileInfos);

    // 2. 각 파일을 S3에 업로드
    const uploadPromises = batchResponse.results.map((result, index) => {
      return this.uploadToS3(
        result.upload_url,
        files[index],
        (progress) => {
          if (onProgress) {
            onProgress(index, progress);
          }
        }
      ).then(() => ({
        file_id: result.file_id,
        s3_key: result.s3_key,
        file_name: files[index].name,
      }));
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
    const { data } = await client.get('/api/v1/files', { params });
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
    const { data } = await client.get(`/api/v1/files/${fileId}/download`);
    return data;
  },

  /**
   * 파일 다운로드 (브라우저에서 다운로드 트리거)
   *
   * @param {number} fileId - 파일 ID
   * @param {string} fileName - 저장할 파일명 (optional)
   */
  async downloadFile(fileId, fileName) {
    const { download_url, file_name } = await this.getDownloadUrl(fileId);

    // Create temporary link and trigger download
    const link = document.createElement('a');
    link.href = download_url;
    link.download = fileName || file_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    const { data } = await client.delete(`/api/v1/files/${fileId}`);
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
   * 최대 파일 크기 (100MB)
   */
  MAX_FILE_SIZE: 100 * 1024 * 1024,

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
   * 파일 크기 검증
   *
   * @param {File} file
   * @returns {boolean}
   */
  isValidSize(file) {
    return file.size <= this.MAX_FILE_SIZE;
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

    if (!this.isValidSize(file)) {
      return {
        valid: false,
        error: `파일 크기가 너무 큽니다. (최대 100MB)`,
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
