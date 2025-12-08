import React, { useState } from 'react';
import { X, Folder, FolderOpen, ChevronRight, ChevronDown, Home } from 'lucide-react';

/**
 * MoveFilesModal - 파일들을 폴더로 이동하는 모달
 *
 * @param {Array<Object>} selectedFiles - 이동할 파일 목록
 * @param {Array<Object>} folders - 폴더 트리 (sub_folders 포함)
 * @param {Function} onClose - 모달 닫기 콜백
 * @param {Function} onMove - 이동 콜백 (targetFolderId) => Promise
 */
const MoveFilesModal = ({
  selectedFiles,
  folders,
  onClose,
  onMove
}) => {
  console.log('[MoveFilesModal] Component mounted:', {
    selectedFilesCount: selectedFiles?.length,
    foldersCount: folders?.length,
    hasOnMove: !!onMove,
    hasOnClose: !!onClose
  });

  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [selectedFolder, setSelectedFolder] = useState(null); // null = 루트
  const [isMoving, setIsMoving] = useState(false);

  // 폴더 확장/축소
  const toggleFolder = (folderId) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  // 이동 처리
  const handleMove = async () => {
    console.log('[MoveFilesModal] handleMove called:', {
      selectedFolder,
      selectedFiles: selectedFiles.length,
      isMoving
    });

    if (isMoving) {
      console.log('[MoveFilesModal] Already moving, ignoring click');
      return;
    }

    setIsMoving(true);
    try {
      console.log('[MoveFilesModal] Calling onMove with folder:', selectedFolder);
      await onMove(selectedFolder);
      console.log('[MoveFilesModal] onMove completed successfully');
      onClose();
    } catch (err) {
      console.error('[MoveFilesModal] Move error:', err);
      alert(err.message || '파일 이동에 실패했습니다.');
    } finally {
      setIsMoving(false);
    }
  };

  // 폴더 트리 렌더링 (재귀)
  const renderFolder = (folder, depth = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolder === folder.id;
    const hasSubFolders = folder.sub_folders && folder.sub_folders.length > 0;

    return (
      <div key={folder.id}>
        {/* 폴더 아이템 */}
        <div
          onClick={() => setSelectedFolder(folder.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '10px 12px',
            paddingLeft: `${12 + depth * 20}px`,
            cursor: 'pointer',
            background: isSelected ? 'var(--primary-10)' : 'transparent',
            borderLeft: isSelected ? '3px solid var(--primary)' : '3px solid transparent',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (!isSelected) e.currentTarget.style.background = 'var(--background)';
          }}
          onMouseLeave={(e) => {
            if (!isSelected) e.currentTarget.style.background = 'transparent';
          }}
        >
          {/* 확장/축소 아이콘 */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              if (hasSubFolders) toggleFolder(folder.id);
            }}
            style={{
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '4px',
              visibility: hasSubFolders ? 'visible' : 'hidden'
            }}
          >
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>

          {/* 폴더 아이콘 */}
          {isExpanded ? (
            <FolderOpen size={18} color="var(--primary)" style={{ marginRight: '8px' }} />
          ) : (
            <Folder size={18} color="var(--primary)" style={{ marginRight: '8px' }} />
          )}

          {/* 폴더명 */}
          <span style={{
            flex: 1,
            fontSize: '14px',
            fontWeight: isSelected ? '600' : '400',
            color: 'var(--text-primary)'
          }}>
            {folder.folder_name}
          </span>

          {/* 파일 개수 */}
          <span style={{
            fontSize: '12px',
            color: 'var(--text-tertiary)',
            marginLeft: '8px'
          }}>
            {folder.file_count}
          </span>
        </div>

        {/* 하위 폴더들 */}
        {isExpanded && hasSubFolders && (
          <div>
            {folder.sub_folders.map(subFolder => renderFolder(subFolder, depth + 1))}
          </div>
        )}
      </div>
    );
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
          maxWidth: '500px',
          maxHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
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
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
              파일 이동
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              {selectedFiles.length}개 파일을 이동할 폴더를 선택하세요
            </p>
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

        {/* Folder List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '8px 0'
        }}>
          {/* 루트 폴더 */}
          <div
            onClick={() => setSelectedFolder(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 16px',
              cursor: 'pointer',
              background: selectedFolder === null ? 'var(--primary-10)' : 'transparent',
              borderLeft: selectedFolder === null ? '3px solid var(--primary)' : '3px solid transparent',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (selectedFolder !== null) e.currentTarget.style.background = 'var(--background)';
            }}
            onMouseLeave={(e) => {
              if (selectedFolder !== null) e.currentTarget.style.background = 'transparent';
            }}
          >
            <Home size={18} color="var(--primary)" style={{ marginRight: '8px' }} />
            <span style={{
              fontSize: '14px',
              fontWeight: selectedFolder === null ? '600' : '400',
              color: 'var(--text-primary)'
            }}>
              루트 (전체 파일)
            </span>
          </div>

          {/* 폴더 트리 */}
          {folders.length === 0 ? (
            <div style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: 'var(--text-tertiary)',
              fontSize: '14px'
            }}>
              <Folder size={48} color="var(--text-tertiary)" style={{ marginBottom: '12px', opacity: 0.3 }} />
              <p style={{ margin: 0 }}>폴더가 없습니다</p>
            </div>
          ) : (
            folders.map(folder => renderFolder(folder, 0))
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {selectedFolder === null ? (
              <span>📁 루트로 이동</span>
            ) : (
              <span>
                📁 선택된 폴더: <strong>
                  {folders.flatMap(f => [f, ...(f.sub_folders || [])])
                    .find(f => f.id === selectedFolder)?.folder_name || '알 수 없음'}
                </strong>
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={onClose}
              disabled={isMoving}
              style={{
                padding: '10px 20px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                cursor: isMoving ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                opacity: isMoving ? 0.5 : 1
              }}
            >
              취소
            </button>
            <button
              onClick={handleMove}
              disabled={isMoving}
              style={{
                padding: '10px 20px',
                background: isMoving ? '#ccc' : 'var(--primary)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: isMoving ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {isMoving ? (
                <>
                  <div style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid white',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                  이동 중...
                </>
              ) : (
                <>이동</>
              )}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default MoveFilesModal;
