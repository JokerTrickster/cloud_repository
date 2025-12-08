import React, { useState, useEffect } from 'react';
import { X, Folder, FolderPlus } from 'lucide-react';

/**
 * CreateFolderModal - 폴더 생성 또는 이름 변경 모달
 *
 * @param {Function} onClose - 모달 닫기 콜백
 * @param {Function} onSubmit - 폴더 생성/수정 콜백 (folderName, parentFolderId) => Promise
 * @param {Object|null} editingFolder - 수정할 폴더 정보 (null이면 생성 모드)
 * @param {number|null} defaultParentId - 기본 부모 폴더 ID
 */
const CreateFolderModal = ({
  onClose,
  onSubmit,
  editingFolder = null,
  defaultParentId = null
}) => {
  const [folderName, setFolderName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isEditMode = editingFolder !== null;

  useEffect(() => {
    if (editingFolder) {
      setFolderName(editingFolder.folder_name);
    }
  }, [editingFolder]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedName = folderName.trim();

    // 유효성 검증
    if (!trimmedName) {
      setError('폴더 이름을 입력하세요.');
      return;
    }

    if (trimmedName.length > 100) {
      setError('폴더 이름은 100자 이내로 입력하세요.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onSubmit(trimmedName, defaultParentId);
      onClose();
    } catch (err) {
      console.error('[CreateFolderModal] Submit error:', err);
      setError(err.message || '폴더 생성에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          borderRadius: 'var(--radius-lg)',
          width: '100%',
          maxWidth: '450px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isEditMode ? (
              <Folder size={20} color="var(--primary)" />
            ) : (
              <FolderPlus size={20} color="var(--primary)" />
            )}
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
              {isEditMode ? '폴더 이름 변경' : '새 폴더'}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              color: 'var(--text-secondary)'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit}>
          <div style={{ padding: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '8px',
              color: 'var(--text-primary)'
            }}>
              폴더 이름
            </label>
            <input
              type="text"
              value={folderName}
              onChange={(e) => {
                setFolderName(e.target.value);
                setError('');
              }}
              placeholder="예: 여행 사진, 업무 자료"
              autoFocus
              maxLength={100}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                border: `1px solid ${error ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                if (!error) e.target.style.borderColor = 'var(--primary)';
              }}
              onBlur={(e) => {
                if (!error) e.target.style.borderColor = 'var(--border)';
              }}
            />

            {/* 에러 메시지 */}
            {error && (
              <div style={{
                marginTop: '8px',
                fontSize: '13px',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                ⚠️ {error}
              </div>
            )}

            {/* 설명 */}
            {!isEditMode && (
              <div style={{
                marginTop: '12px',
                fontSize: '12px',
                color: 'var(--text-tertiary)',
                lineHeight: '1.5'
              }}>
                💡 폴더를 생성하여 파일을 체계적으로 관리하세요.
                <br />
                폴더 안에 하위 폴더를 추가할 수도 있습니다.
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px'
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '10px 20px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                color: 'var(--text-primary)',
                opacity: isSubmitting ? 0.5 : 1
              }}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !folderName.trim()}
              style={{
                padding: '10px 20px',
                background: (isSubmitting || !folderName.trim()) ? '#ccc' : 'var(--primary)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: (isSubmitting || !folderName.trim()) ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {isSubmitting ? (
                <>
                  <div style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid white',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                  처리 중...
                </>
              ) : (
                <>
                  {isEditMode ? '변경' : '생성'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default CreateFolderModal;
