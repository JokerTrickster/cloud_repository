import client from './client';

/**
 * Folder API Client
 * Base URL: http://localhost:18080/api/v1 (via VITE_FILE_API_URL)
 *
 * 모든 요청에 Authorization 헤더 필요: Bearer {access_token}
 */

const folderApi = {
  /**
   * 1. 폴더 생성
   * POST /folders
   *
   * @param {Object} folderInfo - 폴더 정보
   * @param {string} folderInfo.folder_name - 폴더명
   * @param {number|null} folderInfo.parent_folder_id - 부모 폴더 ID (null이면 루트)
   * @returns {Promise<Object>} { id, folder_name, parent_folder_id, file_count, created_at, updated_at }
   */
  async createFolder(folderInfo) {
    const { data } = await client.post('/api/v1/folders', folderInfo, {
      baseURL: import.meta.env.VITE_FILE_API_URL
    });
    return data;
  },

  /**
   * 2. 전체 폴더 트리 조회
   * GET /folders
   *
   * @returns {Promise<Array>} 계층적 폴더 구조 배열 (sub_folders 포함)
   */
  async getFolders() {
    const { data } = await client.get('/api/v1/folders', {
      baseURL: import.meta.env.VITE_FILE_API_URL
    });
    return data;
  },

  /**
   * 3. 특정 폴더 상세 조회
   * GET /folders/:id
   *
   * @param {number} folderId - 폴더 ID
   * @returns {Promise<Object>} { id, folder_name, parent_folder_id, file_count, created_at, updated_at }
   */
  async getFolder(folderId) {
    const { data } = await client.get(`/api/v1/folders/${folderId}`, {
      baseURL: import.meta.env.VITE_FILE_API_URL
    });
    return data;
  },

  /**
   * 4. 폴더 수정 (이름 변경 또는 이동)
   * PATCH /folders/:id
   *
   * @param {number} folderId - 폴더 ID
   * @param {Object} updates - 수정할 정보
   * @param {string} [updates.folder_name] - 새 폴더명 (optional)
   * @param {number|null} [updates.parent_folder_id] - 새 부모 폴더 ID (optional)
   * @returns {Promise<Object>} 수정된 폴더 정보
   */
  async updateFolder(folderId, updates) {
    const { data } = await client.patch(`/api/v1/folders/${folderId}`, updates, {
      baseURL: import.meta.env.VITE_FILE_API_URL
    });
    return data;
  },

  /**
   * 5. 폴더 삭제 (소프트 삭제)
   * DELETE /folders/:id
   *
   * @param {number} folderId - 폴더 ID
   * @returns {Promise<Object>} { message }
   *
   * ⚠️ 폴더 내 파일들은 자동으로 루트로 이동됩니다
   */
  async deleteFolder(folderId) {
    const { data } = await client.delete(`/api/v1/folders/${folderId}`, {
      baseURL: import.meta.env.VITE_FILE_API_URL
    });
    return data;
  },

  /**
   * 6. 폴더 내 파일 목록 조회
   * GET /folders/:id/files
   *
   * @param {number|string} folderId - 폴더 ID (0 또는 'root'면 루트 파일 조회)
   * @returns {Promise<Array>} 파일 목록
   */
  async getFolderFiles(folderId) {
    const { data } = await client.get(`/api/v1/folders/${folderId}/files`, {
      baseURL: import.meta.env.VITE_FILE_API_URL
    });
    return data;
  },

  /**
   * 7. 파일 일괄 이동
   * POST /files/batch/move
   *
   * @param {Array<number>} fileIds - 이동할 파일 ID 배열
   * @param {number|null} targetFolderId - 대상 폴더 ID (null이면 루트로 이동)
   * @returns {Promise<Object>} { moved_count, message }
   */
  async moveFiles(fileIds, targetFolderId) {
    const { data } = await client.post('/api/v1/files/batch/move', {
      file_ids: fileIds,
      target_folder_id: targetFolderId
    }, {
      baseURL: import.meta.env.VITE_FILE_API_URL
    });
    return data;
  }
};

export default folderApi;
