/**
 * 썸네일 생성 유틸리티
 * 이미지 파일을 리사이징하여 썸네일 생성
 */

/**
 * 이미지 파일을 썸네일로 리사이징
 *
 * @param {File} file - 원본 이미지 파일
 * @param {Object} options - 리사이징 옵션
 * @param {number} options.maxWidth - 최대 너비 (기본: 200)
 * @param {number} options.maxHeight - 최대 높이 (기본: 200)
 * @param {number} options.quality - JPEG 품질 (0.0 - 1.0, 기본: 0.8)
 * @returns {Promise<Blob>} 썸네일 Blob
 */
export async function generateThumbnail(file, options = {}) {
  const {
    maxWidth = 200,
    maxHeight = 200,
    quality = 0.8
  } = options;

  // 이미지가 아니면 null 반환
  if (!file.type.startsWith('image/')) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        // 리사이징 계산
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        // Canvas에 그리기
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Blob으로 변환
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create thumbnail blob'));
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = e.target.result;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * 여러 파일에 대해 썸네일 생성
 *
 * @param {Array<File>} files - 파일 배열
 * @param {Object} options - 리사이징 옵션
 * @returns {Promise<Array<Blob|null>>} 썸네일 Blob 배열 (비이미지는 null)
 */
export async function generateThumbnails(files, options = {}) {
  const promises = files.map(file =>
    generateThumbnail(file, options).catch(() => null)
  );
  return Promise.all(promises);
}

/**
 * 비디오 파일에서 썸네일 생성 (첫 프레임 캡처)
 *
 * @param {File} file - 비디오 파일
 * @param {Object} options - 캡처 옵션
 * @param {number} options.maxWidth - 최대 너비 (기본: 200)
 * @param {number} options.maxHeight - 최대 높이 (기본: 200)
 * @param {number} options.quality - JPEG 품질 (0.0 - 1.0, 기본: 0.8)
 * @param {number} options.seekTime - 캡처할 시간 (초, 기본: 1)
 * @returns {Promise<Blob>} 썸네일 Blob
 */
export async function generateVideoThumbnail(file, options = {}) {
  const {
    maxWidth = 200,
    maxHeight = 200,
    quality = 0.8,
    seekTime = 1
  } = options;

  // 비디오가 아니면 null 반환
  if (!file.type.startsWith('video/')) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    video.onloadedmetadata = () => {
      // seekTime 위치로 이동
      video.currentTime = Math.min(seekTime, video.duration - 0.1);
    };

    video.onseeked = () => {
      try {
        // 비디오 크기 계산
        let width = video.videoWidth;
        let height = video.videoHeight;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        // Canvas에 비디오 프레임 그리기
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(video, 0, 0, width, height);

        // Blob으로 변환
        canvas.toBlob(
          (blob) => {
            // 메모리 정리
            URL.revokeObjectURL(video.src);

            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create video thumbnail blob'));
            }
          },
          'image/jpeg',
          quality
        );
      } catch (error) {
        URL.revokeObjectURL(video.src);
        reject(error);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video'));
    };

    // 비디오 로드
    const url = URL.createObjectURL(file);
    video.src = url;
  });
}

/**
 * 비디오 파일의 길이(duration) 추출
 *
 * @param {File} file - 비디오 파일
 * @returns {Promise<number>} 비디오 길이 (초)
 */
export async function getVideoDuration(file) {
  // 비디오가 아니면 null 반환
  if (!file.type.startsWith('video/')) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;

    video.onloadedmetadata = () => {
      // 메모리 정리
      URL.revokeObjectURL(video.src);

      // duration 반환 (초 단위, 소수점 2자리)
      resolve(Math.round(video.duration * 100) / 100);
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video metadata'));
    };

    // 비디오 로드
    const url = URL.createObjectURL(file);
    video.src = url;
  });
}

/**
 * 초를 MM:SS 형식으로 변환
 *
 * @param {number} seconds - 초
 * @returns {string} MM:SS 형식 문자열
 */
export function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) {
    return '00:00';
  }

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
