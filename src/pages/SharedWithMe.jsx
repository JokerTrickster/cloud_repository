import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Folder, File, User, Download, FolderOpen, Image, Video, Users, UserPlus, UserMinus, Trash2, X } from 'lucide-react';
import { shareApi } from '../api/shareApi';
import fileApi from '../api/fileApi';
import ShareModal from '../components/ShareModal';

const SharedWithMe = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('received'); // 'received' or 'shared'
  const [activeTab, setActiveTab] = useState('folders'); // 'folders' or 'files'

  // 공유받은 항목
  const [receivedFolders, setReceivedFolders] = useState([]);
  const [receivedFiles, setReceivedFiles] = useState([]);

  // 내가 공유한 항목
  const [sharedFolders, setSharedFolders] = useState([]);
  const [sharedFiles, setSharedFiles] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Share management modal state
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null); // {type: 'folder'|'file', id, name}

  // Load items when view mode changes
  useEffect(() => {
    if (viewMode === 'received') {
      loadReceivedItems();
    } else {
      loadSharedItems();
    }
  }, [viewMode]);

  // Load 공유받은 항목
  const loadReceivedItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const [foldersResponse, filesResponse] = await Promise.all([
        shareApi.getSharedWithMeFolders(),
        shareApi.getSharedWithMeFiles()
      ]);

      const folders = Array.isArray(foldersResponse) ? foldersResponse : (foldersResponse.folders || foldersResponse.data || []);
      const files = Array.isArray(filesResponse) ? filesResponse : (filesResponse.files || filesResponse.data || []);

      setReceivedFolders(folders);
      setReceivedFiles(files);
    } catch (err) {
      console.error('[SharedWithMe] Failed to load received items:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || '공유받은 항목을 불러오는데 실패했습니다.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Load 내가 공유한 항목
  const loadSharedItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const [foldersResponse, filesResponse] = await Promise.all([
        shareApi.getSharedByMeFolders(),
        shareApi.getSharedByMeFiles()
      ]);

      const folders = Array.isArray(foldersResponse) ? foldersResponse : (foldersResponse.folders || foldersResponse.data || []);
      const files = Array.isArray(filesResponse) ? filesResponse : (filesResponse.files || filesResponse.data || []);

      setSharedFolders(folders);
      setSharedFiles(files);
    } catch (err) {
      console.error('[SharedWithMe] Failed to load shared items:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || '내가 공유한 항목을 불러오는데 실패했습니다.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Download file handler
  const handleDownloadFile = async (file) => {
    try {
      await fileApi.downloadFile(file.id, file.file_name);
    } catch (err) {
      console.error('[SharedWithMe] Download failed:', err);
      alert('다운로드에 실패했습니다.');
    }
  };

  // Open folder to view files
  const handleOpenFolder = (folder) => {
    navigate(`/shared-folder/${folder.id}`);
  };

  // Open share management modal
  const handleManageShare = (type, id, name) => {
    setSelectedItem({ type, id, name });
    setShareModalOpen(true);
  };

  // Remove specific user from share
  const handleRemoveUser = async (userId, userName) => {
    if (!selectedItem) return;

    if (!confirm(`${userName}님과의 공유를 해제하시겠습니까?`)) return;

    try {
      if (selectedItem.type === 'folder') {
        await shareApi.revokeFolderShare(selectedItem.id, userId);
      } else {
        await shareApi.revokeFileShare(selectedItem.id, userId);
      }

      alert('공유가 해제되었습니다.');

      // Reload items
      if (viewMode === 'shared') {
        loadSharedItems();
      }
    } catch (err) {
      console.error('[SharedWithMe] Failed to remove user:', err);
      alert('공유 해제에 실패했습니다.');
    }
  };

  // Unshare with all users
  const handleUnshareAll = async (item) => {
    const itemName = item.type === 'folder' ? item.folder_name : item.file_name;

    if (!confirm(`"${itemName}"의 모든 공유를 해제하시겠습니까?`)) return;

    try {
      const sharedUsers = item.shared_with || [];

      // Remove all users sequentially
      for (const user of sharedUsers) {
        if (item.type === 'folder') {
          await shareApi.revokeFolderShare(item.id, user.id);
        } else {
          await shareApi.revokeFileShare(item.id, user.id);
        }
      }

      alert('모든 공유가 해제되었습니다.');

      // Reload items
      if (viewMode === 'shared') {
        loadSharedItems();
      }
    } catch (err) {
      console.error('[SharedWithMe] Failed to unshare all:', err);
      alert('공유 해제에 실패했습니다.');
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // 현재 표시할 데이터
  const currentFolders = viewMode === 'received' ? receivedFolders : sharedFolders;
  const currentFiles = viewMode === 'received' ? receivedFiles : sharedFiles;

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* 헤더 */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>
          공유 관리
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          공유받은 항목과 내가 공유한 항목을 관리하세요
        </p>
      </div>

      {/* 상위 탭: 공유받은 항목 / 내가 공유한 항목 */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '16px',
        borderBottom: '2px solid var(--border)'
      }}>
        <button
          onClick={() => setViewMode('received')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: viewMode === 'received' ? '3px solid var(--primary)' : '3px solid transparent',
            color: viewMode === 'received' ? 'var(--primary)' : 'var(--text-secondary)',
            fontSize: '15px',
            fontWeight: viewMode === 'received' ? '600' : '400',
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginBottom: '-2px'
          }}
        >
          <Download size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
          공유받은 항목
        </button>
        <button
          onClick={() => setViewMode('shared')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: viewMode === 'shared' ? '3px solid var(--primary)' : '3px solid transparent',
            color: viewMode === 'shared' ? 'var(--primary)' : 'var(--text-secondary)',
            fontSize: '15px',
            fontWeight: viewMode === 'shared' ? '600' : '400',
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginBottom: '-2px'
          }}
        >
          <Users size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
          내가 공유한 항목
        </button>
      </div>

      {/* 하위 탭: 폴더 / 파일 */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '1px solid var(--border)',
        marginBottom: '24px'
      }}>
        <button
          onClick={() => setActiveTab('folders')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'folders' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'folders' ? 'var(--primary)' : 'var(--text-secondary)',
            fontSize: '14px',
            fontWeight: activeTab === 'folders' ? '600' : '400',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <Folder size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
          폴더 ({currentFolders.length})
        </button>
        <button
          onClick={() => setActiveTab('files')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'files' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'files' ? 'var(--primary)' : 'var(--text-secondary)',
            fontSize: '14px',
            fontWeight: activeTab === 'files' ? '600' : '400',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <File size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
          파일 ({currentFiles.length})
        </button>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div style={{
          padding: '12px',
          background: '#FEE2E2',
          border: '1px solid #FCA5A5',
          borderRadius: 'var(--radius-sm)',
          color: '#DC2626',
          marginBottom: '16px',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      {/* 로딩 */}
      {loading ? (
        <div style={{
          textAlign: 'center',
          padding: '80px 20px',
          color: 'var(--text-tertiary)',
          fontSize: '14px'
        }}>
          로딩 중...
        </div>
      ) : (
        <>
          {/* 폴더 탭 */}
          {activeTab === 'folders' && (
            <div>
              {currentFolders.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '80px 20px',
                  color: 'var(--text-tertiary)',
                  fontSize: '14px'
                }}>
                  <FolderOpen size={64} color="var(--text-tertiary)" style={{ marginBottom: '16px', opacity: 0.3 }} />
                  <div style={{ fontSize: '16px', marginBottom: '8px' }}>
                    {viewMode === 'received' ? '공유받은 폴더가 없습니다' : '공유한 폴더가 없습니다'}
                  </div>
                  <div>
                    {viewMode === 'received'
                      ? '다른 사용자가 폴더를 공유하면 여기에 표시됩니다'
                      : '폴더를 다른 사용자와 공유하면 여기에 표시됩니다'}
                  </div>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '16px'
                }}>
                  {currentFolders.map((folder) => (
                    <div
                      key={folder.id}
                      onClick={() => {
                        // 공유받은 폴더만 클릭 가능 (파일 목록 보기)
                        if (viewMode === 'received') {
                          handleOpenFolder(folder);
                        }
                      }}
                      style={{
                        padding: '20px',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        cursor: viewMode === 'received' ? 'pointer' : 'default',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (viewMode === 'received') {
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                          e.currentTarget.style.borderColor = 'var(--primary)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.borderColor = 'var(--border)';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '16px' }}>
                        <Folder size={32} color="var(--primary)" style={{ marginRight: '12px', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: '16px',
                            fontWeight: '500',
                            marginBottom: '4px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {folder.folder_name}
                          </div>
                          <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                            {folder.file_count || 0}개 파일
                          </div>
                        </div>
                      </div>

                      {/* 공유받은 항목: 소유자 표시 */}
                      {viewMode === 'received' && (
                        <>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '12px',
                            background: 'var(--background)',
                            borderRadius: 'var(--radius-sm)',
                            marginBottom: '12px'
                          }}>
                            <User size={16} color="var(--text-secondary)" style={{ marginRight: '8px', flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                                <div style={{ fontSize: '13px', fontWeight: '500' }}>
                                  {folder.owner_name || folder.owner?.name || '알 수 없음'}
                                </div>
                                <span style={{
                                  fontSize: '10px',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  background: folder.permission === 'write' ? '#DCFCE7' : '#F3F4F6',
                                  color: folder.permission === 'write' ? '#16A34A' : '#6B7280',
                                  fontWeight: '600'
                                }}>
                                  {folder.permission === 'write' ? '읽기/쓰기' : '읽기 전용'}
                                </span>
                              </div>
                              <div style={{
                                fontSize: '12px',
                                color: 'var(--text-tertiary)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {folder.owner_email || folder.owner?.email || ''}
                              </div>
                            </div>
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: folder.permission === 'write' ? '12px' : '0' }}>
                            공유: {formatDate(folder.shared_at)}
                          </div>

                          {/* 업로드 버튼 (write 권한만) */}
                          {folder.permission === 'write' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                alert('공유 폴더에 파일 업로드 기능은 곧 추가됩니다.');
                                // TODO: 업로드 모달 구현
                              }}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                background: 'var(--primary)',
                                color: 'white',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: '500',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                transition: 'opacity 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="17 8 12 3 7 8"></polyline>
                                <line x1="12" y1="3" x2="12" y2="15"></line>
                              </svg>
                              파일 업로드
                            </button>
                          )}
                        </>
                      )}

                      {/* 내가 공유한 항목: 공유받은 사용자 표시 */}
                      {viewMode === 'shared' && (
                        <>
                          <div style={{
                            padding: '12px',
                            background: 'var(--background)',
                            borderRadius: 'var(--radius-sm)',
                            marginBottom: '12px'
                          }}>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                              공유된 사용자 ({folder.shared_with?.length || 0}명)
                            </div>
                            {(folder.shared_with || []).slice(0, 3).map((user) => (
                              <div key={user.id} style={{
                                fontSize: '13px',
                                marginBottom: '4px',
                                display: 'flex',
                                alignItems: 'center'
                              }}>
                                <User size={12} style={{ marginRight: '6px', flexShrink: 0 }} />
                                <span style={{ fontWeight: '500', marginRight: '4px' }}>{user.name}</span>
                                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>({user.email})</span>
                              </div>
                            ))}
                            {(folder.shared_with?.length || 0) > 3 && (
                              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                외 {folder.shared_with.length - 3}명
                              </div>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '12px' }}>
                            생성: {formatDate(folder.created_at)}
                          </div>

                          {/* 공유 관리 버튼들 */}
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleManageShare('folder', folder.id, folder.folder_name);
                              }}
                              style={{
                                flex: 1,
                                padding: '8px 12px',
                                background: 'var(--primary)',
                                color: 'white',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: '500',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                transition: 'opacity 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                            >
                              <UserPlus size={14} />
                              사용자 추가
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUnshareAll({ ...folder, type: 'folder' });
                              }}
                              style={{
                                padding: '8px 12px',
                                background: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: '500',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                transition: 'opacity 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                            >
                              <Trash2 size={14} />
                              전체 해제
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 파일 탭 */}
          {activeTab === 'files' && (
            <div>
              {currentFiles.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '80px 20px',
                  color: 'var(--text-tertiary)',
                  fontSize: '14px'
                }}>
                  <File size={64} color="var(--text-tertiary)" style={{ marginBottom: '16px', opacity: 0.3 }} />
                  <div style={{ fontSize: '16px', marginBottom: '8px' }}>
                    {viewMode === 'received' ? '공유받은 파일이 없습니다' : '공유한 파일이 없습니다'}
                  </div>
                  <div>
                    {viewMode === 'received'
                      ? '다른 사용자가 파일을 공유하면 여기에 표시됩니다'
                      : '파일을 다른 사용자와 공유하면 여기에 표시됩니다'}
                  </div>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '16px'
                }}>
                  {currentFiles.map((file) => (
                    <div
                      key={file.id}
                      style={{
                        padding: '20px',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                        e.currentTarget.style.borderColor = 'var(--primary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.borderColor = 'var(--border)';
                      }}
                    >
                      {/* 파일 썸네일 */}
                      {file.thumbnail_url && (
                        <div style={{
                          width: '100%',
                          height: '160px',
                          marginBottom: '16px',
                          borderRadius: 'var(--radius-sm)',
                          overflow: 'hidden',
                          background: 'var(--background)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <img
                            src={file.thumbnail_url}
                            alt={file.file_name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                          />
                        </div>
                      )}

                      {/* 파일 정보 */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '16px' }}>
                        {file.file_type === 'image' ? (
                          <Image size={24} color="var(--primary)" style={{ marginRight: '12px', flexShrink: 0 }} />
                        ) : file.file_type === 'video' ? (
                          <Video size={24} color="var(--primary)" style={{ marginRight: '12px', flexShrink: 0 }} />
                        ) : (
                          <File size={24} color="var(--primary)" style={{ marginRight: '12px', flexShrink: 0 }} />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: '14px',
                            fontWeight: '500',
                            marginBottom: '4px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {file.file_name}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                            {formatFileSize(file.file_size)}
                          </div>
                        </div>
                      </div>

                      {/* 공유받은 항목: 소유자 표시 */}
                      {viewMode === 'received' && (
                        <>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '12px',
                            background: 'var(--background)',
                            borderRadius: 'var(--radius-sm)',
                            marginBottom: '12px'
                          }}>
                            <User size={16} color="var(--text-secondary)" style={{ marginRight: '8px', flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                                <div style={{ fontSize: '13px', fontWeight: '500' }}>
                                  {file.owner_name || file.owner?.name || '알 수 없음'}
                                </div>
                                <span style={{
                                  fontSize: '10px',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  background: file.permission === 'write' ? '#DCFCE7' : '#F3F4F6',
                                  color: file.permission === 'write' ? '#16A34A' : '#6B7280',
                                  fontWeight: '600'
                                }}>
                                  {file.permission === 'write' ? '읽기/쓰기' : '읽기 전용'}
                                </span>
                              </div>
                              <div style={{
                                fontSize: '12px',
                                color: 'var(--text-tertiary)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {file.owner_email || file.owner?.email || ''}
                              </div>
                            </div>
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: 'var(--text-tertiary)',
                            marginBottom: '12px'
                          }}>
                            공유: {formatDate(file.shared_at)}
                          </div>
                          {/* 다운로드 버튼 */}
                          <button
                            onClick={() => handleDownloadFile(file)}
                            style={{
                              width: '100%',
                              padding: '10px',
                              background: 'var(--primary)',
                              color: 'white',
                              border: 'none',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: '500',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              transition: 'opacity 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                          >
                            <Download size={16} />
                            다운로드
                          </button>
                        </>
                      )}

                      {/* 내가 공유한 항목: 공유받은 사용자 표시 */}
                      {viewMode === 'shared' && (
                        <>
                          <div style={{
                            padding: '12px',
                            background: 'var(--background)',
                            borderRadius: 'var(--radius-sm)',
                            marginBottom: '12px'
                          }}>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                              공유된 사용자 ({file.shared_with?.length || 0}명)
                            </div>
                            {(file.shared_with || []).slice(0, 3).map((user) => (
                              <div key={user.id} style={{
                                fontSize: '13px',
                                marginBottom: '4px',
                                display: 'flex',
                                alignItems: 'center'
                              }}>
                                <User size={12} style={{ marginRight: '6px', flexShrink: 0 }} />
                                <span style={{ fontWeight: '500', marginRight: '4px' }}>{user.name}</span>
                                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>({user.email})</span>
                              </div>
                            ))}
                            {(file.shared_with?.length || 0) > 3 && (
                              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                외 {file.shared_with.length - 3}명
                              </div>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '12px' }}>
                            생성: {formatDate(file.created_at)}
                          </div>

                          {/* 공유 관리 버튼들 */}
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleManageShare('file', file.id, file.file_name);
                              }}
                              style={{
                                flex: 1,
                                padding: '8px 12px',
                                background: 'var(--primary)',
                                color: 'white',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: '500',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                transition: 'opacity 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                            >
                              <UserPlus size={14} />
                              사용자 추가
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUnshareAll({ ...file, type: 'file' });
                              }}
                              style={{
                                padding: '8px 12px',
                                background: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: '500',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                transition: 'opacity 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                            >
                              <Trash2 size={14} />
                              전체 해제
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ShareModal for adding users */}
      {shareModalOpen && selectedItem && (
        <ShareModal
          type={selectedItem.type}
          itemId={selectedItem.id}
          itemName={selectedItem.name}
          onClose={() => {
            setShareModalOpen(false);
            setSelectedItem(null);
            // Reload items after modal closes
            if (viewMode === 'shared') {
              loadSharedItems();
            }
          }}
        />
      )}
    </div>
  );
};

export default SharedWithMe;
