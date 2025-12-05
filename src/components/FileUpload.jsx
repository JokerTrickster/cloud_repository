import React, { useState, useRef } from 'react';
import { Upload, X, Check, AlertCircle } from 'lucide-react';
import fileApi, { fileValidation } from '../api/fileApi';

const FileUpload = ({ onUploadStart, onClose }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileTags, setFileTags] = useState({}); // { fileIndex: [tags] }
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

  const handleUpload = () => {
    if (selectedFiles.length === 0) {
      console.warn('No files selected');
      return;
    }

    // 업로드 함수 생성 (백그라운드 실행용)
    const uploadFn = (onProgress) => {
      return fileApi.uploadBatchFiles(
        selectedFiles,
        onProgress,
        fileTags
      );
    };

    // Gallery로 업로드 시작 알림
    if (onUploadStart) {
      onUploadStart(selectedFiles, fileTags, uploadFn);
    }

    // 모달은 Gallery의 handleUploadStart에서 닫음
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
        width: '90%',
        maxWidth: '600px',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid var(--border)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
              파일 업로드
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <X size={20} />
            </button>
          </div>
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
                이미지: JPG, PNG, GIF, WebP<br />
                동영상: MP4, WebM, AVI, MOV<br />
                대용량 파일 지원 (5GB 이상 자동 멀티파트 업로드)<br />
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
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedFiles.map((file, index) => (
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
                        color: 'var(--text-secondary)'
                      }}>
                        {formatFileSize(file.size)}
                      </div>

                      {/* Tags Input */}
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
                    </div>

                    {/* Remove Button */}
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
                  </div>
                ))}
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
            style={{
              padding: '10px 20px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            취소
          </button>
          <button
            onClick={handleUpload}
            disabled={selectedFiles.length === 0}
            style={{
              padding: '10px 20px',
              background: selectedFiles.length === 0 ? '#ccc' : 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: selectedFiles.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            업로드 ({selectedFiles.length})
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
