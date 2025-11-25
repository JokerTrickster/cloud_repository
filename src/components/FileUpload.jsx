import React, { useState, useRef } from 'react';
import { Upload, X, Check, AlertCircle } from 'lucide-react';
import fileApi, { fileValidation } from '../api/fileApi';

const FileUpload = ({ onUploadComplete, onClose }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [errors, setErrors] = useState([]);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);

    // 파일 검증
    const validation = fileValidation.validateBatch(files);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setSelectedFiles(files);
    setErrors([]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);

    // 파일 검증
    const validation = fileValidation.validateBatch(files);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setSelectedFiles(files);
    setErrors([]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setErrors([]);

    try {
      // 배치 업로드
      const results = await fileApi.uploadBatchFiles(
        selectedFiles,
        (fileIndex, progress) => {
          setUploadProgress(prev => ({
            ...prev,
            [fileIndex]: progress,
          }));
        }
      );

      // 업로드 완료
      if (onUploadComplete) {
        onUploadComplete(results);
      }

      // 초기화
      setSelectedFiles([]);
      setUploadProgress({});

      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Upload failed:', error);
      let errorMessage = '업로드에 실패했습니다.';

      if (error.response?.data?.error) {
        if (typeof error.response.data.error === 'string') {
          errorMessage = error.response.data.error;
        } else if (error.response.data.error.message) {
          errorMessage = error.response.data.error.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      setErrors([errorMessage]);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{
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
    }}>
      <div style={{
        background: 'var(--surface)',
        borderRadius: 'var(--radius-lg)',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
            파일 업로드
          </h2>
          <button
            onClick={onClose}
            disabled={uploading}
            style={{
              background: 'none',
              border: 'none',
              cursor: uploading ? 'not-allowed' : 'pointer',
              padding: '4px',
              opacity: uploading ? 0.5 : 1
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px'
        }}>
          {/* Drop Zone */}
          {selectedFiles.length === 0 && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '40px',
                textAlign: 'center',
                cursor: 'pointer',
                background: 'var(--background)',
                transition: 'all 0.2s'
              }}
            >
              <Upload size={48} color="var(--text-tertiary)" style={{ marginBottom: '16px' }} />
              <p style={{ fontSize: '16px', marginBottom: '8px', color: 'var(--text-primary)' }}>
                파일을 드래그하거나 클릭하여 선택하세요
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                이미지: JPG, PNG, GIF, WebP (최대 100MB)<br />
                동영상: MP4, WebM, AVI, MOV (최대 100MB)<br />
                최대 30개까지 선택 가능
              </p>
            </div>
          )}

          {/* File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', margin: 0 }}>
                  선택된 파일 ({selectedFiles.length})
                </h3>
                {!uploading && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      padding: '6px 12px',
                      background: 'var(--primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    + 추가
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedFiles.map((file, index) => {
                  const progress = uploadProgress[index] || 0;
                  const isCompleted = progress === 100;

                  return (
                    <div
                      key={index}
                      style={{
                        padding: '12px',
                        background: 'var(--background)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}
                    >
                      {/* File Icon */}
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: 'var(--radius-sm)',
                        background: file.type.startsWith('image/') ? '#E8F0FE' : '#FEE2E2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                        flexShrink: 0
                      }}>
                        {file.type.startsWith('image/') ? '🖼️' : '🎬'}
                      </div>

                      {/* File Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '500',
                          marginBottom: '4px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {file.name}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <span>{formatFileSize(file.size)}</span>
                          {uploading && (
                            <span style={{ color: 'var(--primary)' }}>
                              {progress}%
                            </span>
                          )}
                        </div>

                        {/* Progress Bar */}
                        {uploading && (
                          <div style={{
                            marginTop: '8px',
                            height: '4px',
                            background: '#e0e0e0',
                            borderRadius: '2px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${progress}%`,
                              height: '100%',
                              background: isCompleted ? '#4CAF50' : 'var(--primary)',
                              transition: 'width 0.3s'
                            }} />
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      {!uploading ? (
                        <button
                          onClick={() => removeFile(index)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            color: 'var(--text-secondary)'
                          }}
                        >
                          <X size={18} />
                        </button>
                      ) : isCompleted ? (
                        <Check size={20} color="#4CAF50" />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              background: '#FEE2E2',
              border: '1px solid #FCA5A5',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              gap: '8px'
            }}>
              <AlertCircle size={20} color="#DC2626" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                {errors.map((error, index) => (
                  <div key={index} style={{ fontSize: '14px', color: '#DC2626', marginBottom: '4px' }}>
                    {error}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '20px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}>
          <button
            onClick={onClose}
            disabled={uploading}
            style={{
              padding: '10px 20px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              cursor: uploading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              opacity: uploading ? 0.5 : 1
            }}
          >
            취소
          </button>
          <button
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || uploading}
            style={{
              padding: '10px 20px',
              background: selectedFiles.length === 0 || uploading ? '#ccc' : 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: selectedFiles.length === 0 || uploading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {uploading ? '업로드 중...' : `업로드 (${selectedFiles.length})`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
