import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload as UploadIcon } from 'lucide-react';
import folderApi from '../api/folderApi';
import fileApi from '../api/fileApi';
import SelectionActionBar from '../components/SelectionActionBar';
import FileUpload from '../components/FileUpload';
import UploadProgressModal from '../components/UploadProgressModal';
import GalleryItem from '../components/GalleryItem';
import VideoPlayerModal from '../components/VideoPlayerModal';
import ImageViewerModal from '../components/ImageViewerModal';
import './SharedFolderView.css';

/**
 * SharedFolderView - Gallery-style shared folder browsing
 * Features: 5-column grid, multi-select, batch download, upload
 */
const SharedFolderView = () => {
  const { folderId } = useParams();
  const navigate = useNavigate();

  // Folder and files state
  const [folder, setFolder] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Selection state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);

  // Upload state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadState, setUploadState] = useState(null);

  // Download state
  const [downloadState, setDownloadState] = useState(null);

  // Media viewer state
  const [playingVideo, setPlayingVideo] = useState(null);
  const [viewingImage, setViewingImage] = useState(null);

  // Load folder data on mount
  useEffect(() => {
    loadFolderData();
  }, [folderId]);

  // Set up media player callbacks
  useEffect(() => {
    window.openVideoPlayer = (file) => {
      setPlayingVideo(file);
    };
    window.openImageViewer = (file) => {
      setViewingImage(file);
    };
    return () => {
      window.openVideoPlayer = null;
      window.openImageViewer = null;
    };
  }, []);

  // Load folder info and files
  const loadFolderData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get files from folder
      const filesResponse = await folderApi.getFolderFiles(folderId);
      const filesList = Array.isArray(filesResponse)
        ? filesResponse
        : (filesResponse.files || filesResponse.data || []);

      // Transform files to Gallery format
      const transformedFiles = filesList.map(file => ({
        id: file.id,
        name: file.file_name,
        type: file.file_type, // 'image' or 'video'
        url: file.thumbnail_url || file.url,
        originalUrl: file.url,
        thumbnail_url: file.thumbnail_url,
        date: file.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        tags: file.tags || [],
        duration: file.duration,
        processing_status: file.processing_status,
        isFavorite: file.is_favorite || false
      }));

      setFiles(transformedFiles);

      // Set folder name
      if (filesList.length > 0) {
        setFolder({
          id: folderId,
          name: `공유 폴더 ${folderId}`
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

  // Toggle file selection
  const toggleSelection = (id) => {
    if (selectedFiles.includes(id)) {
      setSelectedFiles(selectedFiles.filter(fid => fid !== id));
    } else {
      if (selectedFiles.length >= 30) {
        alert('최대 30개까지만 선택할 수 있습니다.');
        return;
      }
      setSelectedFiles([...selectedFiles, id]);
    }
  };

  // Batch download handler
  const handleBatchDownload = async () => {
    // Get selected file names for display
    const selectedFileObjects = files.filter(f => selectedFiles.includes(f.id));

    // Initialize download state
    setDownloadState({
      files: selectedFileObjects.map(f => ({ id: f.id, name: f.name })),
      total: selectedFiles.length,
      completed: 0,
      failed: 0,
      progress: 0,
      done: false
    });

    try {
      const result = await fileApi.downloadBatchFiles(
        selectedFiles,
        (completed, total, progress) => {
          setDownloadState(prev => prev ? {
            ...prev,
            completed,
            progress
          } : null);
        }
      );

      setDownloadState(prev => prev ? {
        ...prev,
        completed: result.completed,
        failed: result.failed,
        done: true
      } : null);

      // Auto-close and reset after 3 seconds
      setTimeout(() => {
        setDownloadState(null);
        setSelectedFiles([]);
        setIsSelectionMode(false);
      }, 3000);
    } catch (err) {
      console.error('[SharedFolderView] Download failed:', err);
      setDownloadState(prev => prev ? {
        ...prev,
        error: err.message,
        done: true
      } : null);

      setTimeout(() => {
        setDownloadState(null);
      }, 5000);
    }
  };

  // Delete handler (disabled for shared folders)
  const handleDelete = async () => {
    alert('공유 폴더에서는 파일을 삭제할 수 없습니다.');
  };

  // Upload start handler
  const handleUploadStart = (files, fileTags, uploadFn) => {
    console.log('[SharedFolderView] Starting upload for', files.length, 'files');

    // Initialize upload state
    setUploadState({
      files: files.map(f => ({ name: f.name, size: f.size })),
      progress: {},
      total: files.length,
      completed: 0,
      failed: 0,
      done: false
    });

    // Close upload modal
    setShowUpload(false);

    // Execute upload in background
    try {
      uploadFn(
        (fileIndex, progress, status) => {
          setUploadState(prev => {
            if (!prev) return null;

            const newProgress = { ...prev.progress, [fileIndex]: progress };
            const completedCount = Object.values(newProgress).filter(p => p === 100).length;

            return {
              ...prev,
              progress: newProgress,
              completed: completedCount
            };
          });
        }
      ).then(results => {
        console.log('[SharedFolderView] Upload completed:', results);

        const successCount = results.filter(r => r.file_id).length;
        const failedCount = results.filter(r => !r.file_id).length;

        setUploadState(prev => prev ? {
          ...prev,
          completed: successCount,
          failed: failedCount,
          done: true
        } : null);

        // Reload files
        loadFolderData();

        // Auto-close after 5 seconds
        setTimeout(() => {
          setUploadState(null);
        }, 5000);
      }).catch(error => {
        console.error('[SharedFolderView] Upload failed:', error);
        setUploadState(prev => prev ? {
          ...prev,
          error: error.message,
          done: true,
          failed: prev.total
        } : null);

        setTimeout(() => {
          setUploadState(null);
        }, 5000);
      });
    } catch (syncError) {
      console.error('[SharedFolderView] Sync error:', syncError);
      setUploadState(prev => prev ? {
        ...prev,
        error: syncError.message,
        done: true,
        failed: prev.total
      } : null);
    }
  };

  // Group files by date
  const groupedFiles = useMemo(() => {
    return files.reduce((acc, file) => {
      const date = file.date;
      if (!acc[date]) acc[date] = [];
      acc[date].push(file);
      return acc;
    }, {});
  }, [files]);

  return (
    <div className="shared-folder-view">
      {/* Fixed 5-column grid CSS */}
      <style>{`
        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 2px;
        }
        @media (max-width: 768px) {
          .gallery-grid {
            grid-template-columns: repeat(5, 1fr);
            gap: 1px;
          }
        }
      `}</style>

      {/* Header */}
      <div className="shared-folder-header">
        {/* Back Button */}
        <button
          onClick={() => navigate('/shared-with-me')}
          className="back-button"
        >
          <ArrowLeft size={18} />
          <span>공유 관리로 돌아가기</span>
        </button>

        {/* Title */}
        <div className="title-section">
          <h1 className="folder-title">
            {folder?.name || '로딩 중...'}
          </h1>
          <p className="folder-subtitle">
            {files.length}개 파일
          </p>
        </div>

        {/* Toolbar */}
        <div className="toolbar">
          <button
            onClick={() => setShowUpload(true)}
            className="toolbar-button upload-button"
          >
            <UploadIcon size={18} />
            <span>업로드</span>
          </button>
          <button
            onClick={() => setIsSelectionMode(true)}
            className="toolbar-button select-button"
          >
            선택
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="shared-folder-content">
        {loading ? (
          <div className="empty-state">
            <div className="loading-spinner"></div>
            <p>로딩 중...</p>
          </div>
        ) : error ? (
          <div className="empty-state">
            <div className="error-message">
              {error}
            </div>
          </div>
        ) : files.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📁</div>
            <div className="empty-title">폴더가 비어있습니다</div>
            <div className="empty-subtitle">업로드 버튼을 눌러 파일을 추가하세요</div>
          </div>
        ) : (
          <div>
            {Object.keys(groupedFiles).sort((a, b) => b.localeCompare(a)).map(date => (
              <div key={date} style={{ marginBottom: '24px' }}>
                {/* Date Header */}
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--text-secondary)',
                  marginBottom: '8px',
                  padding: '0 4px'
                }}>
                  {date}
                </div>

                {/* Gallery Grid */}
                <div className="gallery-grid">
                  {groupedFiles[date].map((file, index) => (
                    <GalleryItem
                      key={file.id}
                      file={file}
                      isSelectionMode={isSelectionMode}
                      isSelected={selectedFiles.includes(file.id)}
                      onToggle={toggleSelection}
                      searchTerm=""
                      index={index}
                      onOpenOptions={() => {}} // No options in shared view
                      onToggleFavorite={() => {}} // No favorites in shared view
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* File Upload Modal */}
      {showUpload && (
        <FileUpload
          onUploadStart={handleUploadStart}
          onClose={() => setShowUpload(false)}
          folderId={folderId}
        />
      )}

      {/* Upload Progress Modal */}
      <UploadProgressModal
        uploadState={uploadState}
        onClose={() => setUploadState(null)}
      />

      {/* Download Progress Modal */}
      {downloadState && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--surface, white)',
            borderRadius: '16px',
            padding: '24px',
            width: 'min(90vw, 400px)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px'
            }}>
              {downloadState.done ? (
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: downloadState.failed > 0 ? '#FEF3C7' : '#D1FAE5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px'
                }}>
                  {downloadState.failed > 0 ? '⚠️' : '✅'}
                </div>
              ) : (
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  border: '3px solid var(--primary)',
                  borderTopColor: 'transparent',
                  animation: 'spin 1s linear infinite'
                }} />
              )}
              <div>
                <div style={{ fontWeight: '600', fontSize: '16px' }}>
                  {downloadState.done
                    ? (downloadState.failed > 0 ? '다운로드 완료 (일부 실패)' : '다운로드 완료!')
                    : '다운로드 중...'}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  {downloadState.completed} / {downloadState.total} 파일
                  {downloadState.failed > 0 && ` (${downloadState.failed}개 실패)`}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            {!downloadState.done && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{
                  height: '8px',
                  background: 'var(--background, #e0e0e0)',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${downloadState.progress}%`,
                    height: '100%',
                    background: 'var(--primary, #1a73e8)',
                    borderRadius: '4px',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
                <div style={{
                  textAlign: 'right',
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  marginTop: '4px'
                }}>
                  {downloadState.progress}%
                </div>
              </div>
            )}

            {/* Done Message */}
            {downloadState.done && (
              <div style={{
                textAlign: 'center',
                fontSize: '13px',
                color: 'var(--text-tertiary)'
              }}>
                잠시 후 자동으로 닫힙니다...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selection Action Bar */}
      {isSelectionMode && (
        <SelectionActionBar
          selectedCount={selectedFiles.length}
          onCancel={() => {
            setIsSelectionMode(false);
            setSelectedFiles([]);
          }}
          onDownload={handleBatchDownload}
          onDelete={handleDelete}
        />
      )}

      {/* Video Player Modal */}
      <VideoPlayerModal
        video={playingVideo}
        onClose={() => setPlayingVideo(null)}
        onShare={() => {}}
        onDownload={async (file) => {
          try {
            await fileApi.downloadFile(file.id, file.name);
          } catch (error) {
            console.error('Download failed:', error);
            alert('다운로드에 실패했습니다.');
          }
        }}
      />

      {/* Image Viewer Modal */}
      <ImageViewerModal
        image={viewingImage}
        onClose={() => setViewingImage(null)}
        onShare={() => {}}
        onDownload={async (file) => {
          try {
            await fileApi.downloadFile(file.id, file.name);
          } catch (error) {
            console.error('Download failed:', error);
            alert('다운로드에 실패했습니다.');
          }
        }}
      />
    </div>
  );
};

export default SharedFolderView;
