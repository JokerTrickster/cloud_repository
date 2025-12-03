import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Check } from 'lucide-react';
import fileApi from '../api/fileApi';

/**
 * 인라인 태그 편집 컴포넌트
 *
 * @param {Object} props
 * @param {number} props.fileId - 파일 ID
 * @param {string[]} props.tags - 현재 태그 배열
 * @param {Function} props.onUpdate - 태그 업데이트 성공 콜백 (newTags) => void
 * @param {Function} props.onClose - 편집 모드 종료 콜백
 * @param {boolean} props.compact - 컴팩트 모드 (기본: false)
 */
const TagEditor = ({ fileId, tags = [], onUpdate, onClose, compact = false }) => {
  const [currentTags, setCurrentTags] = useState([...tags]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // 자동 포커스
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // 태그 추가
  const handleAddTag = async () => {
    const newTag = inputValue.trim();

    if (!newTag) return;

    if (newTag.length > 50) {
      setError('태그는 최대 50자까지 가능합니다.');
      return;
    }

    if (currentTags.includes(newTag)) {
      setInputValue('');
      return; // 중복 태그는 조용히 무시
    }

    setIsLoading(true);
    setError(null);

    try {
      await fileApi.addFileTag(fileId, newTag);
      const updatedTags = [...currentTags, newTag];
      setCurrentTags(updatedTags);
      setInputValue('');

      if (onUpdate) {
        onUpdate(updatedTags);
      }
    } catch (err) {
      console.error('Failed to add tag:', err);
      setError('태그 추가 실패');
    } finally {
      setIsLoading(false);
    }
  };

  // 태그 삭제
  const handleRemoveTag = async (tagToRemove) => {
    setIsLoading(true);
    setError(null);

    try {
      await fileApi.removeFileTag(fileId, tagToRemove);
      const updatedTags = currentTags.filter(t => t !== tagToRemove);
      setCurrentTags(updatedTags);

      if (onUpdate) {
        onUpdate(updatedTags);
      }
    } catch (err) {
      console.error('Failed to remove tag:', err);
      setError('태그 삭제 실패');
    } finally {
      setIsLoading(false);
    }
  };

  // 키보드 이벤트 처리
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    } else if (e.key === 'Escape') {
      if (onClose) onClose();
    } else if (e.key === 'Backspace' && !inputValue && currentTags.length > 0) {
      // 입력이 비어있을 때 백스페이스 누르면 마지막 태그 삭제
      const lastTag = currentTags[currentTags.length - 1];
      handleRemoveTag(lastTag);
    }
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        background: 'var(--surface)',
        borderRadius: compact ? 'var(--radius-sm)' : 'var(--radius-md)',
        padding: compact ? '8px' : '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        border: '1px solid var(--border)',
        minWidth: compact ? '200px' : '280px',
        maxWidth: '400px'
      }}
    >
      {/* 헤더 */}
      {!compact && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px'
        }}>
          <span style={{ fontSize: '14px', fontWeight: '600' }}>태그 편집</span>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: 'var(--text-secondary)'
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}

      {/* 태그 목록 */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
        marginBottom: '8px',
        minHeight: compact ? '24px' : '32px'
      }}>
        {currentTags.map((tag) => (
          <span
            key={tag}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'var(--primary)',
              color: 'white',
              padding: compact ? '3px 8px' : '4px 10px',
              borderRadius: '12px',
              fontSize: compact ? '11px' : '12px',
              fontWeight: '500'
            }}
          >
            #{tag}
            <button
              onClick={() => handleRemoveTag(tag)}
              disabled={isLoading}
              style={{
                background: 'none',
                border: 'none',
                cursor: isLoading ? 'wait' : 'pointer',
                padding: '0',
                display: 'flex',
                alignItems: 'center',
                color: 'white',
                opacity: isLoading ? 0.5 : 1
              }}
            >
              <X size={compact ? 12 : 14} />
            </button>
          </span>
        ))}
      </div>

      {/* 입력 필드 */}
      <div style={{
        display: 'flex',
        gap: '6px',
        alignItems: 'center'
      }}>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="태그 입력 후 Enter"
          disabled={isLoading}
          maxLength={50}
          style={{
            flex: 1,
            padding: compact ? '6px 8px' : '8px 10px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            fontSize: compact ? '12px' : '13px',
            outline: 'none',
            opacity: isLoading ? 0.5 : 1
          }}
        />
        <button
          onClick={handleAddTag}
          disabled={!inputValue.trim() || isLoading}
          style={{
            padding: compact ? '6px' : '8px',
            background: inputValue.trim() ? 'var(--primary)' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            cursor: inputValue.trim() && !isLoading ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Plus size={compact ? 14 : 16} />
        </button>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div style={{
          marginTop: '8px',
          padding: '6px 8px',
          background: '#FEE2E2',
          color: '#DC2626',
          borderRadius: 'var(--radius-sm)',
          fontSize: '12px'
        }}>
          {error}
        </div>
      )}

      {/* 안내 텍스트 */}
      {!compact && (
        <div style={{
          marginTop: '8px',
          fontSize: '11px',
          color: 'var(--text-tertiary)'
        }}>
          Enter: 추가 • Backspace: 삭제 • Esc: 닫기
        </div>
      )}
    </div>
  );
};

export default TagEditor;
