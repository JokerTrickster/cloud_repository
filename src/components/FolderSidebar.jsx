import React, { useState } from 'react';
import { Folder, FolderOpen, ChevronRight, ChevronDown, Plus, MoreVertical, Edit2, Trash2, FolderPlus } from 'lucide-react';

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
 */
const FolderSidebar = ({
  folders = [],
  currentFolder,
  onFolderSelect,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveFolder
}) => {
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [contextMenu, setContextMenu] = useState(null); // { folderId, x, y }

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
          onClick={() => onFolderSelect(folder)}
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

  return (
    <div style={{
      width: '280px',
      height: '100%',
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* 헤더 */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>폴더</h3>
        <button
          onClick={() => onCreateFolder(null)}
          style={{
            background: 'var(--primary)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 12px',
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
          폴더
        </button>
      </div>

      {/* 루트 폴더 (전체 파일) */}
      <div
        onClick={() => onFolderSelect(null)}
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
        {folders.length === 0 ? (
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
          folders.map(folder => renderFolder(folder, 0))
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
              top: contextMenu.y,
              left: contextMenu.x,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 1000,
              minWidth: '180px',
              overflow: 'hidden'
            }}
          >
            <div
              onClick={() => {
                onCreateFolder(contextMenu.folder.id);
                closeContextMenu();
              }}
              style={{
                padding: '10px 16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--background)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Plus size={16} />
              하위 폴더 생성
            </div>

            <div
              onClick={() => {
                onRenameFolder(contextMenu.folder);
                closeContextMenu();
              }}
              style={{
                padding: '10px 16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--background)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Edit2 size={16} />
              이름 변경
            </div>

            <div
              onClick={() => {
                if (window.confirm(`"${contextMenu.folder.folder_name}" 폴더를 삭제하시겠습니까?\n폴더 내 파일은 루트로 이동됩니다.`)) {
                  onDeleteFolder(contextMenu.folder.id);
                }
                closeContextMenu();
              }}
              style={{
                padding: '10px 16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                color: 'var(--accent)',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--background)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Trash2 size={16} />
              삭제
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default FolderSidebar;
