import React, { useState, useRef } from 'react';
import { Upload, X, Check, AlertCircle } from 'lucide-react';
import fileApi, { fileValidation } from '../api/fileApi';

const FileUpload = ({ onUploadComplete, onClose }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileTags, setFileTags] = useState({}); // { fileIndex: [tags] }
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

    // 태그도 인덱스 재정렬 (파일 삭제 시 인덱스 불일치 방지)
    setFileTags(prev => {
      const newTags = {};
      Object.keys(prev).forEach(key => {
        const oldIndex = parseInt(key);
        if (oldIndex < index) {
          // 삭제된 파일 이전 인덱스는 그대로
          newTags[oldIndex] = prev[oldIndex];
        } else if (oldIndex > index) {
          // 삭제된 파일 이후 인덱스는 -1 (재정렬)
          newTags[oldIndex - 1] = prev[oldIndex];
        }
        // oldIndex === index인 경우는 삭제
      });
      return newTags;
    });
  };

  const handleTagInput = (index, value) => {
    // 쉼표나 엔터로 태그 추가
    if (value.endsWith(',') || value.endsWith(' ')) {
      const tag = value.slice(0, -1).trim();
      if (tag) {
        addTag(index, tag);
      }
    } else {
      setFileTags(prev => ({
        ...prev,
        [index]: { ...prev[index], input: value }
      }));
    }
  };

  const handleTagKeyDown = (index, e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const input = fileTags[index]?.input || '';
      const tag = input.trim();
      if (tag) {
        addTag(index, tag);
      }
    } else if (e.key === 'Backspace' && (!fileTags[index]?.input || fileTags[index]?.input === '')) {
      // 입력이 비어있을 때 백스페이스 누르면 마지막 태그 삭제
      const tags = fileTags[index]?.tags || [];
      if (tags.length > 0) {
        setFileTags(prev => ({
          ...prev,
          [index]: {
            ...prev[index],
            tags: tags.slice(0, -1)
          }
        }));
      }
    }
  };

  const addTag = (index, tag) => {
    const currentTags = fileTags[index]?.tags || [];
    if (!currentTags.includes(tag)) {
      setFileTags(prev => ({
        ...prev,
        [index]: {
          tags: [...currentTags, tag],
          input: ''
        }
      }));
    } else {
      setFileTags(prev => ({
        ...prev,
        [index]: { ...prev[index], input: '' }
      }));
    }
  };

  const removeTag = (index, tagToRemove) => {
    setFileTags(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        tags: (prev[index]?.tags || []).filter(tag => tag !== tagToRemove)
      }
    }));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleUpload = async () => {
    console.log('Upload button clicked', {
      filesCount: selectedFiles.length,
      tags: fileTags
    });

    if (selectedFiles.length === 0) {
      console.warn('No files selected');
      return;
    }

    setUploading(true);
    setErrors([]);

    try {
      console.log('Starting upload...', selectedFiles.map(f => f.name));

      // 배치 업로드 (태그 포함)
      const results = await fileApi.uploadBatchFiles(
        selectedFiles,
        (fileIndex, progress) => {
          console.log(`File ${fileIndex} progress: ${progress}%`);
          setUploadProgress(prev => ({
            ...prev,
            [fileIndex]: progress,
          }));
        },
        fileTags // 태그 정보 전달
      );

      console.log('Upload completed successfully', results);

      // 업로드 완료
      if (onUploadComplete) {
        onUploadComplete(results);
      }

      // 초기화
      setSelectedFiles([]);
      setUploadProgress({});
      setFileTags({});

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

      console.error('Error details:', errorMessage);
      setErrors([errorMessage]);
    } finally {
      setUploading(false);
      console.log('Upload process finished');
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

                        {/* Tags Input */}
                        {!uploading && (
                          <div style={{ marginTop: '8px' }}>
                            <div style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '4px',
                              padding: '6px',
                              background: 'var(--surface)',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--border)',
                              minHeight: '32px',
                              alignItems: 'center'
                            }}>
                              {(fileTags[index]?.tags || []).map((tag, tagIndex) => (
                                <span
                                  key={tagIndex}
                                  style={{
                                    background: 'var(--primary)',
                                    color: 'white',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontSize: '11px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  #{tag}
                                  <X
                                    size={12}
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => removeTag(index, tag)}
                                  />
                                </span>
                              ))}
                              <input
                                type="text"
                                value={fileTags[index]?.input || ''}
                                onChange={(e) => handleTagInput(index, e.target.value)}
                                onKeyDown={(e) => handleTagKeyDown(index, e)}
                                placeholder={(fileTags[index]?.tags || []).length === 0 ? '태그 입력 (쉼표로 구분)' : ''}
                                style={{
                                  flex: 1,
                                  minWidth: '100px',
                                  border: 'none',
                                  outline: 'none',
                                  background: 'transparent',
                                  fontSize: '12px',
                                  padding: '2px'
                                }}
                              />
                            </div>
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
            onClick={(e) => {
              console.log('Upload button clicked (event)');
              handleUpload();
            }}
            disabled={selectedFiles.length === 0 || uploading}
            style={{
              padding: '10px 20px',
              background: selectedFiles.length === 0 || uploading ? '#ccc' : 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: selectedFiles.length === 0 || uploading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              position: 'relative'
            }}
          >
            {uploading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid white',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                업로드 중...
              </div>
            ) : (
              `업로드 (${selectedFiles.length})`
            )}
          </button>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
