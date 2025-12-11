import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FolderOpen, Image, Video, File as FileIcon } from 'lucide-react';
import folderApi from '../api/folderApi';
import fileApi from '../api/fileApi';

const SharedFolderView = () => {
  const { folderId } = useParams();
  const navigate = useNavigate();

  const [folder, setFolder] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load folder info and files
  useEffect(() => {
    loadFolderData();
  }, [folderId]);

  const loadFolderData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get files from folder
      const filesResponse = await folderApi.getFolderFiles(folderId);
      const filesList = Array.isArray(filesResponse)
        ? filesResponse
        : (filesResponse.files || filesResponse.data || []);

      setFiles(filesList);

      // Set folder name (from first file or use ID)
      if (filesList.length > 0) {
        setFolder({
          id: folderId,
          name: `공유 폴더 ${folderId}` // We'll get the real name from the folder
        });
      } else {
        setFolder({
          id: folderId,
          name: `공유 폴더 ${folderId}`
        });
      }
    } catch (err) {
      console.error('[SharedFolderView] Failed to load folder:', err);
      setError('폴더를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Download file
  const handleDownload = async (file) => {
    try {
      await fileApi.downloadFile(file.id, file.file_name);
    } catch (err) {
      console.error('[SharedFolderView] Download failed:', err);
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

  // Get file icon
  const getFileIcon = (fileType) => {
    if (fileType === 'image') return <Image size={20} />;
    if (fileType === 'video') return <Video size={20} />;
    return <FileIcon size={20} />;
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--background)',
      padding: '20px'
    }}>
      <style>{`
        .shared-folder-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 16px;
        }
        @media (max-width: 768px) {
          .shared-folder-grid {
            grid-template-columns: repeat(5, 1fr);
            gap: 8px;
          }
        }
      `}</style>
      {/* Header */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        marginBottom: '24px'
      }}>
        {/* Breadcrumb */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px'
        }}>
          <button
            onClick={() => navigate('/shared')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontSize: '14px',
              color: 'var(--text-secondary)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--background)';
              e.currentTarget.style.borderColor = 'var(--primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--surface)';
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
          >
            <ArrowLeft size={16} />
            공유 관리로 돌아가기
          </button>
        </div>

        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FolderOpen size={32} color="var(--primary)" />
          <div>
            <h1 style={{
              fontSize: '24px',
              fontWeight: '600',
              margin: 0,
              color: 'var(--text-primary)'
            }}>
              {folder?.name || '로딩 중...'}
            </h1>
            <p style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              margin: '4px 0 0 0'
            }}>
              {files.length}개 파일
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {loading ? (
          <div style={{
            textAlign: 'center',
            padding: '80px 20px',
            color: 'var(--text-tertiary)',
            fontSize: '14px'
          }}>
            로딩 중...
          </div>
        ) : error ? (
          <div style={{
            textAlign: 'center',
            padding: '80px 20px'
          }}>
            <div style={{
              padding: '20px',
              background: '#FEE2E2',
              border: '1px solid #FCA5A5',
              borderRadius: 'var(--radius-md)',
              color: '#DC2626',
              fontSize: '14px',
              maxWidth: '400px',
              margin: '0 auto'
            }}>
              {error}
            </div>
          </div>
        ) : files.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '80px 20px',
            color: 'var(--text-tertiary)',
            fontSize: '14px'
          }}>
            <FileIcon size={64} color="var(--text-tertiary)" style={{ marginBottom: '16px', opacity: 0.3 }} />
            <div style={{ fontSize: '16px', marginBottom: '8px' }}>
              폴더가 비어있습니다
            </div>
            <div>
              이 폴더에는 아직 파일이 없습니다
            </div>
          </div>
        ) : (
          <div className="shared-folder-grid">
            {files.map((file) => (
              <div
                key={file.id}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                  e.currentTarget.style.borderColor = 'var(--primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = 'var(--border)';
                }}
              >
                {/* Thumbnail */}
                <div style={{
                  width: '100%',
                  height: '180px',
                  background: file.thumbnail_url ? 'var(--background)' : 'var(--surface)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}>
                  {file.thumbnail_url ? (
                    <img
                      src={file.thumbnail_url}
                      alt={file.file_name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    <div style={{ opacity: 0.3 }}>
                      {file.file_type === 'image' ? (
                        <Image size={64} color="var(--text-tertiary)" />
                      ) : file.file_type === 'video' ? (
                        <Video size={64} color="var(--text-tertiary)" />
                      ) : (
                        <FileIcon size={64} color="var(--text-tertiary)" />
                      )}
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div style={{ padding: '16px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    marginBottom: '12px'
                  }}>
                    <div style={{ color: 'var(--primary)', marginTop: '2px' }}>
                      {getFileIcon(file.file_type)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: '500',
                          marginBottom: '4px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: 'var(--text-primary)'
                        }}
                        title={file.file_name}
                      >
                        {file.file_name}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: 'var(--text-tertiary)'
                      }}>
                        {formatFileSize(file.file_size)}
                      </div>
                    </div>
                  </div>

                  {/* Download Button */}
                  <button
                    onClick={() => handleDownload(file)}
                    style={{
                      width: '100%',
                      padding: '10px',
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SharedFolderView;
