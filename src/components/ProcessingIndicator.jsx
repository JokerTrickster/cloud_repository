import React from 'react';
import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';

/**
 * 파일 처리 상태를 시각적으로 표시하는 컴포넌트
 *
 * @param {Object} props
 * @param {Object} props.file - 파일 객체
 * @param {string} props.file.processing_status - pending, processing, completed, failed
 * @param {number} props.file.processing_progress - 0-100
 * @param {string} props.file.processing_stage - 현재 처리 단계
 * @param {Object} props.file.processing_error - 에러 정보
 * @param {boolean} props.compact - 컴팩트 모드 (기본: false)
 */
const ProcessingIndicator = ({ file, compact = false }) => {
  const status = file.processing_status || 'completed';
  const progress = file.processing_progress || 0;
  const stage = file.processing_stage;
  const error = file.processing_error;

  // 처리 단계 라벨 매핑
  const getStageLabel = (stage) => {
    const labels = {
      validating_file: '파일 검증 중',
      extracting_metadata: '메타데이터 추출 중',
      generating_thumbnail: '썸네일 생성 중',
      uploading_thumbnail: '썸네일 업로드 중',
      finalizing: '마무리 중',
      done: '완료',
    };
    return labels[stage] || '처리 중';
  };

  // 완료 상태
  if (status === 'completed') {
    if (compact) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <CheckCircle2 size={16} color="var(--success)" />
          <span style={{ fontSize: '12px', color: 'var(--success)' }}>완료</span>
        </div>
      );
    }
    return (
      <div style={{
        padding: '8px 12px',
        borderRadius: 'var(--radius)',
        background: 'var(--success-bg)',
        border: '1px solid var(--success)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <CheckCircle2 size={20} color="var(--success)" />
        <span style={{ fontSize: '14px', color: 'var(--success)', fontWeight: '500' }}>처리 완료</span>
      </div>
    );
  }

  // 처리 중 상태
  if (status === 'processing') {
    return (
      <div style={{
        padding: compact ? '4px 8px' : '12px',
        borderRadius: 'var(--radius)',
        background: 'var(--primary-bg)',
        border: '1px solid var(--primary-light)'
      }}>
        {/* 헤더 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: compact ? '4px' : '8px'
        }}>
          <Loader2
            size={compact ? 14 : 18}
            color="var(--primary)"
            style={{ animation: 'spin 1s linear infinite' }}
          />
          <span style={{
            fontSize: compact ? '12px' : '14px',
            color: 'var(--primary)',
            fontWeight: '500'
          }}>
            처리 중
          </span>
          <span style={{
            fontSize: compact ? '11px' : '13px',
            color: 'var(--text-secondary)',
            marginLeft: 'auto'
          }}>
            {progress}%
          </span>
        </div>

        {/* 진행률 바 */}
        <div style={{
          width: '100%',
          height: compact ? '3px' : '4px',
          background: 'var(--border)',
          borderRadius: '2px',
          overflow: 'hidden',
          marginBottom: compact ? '4px' : '8px'
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: 'var(--primary)',
            transition: 'width 0.3s ease',
            borderRadius: '2px'
          }} />
        </div>

        {/* 처리 단계 */}
        {!compact && stage && (
          <div style={{
            fontSize: '12px',
            color: 'var(--text-secondary)'
          }}>
            {getStageLabel(stage)}
          </div>
        )}

        {/* 스타일 추가 */}
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // 실패 상태
  if (status === 'failed') {
    return (
      <div style={{
        padding: compact ? '4px 8px' : '12px',
        borderRadius: 'var(--radius)',
        background: 'var(--error-bg)',
        border: '1px solid var(--error)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <XCircle size={compact ? 14 : 18} color="var(--error)" />
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: compact ? '12px' : '14px',
              color: 'var(--error)',
              fontWeight: '500',
              marginBottom: '2px'
            }}>
              처리 실패
            </div>
            {!compact && error && (
              <div style={{
                fontSize: '12px',
                color: 'var(--text-secondary)'
              }}>
                {error.message || '알 수 없는 오류'}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 대기 중 상태
  if (status === 'pending') {
    if (compact) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Clock size={14} color="var(--text-secondary)" />
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>대기 중</span>
        </div>
      );
    }
    return (
      <div style={{
        padding: '8px 12px',
        borderRadius: 'var(--radius)',
        background: 'var(--surface-secondary)',
        border: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <Clock size={18} color="var(--text-secondary)" />
        <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>처리 대기 중</span>
      </div>
    );
  }

  return null;
};

export default ProcessingIndicator;
