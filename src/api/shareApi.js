import axios from 'axios';
import { getAccessToken } from '../utils/auth';

// Share API는 FILE_API_URL (18080 포트)을 사용하고 /api/v1 접두사 필요
const shareClient = axios.create({
  baseURL: `${import.meta.env.VITE_FILE_API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Access Token 주입
shareClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const shareApi = {
  // ========== 폴더 공유 ==========

  /**
   * 폴더를 사용자들과 공유
   * @param {number} folderId - 폴더 ID
   * @param {string[]} userEmails - 공유할 사용자 이메일 배열
   */
  shareFolderWithUsers: async (folderId, userEmails) => {
    const response = await shareClient.post(`/folders/${folderId}/share`, {
      user_emails: userEmails
    });
    return response.data;
  },

  /**
   * 폴더 공유 목록 조회
   * @param {number} folderId - 폴더 ID
   */
  getFolderShares: async (folderId) => {
    const response = await shareClient.get(`/folders/${folderId}/shares`);
    return response.data;
  },

  /**
   * 폴더 공유 취소
   * @param {number} folderId - 폴더 ID
   * @param {number} userId - 공유 취소할 사용자 ID
   */
  revokeFolderShare: async (folderId, userId) => {
    const response = await shareClient.delete(`/folders/${folderId}/shares/${userId}`);
    return response.data;
  },

  /**
   * 나와 공유된 폴더 목록
   */
  getSharedWithMeFolders: async () => {
    const response = await shareClient.get('/folders/shared-with-me');
    return response.data;
  },

  // ========== 파일 공유 ==========

  shareFileWithUsers: async (fileId, userEmails) => {
    const response = await shareClient.post(`/files/${fileId}/share`, {
      user_emails: userEmails
    });
    return response.data;
  },

  getFileShares: async (fileId) => {
    const response = await shareClient.get(`/files/${fileId}/shares`);
    return response.data;
  },

  revokeFileShare: async (fileId, userId) => {
    const response = await shareClient.delete(`/files/${fileId}/shares/${userId}`);
    return response.data;
  },

  getSharedWithMeFiles: async () => {
    const response = await shareClient.get('/files/shared-with-me');
    return response.data;
  },

  // ========== 내가 공유한 항목 ==========

  /**
   * 내가 공유한 폴더 목록
   */
  getSharedByMeFolders: async () => {
    const response = await shareClient.get('/folders/shared-by-me');
    return response.data;
  },

  /**
   * 내가 공유한 파일 목록
   */
  getSharedByMeFiles: async () => {
    const response = await shareClient.get('/files/shared-by-me');
    return response.data;
  }
};
