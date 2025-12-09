import React, { useState, useEffect } from 'react';
import { X, UserPlus, Trash2, User } from 'lucide-react';
import { shareApi } from '../api/shareApi';

/**
 * ShareModal - 폴더/파일 공유 모달
 *
 * @param {boolean} isOpen - 모달 열림 상태
 * @param {Function} onClose - 모달 닫기 콜백
 * @param {string} resourceType - 'folder' 또는 'file'
 * @param {number} resourceId - 리소스 ID
 * @param {string} resourceName - 리소스 이름
 */
const ShareModal = ({ isOpen, onClose, resourceType, resourceId, resourceName }) => {
  const [emailInput, setEmailInput] = useState('');
  const [sharedUsers, setSharedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingShares, setLoadingShares] = useState(false);
  const [error, setError] = useState(null);

  // 모달이 열릴 때 공유된 사용자 목록 로드
  useEffect(() => {
    if (isOpen && resourceId && resourceType) {
      loadSharedUsers();
    }
  }, [isOpen, resourceId, resourceType]);

  // 공유된 사용자 목록 로드
  const loadSharedUsers = async () => {
    setLoadingShares(true);
    setError(null);
    try {
      let response;
      if (resourceType === 'folder') {
        response = await shareApi.getFolderShares(resourceId);
      } else {
        response = await shareApi.getFileShares(resourceId);
      }
      setSharedUsers(response.shared_users || []);
    } catch (err) {
      console.error('[ShareModal] Failed to load shared users:', err);
      // 에러 발생시 빈 배열로 초기화 (React 렌더링 에러 방지)
      setSharedUsers([]);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || '공유 목록을 불러오는데 실패했습니다.';
      setError(errorMsg);
    } finally {
      setLoadingShares(false);
    }
  };

  // 이메일 유효성 검사
  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // 사용자 추가 (공유)
  const handleAddUsers = async () => {
    if (!emailInput.trim()) {
      alert('이메일을 입력하세요.');
      return;
    }

    // 쉼표로 구분된 이메일 파싱
    const emails = emailInput.split(',').map(e => e.trim()).filter(e => e);

    // 이메일 유효성 검사
    const invalidEmails = emails.filter(e => !isValidEmail(e));
    if (invalidEmails.length > 0) {
      alert(`잘못된 이메일 형식: ${invalidEmails.join(', ')}`);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let response;
      if (resourceType === 'folder') {
        response = await shareApi.shareFolderWithUsers(resourceId, emails);
      } else {
        response = await shareApi.shareFileWithUsers(resourceId, emails);
      }

      // 성공 메시지
      const addedCount = response.shared_users?.length || 0;
      if (addedCount < emails.length) {
        alert(`${addedCount}명과 공유되었습니다. 일부 사용자를 찾을 수 없습니다.`);
      } else {
        alert(response.message || `${addedCount}명과 공유되었습니다.`);
      }

      // 입력 초기화 및 목록 새로고침
      setEmailInput('');
      await loadSharedUsers();
    } catch (err) {
      console.error('[ShareModal] Failed to share:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || '공유에 실패했습니다.';
      alert(errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // 공유 취소
  const handleRevokeShare = async (userId, userName) => {
    if (!window.confirm(`${userName}님의 접근 권한을 취소하시겠습니까?`)) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (resourceType === 'folder') {
        await shareApi.revokeFolderShare(resourceId, userId);
      } else {
        await shareApi.revokeFileShare(resourceId, userId);
      }

      alert('공유가 취소되었습니다.');
      await loadSharedUsers();
    } catch (err) {
      console.error('[ShareModal] Failed to revoke share:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || '공유 취소에 실패했습니다.';
      alert(errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Enter 키로 추가
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAddUsers();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 배경 */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9998,
          animation: 'fadeIn 0.2s ease'
        }}
      />

      {/* 모달 */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'var(--surface)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        zIndex: 9999,
        width: '90%',
        maxWidth: '500px',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideUp 0.3s ease'
      }}>
        {/* 헤더 */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
            {resourceType === 'folder' ? '폴더' : '파일'} 공유
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              color: 'var(--text-secondary)'
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* 리소스 이름 */}
        <div style={{
          padding: '16px 20px',
          background: 'var(--background)',
          borderBottom: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>공유 대상</div>
          <div style={{ fontSize: '16px', fontWeight: '500', marginTop: '4px' }}>{resourceName}</div>
        </div>

        {/* 이메일 입력 */}
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border)' }}>
          <label style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px', display: 'block' }}>
            사용자 이메일 추가
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="email@example.com (쉼표로 여러 개 입력 가능)"
              disabled={loading}
              style={{
                flex: 1,
                padding: '10px 12px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '14px'
              }}
            />
            <button
              onClick={handleAddUsers}
              disabled={loading || !emailInput.trim()}
              style={{
                padding: '10px 16px',
                background: loading ? 'var(--text-tertiary)' : 'var(--primary)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap'
              }}
            >
              <UserPlus size={16} />
              추가
            </button>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '8px' }}>
            여러 이메일을 쉼표(,)로 구분하여 입력할 수 있습니다.
          </div>
        </div>

        {/* 공유된 사용자 목록 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '12px' }}>
            공유된 사용자 ({sharedUsers.length})
          </div>

          {loadingShares ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
              로딩 중...
            </div>
          ) : sharedUsers.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: 'var(--text-tertiary)',
              fontSize: '14px'
            }}>
              <User size={48} color="var(--text-tertiary)" style={{ marginBottom: '12px', opacity: 0.3 }} />
              <div>공유된 사용자가 없습니다</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {sharedUsers.map((user) => (
                <div
                  key={user.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    background: 'var(--background)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: '500' }}>{user.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {user.email}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                      공유 날짜: {new Date(user.shared_at).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevokeShare(user.id, user.name)}
                    disabled={loading}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      padding: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      color: 'var(--accent)',
                      opacity: loading ? 0.5 : 1
                    }}
                    title="공유 취소"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div style={{
            padding: '12px 20px',
            background: '#FEE2E2',
            borderTop: '1px solid #FCA5A5',
            color: '#DC2626',
            fontSize: '13px'
          }}>
            {error}
          </div>
        )}

        {/* 푸터 */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              background: 'var(--background)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            닫기
          </button>
        </div>
      </div>

      {/* 애니메이션 */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translate(-50%, -40%);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%);
          }
        }
      `}</style>
    </>
  );
};

export default ShareModal;
