import React, { useState, useEffect } from 'react';
import { Folder, FolderOpen, ChevronRight, ChevronDown, Plus, MoreVertical, Edit2, Trash2, FolderPlus, X, Share } from 'lucide-react';

/**
 * FolderSidebar - 계층적 폴더 구조 표시 및 관리
 *
 * @param {Array} folders - 폴더 트리 데이터 (sub_folders 포함)
 * @param {Object|null} currentFolder - 현재 선택된 폴더
 * @param {Function} onFolderSelect - 폴더 선택 콜백
 * @param {Function} onCreateFolder - 폴더 생성 콜백
 * @param {Function} onRenameFolder - 폴더 이름 변경 콜백
 * @param {Function} onDeleteFolder - 폴더 삭제 콜백
 * @param {Function} onMoveFolder - 폴더 이동 콜백
 * @param {Function} onShare - 폴더 공유 콜백
 * @param {boolean} isOpen - 모바일에서 사이드바 열림 상태
 * @param {Function} onClose - 모바일에서 사이드바 닫기 콜백
 */
const FolderSidebar = ({
  folders,
  currentFolder,
  onFolderSelect,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveFolder,
  onShare,
  isOpen = true,
  onClose
}) => {
  const safeFolders = folders || [];
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [contextMenu, setContextMenu] = useState(null); // { folderId, x, y }
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 폴더 확장/축소 토글
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

  // 컨텍스트 메뉴 열기
  const handleContextMenu = (e, folder) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      folder,
      x: e.clientX,
      y: e.clientY
    });
  };

  // 컨텍스트 메뉴 닫기
  const closeContextMenu = () => {
    setContextMenu(null);
  };

  // 폴더 트리 렌더링 (재귀)
  const renderFolder = (folder, depth = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = currentFolder?.id === folder.id;
    const hasSubFolders = folder.sub_folders && folder.sub_folders.length > 0;

    return (
      <div key={folder.id} style={{ userSelect: 'none' }}>
        {/* 폴더 아이템 */}
        <div
          onClick={() => handleFolderClick(folder)}
          onContextMenu={(e) => handleContextMenu(e, folder)}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 12px',
            paddingLeft: `${12 + depth * 20}px`,
            cursor: 'pointer',
            background: isSelected ? 'var(--primary-10)' : 'transparent',
            borderLeft: isSelected ? '3px solid var(--primary)' : '3px solid transparent',
            transition: 'all 0.2s',
            ':hover': {
              background: 'var(--background)'
            }
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = isSelected ? 'var(--primary-10)' : 'var(--background)'}
          onMouseLeave={(e) => e.currentTarget.style.background = isSelected ? 'var(--primary-10)' : 'transparent'}
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
            <FolderOpen size={18} color="var(--primary)" style={{ marginRight: '8px', flexShrink: 0 }} />
          ) : (
            <Folder size={18} color="var(--primary)" style={{ marginRight: '8px', flexShrink: 0 }} />
          )}

          {/* 폴더명 */}
          <span style={{
            flex: 1,
            fontSize: '14px',
            fontWeight: isSelected ? '600' : '400',
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
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

          {/* 모바일 더보기 버튼 */}
          {isMobile && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleContextMenu(e, folder);
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                marginLeft: '4px',
                display: 'flex',
                alignItems: 'center',
                color: 'var(--text-secondary)',
                minWidth: '44px',
                minHeight: '44px',
                justifyContent: 'center'
              }}
            >
              <MoreVertical size={18} />
            </button>
          )}
        </div>

        {/* 하위 폴더들 (재귀 렌더링) */}
        {isExpanded && hasSubFolders && (
          <div>
            {folder.sub_folders.map(subFolder => renderFolder(subFolder, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Handle folder selection for mobile (auto-close sidebar)
  const handleFolderClick = (folder) => {
    onFolderSelect(folder);
    if (isMobile && onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {isMobile && isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 998,
            animation: 'fadeIn 0.3s ease'
          }}
        />
      )}

      {/* Sidebar */}
      <div style={{
        position: isMobile ? 'fixed' : 'relative',
        top: isMobile ? 0 : 'auto',
        left: isMobile ? (isOpen ? 0 : '-100%') : 'auto',
        width: isMobile ? '85%' : '280px',
        maxWidth: isMobile ? '320px' : 'none',
        height: '100%',
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: isMobile ? 999 : 'auto',
        transition: 'left 0.3s ease',
        boxShadow: isMobile ? '2px 0 8px rgba(0,0,0,0.1)' : 'none'
      }}>
        {/* 헤더 */}
        <div style={{
          padding: '16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>폴더</h3>
            {isMobile && onClose && (
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
            )}
          </div>
          <button
            onClick={() => onCreateFolder(null)}
            style={{
              background: 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              padding: isMobile ? '8px' : '6px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '13px',
              fontWeight: '500'
            }}
            title="새 폴더"
          >
            <Plus size={16} />
            {!isMobile && '폴더'}
          </button>
        </div>

        {/* 루트 폴더 (전체 파일) */}
        <div
          onClick={() => handleFolderClick(null)}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 16px',
            cursor: 'pointer',
            background: currentFolder === null ? 'var(--primary-10)' : 'transparent',
            borderLeft: currentFolder === null ? '3px solid var(--primary)' : '3px solid transparent',
            borderBottom: '1px solid var(--border)',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (currentFolder !== null) e.currentTarget.style.background = 'var(--background)';
          }}
          onMouseLeave={(e) => {
            if (currentFolder !== null) e.currentTarget.style.background = 'transparent';
          }}
        >
          <FolderOpen size={18} color="var(--primary)" style={{ marginRight: '8px' }} />
          <span style={{
            fontSize: '14px',
            fontWeight: currentFolder === null ? '600' : '400',
            color: 'var(--text-primary)'
          }}>
            전체 파일
          </span>
        </div>

        {/* 폴더 트리 */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden'
        }}>
          {safeFolders.length === 0 ? (
            <div style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: 'var(--text-tertiary)',
              fontSize: '14px'
            }}>
              <FolderPlus size={48} color="var(--text-tertiary)" style={{ marginBottom: '12px', opacity: 0.3 }} />
              <p style={{ margin: 0 }}>폴더가 없습니다</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>상단 버튼으로 폴더를 생성하세요</p>
            </div>
          ) : (
            safeFolders.map(folder => renderFolder(folder, 0))
          )}
        </div>

        {/* 컨텍스트 메뉴 */}
        {contextMenu && (
          <>
            {/* 배경 클릭으로 닫기 */}
            <div
              onClick={closeContextMenu}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 999
              }}
            />

            {/* 메뉴 */}
            <div
              style={{
                position: 'fixed',
                // 모바일: 하단 고정, 데스크탑: 클릭 위치
                ...(isMobile ? {
                  bottom: 0,
                  left: 0,
                  right: 0,
                  borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0'
                } : {
                  top: contextMenu.y,
                  left: contextMenu.x,
                  borderRadius: 'var(--radius-md)'
                }),
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 1000,
                minWidth: isMobile ? 'auto' : '180px',
                overflow: 'hidden',
                maxHeight: isMobile ? '80vh' : 'auto'
              }}
            >
              <div
                onClick={() => {
                  onCreateFolder(contextMenu.folder.id);
                  closeContextMenu();
                }}
                style={{
                  padding: isMobile ? '16px 20px' : '10px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: isMobile ? '16px' : '14px',
                  transition: 'background 0.2s',
                  minHeight: isMobile ? '56px' : 'auto'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--background)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <Plus size={isMobile ? 20 : 16} />
                하위 폴더 생성
              </div>

              {onShare && (
                <div
                  onClick={() => {
                    onShare('folder', contextMenu.folder.id, contextMenu.folder.folder_name);
                    closeContextMenu();
                  }}
                  style={{
                    padding: isMobile ? '16px 20px' : '10px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: isMobile ? '16px' : '14px',
                    transition: 'background 0.2s',
                    minHeight: isMobile ? '56px' : 'auto'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--background)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <Share size={isMobile ? 20 : 16} />
                  공유
                </div>
              )}

              <div
                onClick={() => {
                  onRenameFolder(contextMenu.folder);
                  closeContextMenu();
                }}
                style={{
                  padding: isMobile ? '16px 20px' : '10px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: isMobile ? '16px' : '14px',
                  transition: 'background 0.2s',
                  minHeight: isMobile ? '56px' : 'auto'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--background)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <Edit2 size={isMobile ? 20 : 16} />
                이름 변경
              </div>

              <div
                onClick={() => {
                  const folder = contextMenu.folder;
                  const hasSubFolders = folder.sub_folders && folder.sub_folders.length > 0;
                  const fileCount = folder.file_count || 0;

                  // Check for subfolders first
                  if (hasSubFolders) {
                    alert(`"${folder.folder_name}" 폴더에 하위 폴더가 있습니다.\n먼저 하위 폴더를 삭제하거나 이동해주세요.`);
                    closeContextMenu();
                    return;
                  }

                  // Build confirmation message based on file count
                  let confirmMessage;
                  if (fileCount > 0) {
                    confirmMessage = `"${folder.folder_name}" 폴더에 ${fileCount}개의 파일이 있습니다.\n\n폴더를 삭제하면 모든 파일이 루트 폴더로 이동됩니다.\n\n계속하시겠습니까?`;
                  } else {
                    confirmMessage = `"${folder.folder_name}" 폴더를 삭제하시겠습니까?`;
                  }

                  if (window.confirm(confirmMessage)) {
                    onDeleteFolder(folder.id);
                  }
                  closeContextMenu();
                }}
                style={{
                  padding: isMobile ? '16px 20px' : '10px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: isMobile ? '16px' : '14px',
                  color: 'var(--accent)',
                  transition: 'background 0.2s',
                  minHeight: isMobile ? '56px' : 'auto',
                  borderTop: isMobile ? '1px solid var(--border)' : 'none'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--background)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <Trash2 size={isMobile ? 20 : 16} />
                삭제
              </div>

              {/* Mobile bottom spacer for safe area */}
              {isMobile && (
                <div style={{
                  height: 'calc(80px + env(safe-area-inset-bottom, 0px))',
                  background: 'transparent',
                  flexShrink: 0
                }} />
              )}
            </div>
          </>
        )}

        {/* CSS Animations */}
        <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @media (max-width: 768px) {
          /* Increase touch targets for mobile */
          button {
            min-height: 44px;
            min-width: 44px;
          }
        }
      `}</style>
      </div>
    </>
  );
};

export default FolderSidebar;
