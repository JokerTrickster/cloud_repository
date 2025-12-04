import React from 'react';
import { Star } from 'lucide-react';

const GalleryFilters = ({ filterType, onFilterChange, favoriteOnly, onFavoriteToggle }) => {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['all', 'image', 'video'].map(type => (
                    <button
                        key={type}
                        onClick={() => onFilterChange(type)}
                        style={{
                            padding: '6px 12px',
                            borderRadius: 'var(--radius-full)',
                            border: filterType === type ? '1px solid var(--primary)' : '1px solid var(--border)',
                            background: filterType === type ? 'var(--primary)' : 'var(--surface)',
                            color: filterType === type ? 'white' : 'var(--text-secondary)',
                            fontSize: '13px',
                            cursor: 'pointer',
                            textTransform: 'capitalize',
                            letterSpacing: '0'
                        }}
                    >
                        {type === 'all' ? '전체' : type === 'image' ? '이미지' : '동영상'}
                    </button>
                ))}

                {/* Favorite Filter */}
                <button
                    onClick={onFavoriteToggle}
                    style={{
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-full)',
                        border: favoriteOnly ? '1px solid #FBBC04' : '1px solid var(--border)',
                        background: favoriteOnly ? '#FFF8E1' : 'var(--surface)',
                        color: favoriteOnly ? '#FBBC04' : 'var(--text-secondary)',
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        letterSpacing: '0'
                    }}
                >
                    <Star
                        size={14}
                        fill={favoriteOnly ? '#FBBC04' : 'none'}
                        color={favoriteOnly ? '#FBBC04' : 'currentColor'}
                        strokeWidth={2}
                    />
                    즐겨찾기
                </button>
            </div>
        </div>
    );
};

export default GalleryFilters;
