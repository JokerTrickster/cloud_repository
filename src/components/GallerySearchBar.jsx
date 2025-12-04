import React from 'react';
import { Search, X } from 'lucide-react';

const GallerySearchBar = ({ searchTerm, onSearchChange }) => {
    return (
        <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '12px',
            background: 'var(--surface)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-sm)',
            alignItems: 'center'
        }}>
            <Search size={18} color="var(--text-secondary)" />
            <input
                type="text"
                placeholder="이름 또는 #태그로 검색"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                style={{
                    border: 'none',
                    outline: 'none',
                    width: '100%',
                    fontSize: '14px',
                    background: 'transparent'
                }}
            />
            {searchTerm && (
                <button onClick={() => onSearchChange('')}>
                    <X size={16} color="var(--text-secondary)" />
                </button>
            )}
        </div>
    );
};

export default GallerySearchBar;
