import React from 'react';
import { X, Check, Trash2 } from 'lucide-react';

const SelectionActionBar = ({ selectedCount, onCancel, onDownload, onDelete }) => {
    return (
        <div style={{
            position: 'fixed',
            bottom: '100px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--surface)',
            padding: '8px 16px',
            borderRadius: '100px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            zIndex: 100,
            border: '1px solid var(--border)',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
            <style>{`
                @keyframes slideUp {
                    from { transform: translate(-50%, 100%); opacity: 0; }
                    to { transform: translate(-50%, 0); opacity: 1; }
                }
            `}</style>

            <button
                onClick={onCancel}
                style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', color: 'var(--text-secondary)'
                }}
            >
                <X size={20} />
            </button>

            <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />

            <span style={{ fontSize: '14px', fontWeight: '600', minWidth: '40px', textAlign: 'center' }}>
                {selectedCount}
            </span>

            <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />

            <div style={{ display: 'flex', gap: '8px' }}>
                <button
                    onClick={onDownload}
                    disabled={selectedCount === 0}
                    style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: selectedCount === 0 ? 'var(--text-tertiary)' : 'var(--primary)',
                        display: 'flex', alignItems: 'center', gap: '4px',
                        transition: 'color 0.2s'
                    }}
                    title="다운로드"
                >
                    <div style={{
                        padding: '8px',
                        borderRadius: '50%',
                        background: selectedCount > 0 ? 'rgba(26, 115, 232, 0.1)' : 'transparent'
                    }}>
                        <Check size={20} style={{ display: 'none' }} /> {/* Hidden ref for size */}
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                    </div>
                </button>

                <button
                    onClick={onDelete}
                    disabled={selectedCount === 0}
                    style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: selectedCount === 0 ? 'var(--text-tertiary)' : '#DC2626',
                        display: 'flex', alignItems: 'center', gap: '4px',
                        transition: 'color 0.2s'
                    }}
                    title="삭제"
                >
                    <div style={{
                        padding: '8px',
                        borderRadius: '50%',
                        background: selectedCount > 0 ? '#FEE2E2' : 'transparent'
                    }}>
                        <Trash2 size={20} />
                    </div>
                </button>
            </div>
        </div>
    );
};

export default SelectionActionBar;
