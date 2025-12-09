import React from 'react';
import { Edit2, Star, X, Share2 } from 'lucide-react';

const OptionsModal = ({ file, onClose, onTagEdit, onToggleFavorite, onShare }) => {
    if (!file) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)'
        }} onClick={onClose}>
            <div style={{
                background: 'white',
                borderRadius: '16px',
                width: '85%',
                maxWidth: '320px',
                padding: '20px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                animation: 'scaleIn 0.2s ease-out'
            }} onClick={e => e.stopPropagation()}>
                <style>{`
                    @keyframes scaleIn {
                        from { transform: scale(0.9); opacity: 0; }
                        to { transform: scale(1); opacity: 1; }
                    }
                `}</style>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>옵션 선택</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer' }}>
                        <X size={20} color="#666" />
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button
                        onClick={() => {
                            onTagEdit(file);
                            onClose();
                        }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '16px',
                            background: '#f8f9fa',
                            border: '1px solid #eee',
                            borderRadius: '12px',
                            fontSize: '16px',
                            fontWeight: '500',
                            color: '#333',
                            cursor: 'pointer',
                            width: '100%'
                        }}
                    >
                        <Edit2 size={20} /> 태그 편집
                    </button>

                    <button
                        onClick={() => {
                            onToggleFavorite(file.id, file.isFavorite);
                            onClose();
                        }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '16px',
                            background: '#f8f9fa',
                            border: '1px solid #eee',
                            borderRadius: '12px',
                            fontSize: '16px',
                            fontWeight: '500',
                            color: file.isFavorite ? '#FFD700' : '#333',
                            cursor: 'pointer',
                            width: '100%'
                        }}
                    >
                        <Star size={20} fill={file.isFavorite ? '#FFD700' : 'none'} />
                        {file.isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                    </button>

                    <button
                        onClick={() => {
                            if (onShare) {
                                onShare(file);
                            }
                            onClose();
                        }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '16px',
                            background: '#f8f9fa',
                            border: '1px solid #eee',
                            borderRadius: '12px',
                            fontSize: '16px',
                            fontWeight: '500',
                            color: '#333',
                            cursor: 'pointer',
                            width: '100%'
                        }}
                    >
                        <Share2 size={20} />
                        공유하기
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OptionsModal;
