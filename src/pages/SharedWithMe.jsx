import React, { useState, useEffect } from 'react';
import { Folder, File, User, Download, FolderOpen, Image, Video } from 'lucide-react';
import { shareApi } from '../api/shareApi';
import fileApi from '../api/fileApi';

const SharedWithMe = () => {
  const [activeTab, setActiveTab] = useState('folders'); // 'folders' or 'files'
  const [sharedFolders, setSharedFolders] = useState([]);
  const [sharedFiles, setSharedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load shared items on mount
  useEffect(() => {
    loadSharedItems();
  }, []);

  // Load shared folders and files
  const loadSharedItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const [foldersResponse, filesResponse] = await Promise.all([
        shareApi.getSharedWithMeFolders(),
        shareApi.getSharedWithMeFiles()
      ]);

      console.log('[SharedWithMe] Folders response:', foldersResponse);
      console.log('[SharedWithMe] Files response:', filesResponse);

      // 백엔드가 배열을 직접 반환하는 경우와 객체로 감싸서 반환하는 경우 모두 처리
      const folders = Array.isArray(foldersResponse) ? foldersResponse : (foldersResponse.folders || foldersResponse.data || []);
      const files = Array.isArray(filesResponse) ? filesResponse : (filesResponse.files || filesResponse.data || []);

      console.log('[SharedWithMe] Parsed folders:', folders);
      console.log('[SharedWithMe] Parsed files:', files);

      setSharedFolders(folders);
      setSharedFiles(files);
    } catch (err) {
      console.error('[SharedWithMe] Failed to load shared items:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || '공유 항목을 불러오는데 실패했습니다.';
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

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* 헤더 */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>
          공유된 항목
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          다른 사용자가 나와 공유한 폴더와 파일
        </p>
      </div>

      {/* 탭 */}
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
          폴더 ({sharedFolders.length})
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
          파일 ({sharedFiles.length})
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
              {sharedFolders.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '80px 20px',
                  color: 'var(--text-tertiary)',
                  fontSize: '14px'
                }}>
                  <FolderOpen size={64} color="var(--text-tertiary)" style={{ marginBottom: '16px', opacity: 0.3 }} />
                  <div style={{ fontSize: '16px', marginBottom: '8px' }}>공유받은 폴더가 없습니다</div>
                  <div>다른 사용자가 폴더를 공유하면 여기에 표시됩니다</div>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '16px'
                }}>
                  {sharedFolders.map((folder) => (
                    <div
                      key={folder.id}
                      style={{
                        padding: '20px',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
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
                            {folder.file_count}개 파일
                          </div>
                        </div>
                      </div>

                      {/* 소유자 정보 */}
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
                          <div style={{ fontSize: '13px', fontWeight: '500' }}>
                            {folder.owner_name || folder.owner?.name || '알 수 없음'}
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

                      {/* 공유 날짜 */}
                      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                        공유: {formatDate(folder.shared_at)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 파일 탭 */}
          {activeTab === 'files' && (
            <div>
              {sharedFiles.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '80px 20px',
                  color: 'var(--text-tertiary)',
                  fontSize: '14px'
                }}>
                  <File size={64} color="var(--text-tertiary)" style={{ marginBottom: '16px', opacity: 0.3 }} />
                  <div style={{ fontSize: '16px', marginBottom: '8px' }}>공유받은 파일이 없습니다</div>
                  <div>다른 사용자가 파일을 공유하면 여기에 표시됩니다</div>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '16px'
                }}>
                  {sharedFiles.map((file) => (
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

                      {/* 소유자 정보 */}
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
                          <div style={{ fontSize: '13px', fontWeight: '500' }}>
                            {file.owner_name || file.owner?.name || '알 수 없음'}
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

                      {/* 공유 날짜 */}
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
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SharedWithMe;
