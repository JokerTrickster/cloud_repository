import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FolderOpen, Image, Video, File as FileIcon } from 'lucide-react';
import folderApi from '../api/folderApi';
import fileApi from '../api/fileApi';
import './SharedFolderView.css';

const SharedFolderView = () => {
  const { folderId } = useParams();
  const navigate = useNavigate();

  const [folder, setFolder] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageErrors, setImageErrors] = useState(new Set());

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

  // Handle image load error
  const handleImageError = (fileId) => {
    setImageErrors(prev => new Set([...prev, fileId]));
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  // Get file icon component
  const getFileIcon = (fileType, size = 48) => {
    const iconProps = { size, strokeWidth: 1.5 };
    if (fileType === 'image') return <Image {...iconProps} />;
    if (fileType === 'video') return <Video {...iconProps} />;
    return <FileIcon {...iconProps} />;
  };

  // Get file type background color
  const getFileTypeColor = (fileType) => {
    if (fileType === 'image') return '#E8F0FE';
    if (fileType === 'video') return '#FEF7E0';
    return '#F1F3F4';
  };

  // Get file type icon color
  const getFileTypeIconColor = (fileType) => {
    if (fileType === 'image') return '#1967D2';
    if (fileType === 'video') return '#E37400';
    return '#5F6368';
  };

  // Render file card
  const renderFileCard = (file) => {
    const hasImageError = imageErrors.has(file.id);
    const showFallback = !file.thumbnail_url || hasImageError;

    return (
      <div key={file.id} className="file-card">
        {/* Thumbnail Area */}
        <div className="file-thumbnail-container">
          {showFallback ? (
            <div
              className="file-thumbnail-fallback"
              style={{
                backgroundColor: getFileTypeColor(file.file_type),
                color: getFileTypeIconColor(file.file_type)
              }}
            >
              {getFileIcon(file.file_type, 56)}
            </div>
          ) : (
            <img
              src={file.thumbnail_url}
              alt={file.file_name}
              className="file-thumbnail-image"
              onError={() => handleImageError(file.id)}
              loading="lazy"
            />
          )}
        </div>

        {/* File Info Area */}
        <div className="file-info">
          <div className="file-details">
            <div className="file-icon-small" style={{ color: getFileTypeIconColor(file.file_type) }}>
              {getFileIcon(file.file_type, 18)}
            </div>
            <div className="file-text">
              <div className="file-name" title={file.file_name}>
                {file.file_name}
              </div>
              <div className="file-size">
                {formatFileSize(file.file_size)}
              </div>
            </div>
          </div>

          {/* Download Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDownload(file);
            }}
            className="download-button"
            aria-label={`${file.file_name} 다운로드`}
          >
            <Download size={16} />
            <span>다운로드</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="shared-folder-view">
      {/* Header */}
      <div className="shared-folder-header">
        {/* Back Button */}
        <button
          onClick={() => navigate('/shared-with-me')}
          className="back-button"
        >
          <ArrowLeft size={18} />
          <span className="back-button-text">공유 관리로 돌아가기</span>
        </button>

        {/* Title Section */}
        <div className="title-section">
          <div className="folder-icon">
            <FolderOpen size={32} />
          </div>
          <div className="title-text">
            <h1 className="folder-title">
              {folder?.name || '로딩 중...'}
            </h1>
            <p className="folder-subtitle">
              {files.length}개 파일
            </p>
          </div>
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
            <FileIcon size={64} className="empty-icon" />
            <div className="empty-title">폴더가 비어있습니다</div>
            <div className="empty-subtitle">이 폴더에는 아직 파일이 없습니다</div>
          </div>
        ) : (
          <div className="files-grid">
            {files.map(renderFileCard)}
          </div>
        )}
      </div>
    </div>
  );
};

export default SharedFolderView;
