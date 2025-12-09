import client from './client';

export const shareApi = {
  // ========== 폴더 공유 ==========

  /**
   * 폴더를 사용자들과 공유
   * @param {number} folderId - 폴더 ID
   * @param {string[]} userEmails - 공유할 사용자 이메일 배열
   */
  shareFolderWithUsers: async (folderId, userEmails) => {
    const response = await client.post(`/folders/${folderId}/share`, {
      user_emails: userEmails
    });
    return response.data;
  },

  /**
   * 폴더 공유 목록 조회
   * @param {number} folderId - 폴더 ID
   */
  getFolderShares: async (folderId) => {
    const response = await client.get(`/folders/${folderId}/shares`);
    return response.data;
  },

  /**
   * 폴더 공유 취소
   * @param {number} folderId - 폴더 ID
   * @param {number} userId - 공유 취소할 사용자 ID
   */
  revokeFolderShare: async (folderId, userId) => {
    const response = await client.delete(`/folders/${folderId}/shares/${userId}`);
    return response.data;
  },

  /**
   * 나와 공유된 폴더 목록
   */
  getSharedWithMeFolders: async () => {
    const response = await client.get('/folders/shared-with-me');
    return response.data;
  },

  // ========== 파일 공유 ==========

  shareFileWithUsers: async (fileId, userEmails) => {
    const response = await client.post(`/files/${fileId}/share`, {
      user_emails: userEmails
    });
    return response.data;
  },

  getFileShares: async (fileId) => {
    const response = await client.get(`/files/${fileId}/shares`);
    return response.data;
  },

  revokeFileShare: async (fileId, userId) => {
    const response = await client.delete(`/files/${fileId}/shares/${userId}`);
    return response.data;
  },

  getSharedWithMeFiles: async () => {
    const response = await client.get('/files/shared-with-me');
    return response.data;
  }
};
