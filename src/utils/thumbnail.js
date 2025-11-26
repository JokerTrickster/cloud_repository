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
