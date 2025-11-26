import React, { useState } from 'react';
import { Upload as UploadIcon, X, Plus } from 'lucide-react';
import fileApi from '../api/fileApi';

const Upload = () => {
    const [files, setFiles] = useState([]);
    const [tags, setTags] = useState([]);
    const [currentTag, setCurrentTag] = useState('');

    const handleFileChange = (e) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            if (files.length + newFiles.length > 30) {
                alert('최대 30개까지만 업로드할 수 있습니다.');
                return;
            }
            setFiles([...files, ...newFiles]);
        }
    };

    const addTag = () => {
        if (currentTag && !tags.includes(currentTag)) {
            setTags([...tags, currentTag]);
            setCurrentTag('');
        }
    };

    const removeTag = (tagToRemove) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const handleUpload = async () => {
        if (files.length === 0) {
            alert('업로드할 파일을 선택해주세요.');
            return;
        }

        try {
            // Prepare file tags map
            const fileTags = {};
            files.forEach((_, index) => {
                fileTags[index] = { tags };
            });

            await fileApi.uploadBatchFiles(files, (index, percent) => {
                console.log(`File ${index} progress: ${percent}%`);
            }, fileTags);

            alert('업로드가 완료되었습니다.');
            setFiles([]);
            setTags([]);
            setCurrentTag('');
        } catch (error) {
            console.error('Upload failed:', error);
            alert('업로드에 실패했습니다.');
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
            <h2 style={{ marginBottom: '24px' }}>파일 업로드</h2>

            {/* Drop Zone */}
            <div
                style={{
                    border: '2px dashed var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '40px',
                    textAlign: 'center',
                    marginBottom: '24px',
                    cursor: 'pointer',
                    background: 'var(--surface)'
                }}
                onClick={() => document.getElementById('fileInput').click()}
            >
                <input
                    type="file"
                    id="fileInput"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                />
                <div style={{
                    width: '64px',
                    height: '64px',
                    background: '#E8F0FE',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px'
                }}>
                    <UploadIcon size={32} color="var(--primary)" />
                </div>
                <p style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>
                    클릭하여 사진/동영상 업로드
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                    또는 파일을 여기로 드래그하세요
                </p>
            </div>

            {/* File List */}
            {files.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>
                        선택된 파일 ({files.length}/30)
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {files.map((file, index) => (
                            <div key={index} style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '12px',
                                background: 'var(--surface)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border)'
                            }}>
                                <span style={{ fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {file.name}
                                </span>
                                <button onClick={() => setFiles(files.filter((_, i) => i !== index))}>
                                    <X size={16} color="var(--text-secondary)" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tagging */}
            <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>태그 추가</h3>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <input
                        type="text"
                        placeholder="태그 입력 (예: 여행, 음식)"
                        value={currentTag}
                        onChange={(e) => setCurrentTag(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addTag()}
                        style={{
                            flex: 1,
                            padding: '12px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border)',
                            fontSize: '14px'
                        }}
                    />
                    <button
                        onClick={addTag}
                        style={{
                            padding: '12px',
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-md)'
                        }}
                    >
                        <Plus size={20} />
                    </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {tags.map((tag) => (
                        <span key={tag} style={{
                            padding: '6px 12px',
                            background: '#E8F0FE',
                            color: 'var(--primary)',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}>
                            #{tag}
                            <button onClick={() => removeTag(tag)} style={{ display: 'flex' }}>
                                <X size={14} color="var(--primary)" />
                            </button>
                        </span>
                    ))}
                </div>
            </div>

            {/* Submit Button */}
            <button
                onClick={handleUpload}
                style={{
                    width: '100%',
                    padding: '16px',
                    background: 'var(--primary)',
                    color: 'white',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '16px',
                    fontWeight: '500',
                    boxShadow: 'var(--shadow-md)'
                }}
            >
                업로드 시작
            </button>
        </div>
    );
};

export default Upload;
