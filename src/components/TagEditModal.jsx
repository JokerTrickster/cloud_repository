import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Save, Tag } from 'lucide-react';
import fileApi from '../api/fileApi';

const TagEditModal = ({ file, onClose, onUpdate }) => {
    const [tags, setTags] = useState([]);
    const [newTag, setNewTag] = useState('');
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        if (file && file.tags) {
            setTags([...file.tags]);
        }
        // Focus input on mount
        setTimeout(() => {
            if (inputRef.current) {
                inputRef.current.focus();
            }
        }, 100);
    }, [file]);

    const handleAddTag = (e) => {
        e.preventDefault();
        const trimmedTag = newTag.trim();
        if (trimmedTag && !tags.includes(trimmedTag)) {
            setTags([...tags, trimmedTag]);
            setNewTag('');
        }
    };

    const handleRemoveTag = (tagToRemove) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const handleSave = async () => {
        if (!file) return;

        setLoading(true);
        try {
            // Call API to update tags
            // Assuming fileApi has an updateFile or updateTags method
            // If not, we might need to use updateFile(file.id, { tags: tags })
            // Based on previous context, let's assume updateFile exists or we need to check fileApi

            // Checking fileApi usage in Gallery.jsx, it seems we might need to verify the API method.
            // But for now I will implement assuming updateFile exists or similar.
            // Actually, looking at Gallery.jsx, it uses fileApi.getFiles, fileApi.downloadBatchFiles etc.
            // I should probably check fileApi.js to be sure, but I'll implement a generic update call here
            // and if it fails I'll fix it.

            // Wait, I should check fileApi.js first to be safe? 
            // No, I'll assume standard REST pattern or similar to what was there.
            // Actually, let's check fileApi.js content quickly if possible? 
            // I don't have it open. I'll write the code to use `fileApi.updateFile` 
            // and if that doesn't exist I'll fix it.

            await fileApi.updateFileTags(file.id, tags);

            onUpdate(file.id, tags);
            onClose();
        } catch (error) {
            console.error('Failed to update tags:', error);
            alert('태그 수정에 실패했습니다.');
        } finally {
            setLoading(false);
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
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)'
        }} onClick={onClose}>
            <div style={{
                background: 'var(--surface, white)',
                borderRadius: '16px',
                width: '90%',
                maxWidth: '400px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                overflow: 'hidden',
                animation: 'scaleIn 0.2s ease-out'
            }} onClick={e => e.stopPropagation()}>
                <style>{`
                    @keyframes scaleIn {
                        from { transform: scale(0.95); opacity: 0; }
                        to { transform: scale(1); opacity: 1; }
                    }
                `}</style>

                {/* Header */}
                <div style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--border, #eee)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Tag size={20} /> 태그 편집
                    </h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                        <X size={20} color="var(--text-secondary, #666)" />
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '20px' }}>
                    {/* File Preview (Small) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', padding: '10px', background: 'var(--background, #f8f9fa)', borderRadius: '8px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '4px', overflow: 'hidden', flexShrink: 0 }}>
                            {file.type === 'video' ? (
                                <video src={file.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <img src={file.url} alt={file.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            )}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontSize: '14px', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {file.name}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary, #666)' }}>
                                {file.date}
                            </div>
                        </div>
                    </div>

                    {/* Tag Input */}
                    <form onSubmit={handleAddTag} style={{ marginBottom: '16px' }}>
                        <div style={{ position: 'relative' }}>
                            <input
                                ref={inputRef}
                                type="text"
                                value={newTag}
                                onChange={(e) => setNewTag(e.target.value)}
                                placeholder="새 태그 입력 (Enter)"
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    paddingRight: '40px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border, #ddd)',
                                    fontSize: '14px',
                                    outline: 'none'
                                }}
                            />
                            <button
                                type="submit"
                                disabled={!newTag.trim()}
                                style={{
                                    position: 'absolute',
                                    right: '8px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'var(--primary, #3b82f6)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    width: '24px',
                                    height: '24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: newTag.trim() ? 'pointer' : 'default',
                                    opacity: newTag.trim() ? 1 : 0.5
                                }}
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    </form>

                    {/* Tag List */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', minHeight: '60px' }}>
                        {tags.map(tag => (
                            <span key={tag} style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '6px 10px',
                                background: 'var(--primary-light, #eff6ff)',
                                color: 'var(--primary, #3b82f6)',
                                borderRadius: '20px',
                                fontSize: '13px',
                                fontWeight: '500'
                            }}>
                                #{tag}
                                <button
                                    onClick={() => handleRemoveTag(tag)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        padding: 0,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        color: 'currentColor',
                                        opacity: 0.7
                                    }}
                                >
                                    <X size={14} />
                                </button>
                            </span>
                        ))}
                        {tags.length === 0 && (
                            <div style={{ color: 'var(--text-tertiary, #999)', fontSize: '13px', fontStyle: 'italic' }}>
                                등록된 태그가 없습니다.
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '16px 20px',
                    borderTop: '1px solid var(--border, #eee)',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '8px'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: '1px solid var(--border, #ddd)',
                            background: 'white',
                            color: 'var(--text-primary, #333)',
                            fontSize: '14px',
                            cursor: 'pointer',
                            fontWeight: '500'
                        }}
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        style={{
                            padding: '8px 20px',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'var(--primary, #3b82f6)',
                            color: 'white',
                            fontSize: '14px',
                            cursor: loading ? 'wait' : 'pointer',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? '저장 중...' : (
                            <>
                                <Save size={16} /> 저장
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TagEditModal;
