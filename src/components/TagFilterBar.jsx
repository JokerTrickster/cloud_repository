import React, { useState } from 'react';
import { X } from 'lucide-react';

const TagFilterBar = ({ tags, searchTerm, onTagClick, onTagRemove, onTagAdd }) => {
    const [showTagInput, setShowTagInput] = useState(false);
    const [manualTag, setManualTag] = useState('');

    const handleTagSubmit = (e) => {
        e.preventDefault();
        if (manualTag.trim()) {
            const newTag = manualTag.trim();
            if (!tags.includes(newTag)) {
                onTagAdd(newTag);
            }
            onTagClick(newTag);
            setShowTagInput(false);
            setManualTag('');
        }
    };

    return (
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '8px', alignItems: 'center' }}>
            {tags.map((tag) => (
                <div
                    key={tag}
                    style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center'
                    }}
                >
                    <button
                        onClick={() => onTagClick(tag)}
                        style={{
                            padding: '4px 24px 4px 10px', // Extra padding right for X button
                            borderRadius: 'var(--radius-full)',
                            border: searchTerm === `#${tag}` ? '1px solid var(--primary)' : '1px solid var(--border)',
                            background: searchTerm === `#${tag}` ? '#E8F0FE' : 'var(--surface)',
                            color: searchTerm === `#${tag}` ? 'var(--primary)' : 'var(--text-primary)',
                            fontSize: '12px',
                            whiteSpace: 'nowrap',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >
                        #{tag}
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onTagRemove(tag);
                        }}
                        style={{
                            position: 'absolute',
                            right: '4px',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            color: searchTerm === `#${tag}` ? 'var(--primary)' : 'var(--text-secondary)',
                            opacity: 0.6
                        }}
                        onMouseOver={(e) => e.currentTarget.style.opacity = 1}
                        onMouseOut={(e) => e.currentTarget.style.opacity = 0.6}
                    >
                        <X size={10} />
                    </button>
                </div>
            ))}

            {/* Manual Tag Input - Only show if less than 5 tags */}
            {tags.length < 5 && (
                showTagInput ? (
                    <form
                        onSubmit={handleTagSubmit}
                        style={{ display: 'flex', alignItems: 'center' }}
                    >
                        <input
                            type="text"
                            value={manualTag}
                            onChange={(e) => setManualTag(e.target.value)}
                            placeholder="태그 입력"
                            autoFocus
                            onBlur={() => {
                                if (!manualTag) setShowTagInput(false);
                            }}
                            style={{
                                padding: '4px 8px',
                                borderRadius: 'var(--radius-full)',
                                border: '1px solid var(--primary)',
                                fontSize: '12px',
                                width: '80px',
                                outline: 'none'
                            }}
                        />
                    </form>
                ) : (
                    <button
                        onClick={() => setShowTagInput(true)}
                        style={{
                            padding: '4px 12px',
                            borderRadius: 'var(--radius-full)',
                            border: '1px solid var(--border)',
                            background: 'var(--surface)',
                            color: 'var(--text-secondary)',
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        + 태그 추가
                    </button>
                )
            )}
        </div>
    );
};

export default TagFilterBar;
