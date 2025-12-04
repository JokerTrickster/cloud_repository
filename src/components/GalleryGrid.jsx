import React from 'react';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { UploadIcon } from 'lucide-react';
import GalleryItem from './GalleryItem';

const GalleryGrid = ({
    loading,
    files,
    groupedFiles,
    filteredFiles,
    isSelectionMode,
    selectedFiles,
    searchTerm,
    onToggleSelection,
    onImageLoad,
    onOpenOptions,
    onShowUpload
}) => {
    // Loading State
    if (loading) {
        return (
            <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)'
            }}>
                로딩 중...
            </div>
        );
    }

    // Empty State
    if (files.length === 0) {
        return (
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                gap: '16px'
            }}>
                <UploadIcon size={48} color="var(--text-tertiary)" />
                <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '16px', marginBottom: '8px' }}>파일이 없습니다</p>
                    <p style={{ fontSize: '14px' }}>파일을 업로드하여 시작하세요</p>
                </div>
                <button
                    onClick={onShowUpload}
                    style={{
                        padding: '10px 20px',
                        background: 'var(--primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '14px',
                        cursor: 'pointer',
                        fontWeight: '500'
                    }}
                >
                    첫 파일 업로드
                </button>
            </div>
        );
    }

    // Gallery Grid with Files
    return (
        <div style={{ flex: 1, overflowY: 'auto' }} className="no-scrollbar">
            {Object.entries(groupedFiles).map(([date, dateFiles]) => (
                <div key={date} id={`date-${date}`} style={{ marginBottom: '24px', scrollMarginTop: '140px' }}>
                    <h3 style={{
                        fontSize: '14px',
                        marginBottom: '8px',
                        color: 'var(--text-secondary)',
                        position: 'sticky',
                        top: 0,
                        background: 'var(--background)',
                        padding: '8px 0',
                        zIndex: 10
                    }}>
                        {format(parseISO(date), 'yyyy년 M월 d일', { locale: ko })}
                    </h3>
                    <div className="gallery-grid">
                        {dateFiles.map((file) => {
                            // Calculate absolute index across all files for fetchpriority
                            const absoluteIndex = filteredFiles.findIndex(f => f.id === file.id);
                            return (
                                <GalleryItem
                                    key={file.id}
                                    file={file}
                                    isSelectionMode={isSelectionMode}
                                    isSelected={selectedFiles.includes(file.id)}
                                    onToggle={onToggleSelection}
                                    searchTerm={searchTerm}
                                    onLoad={onImageLoad}
                                    index={absoluteIndex}
                                    onOpenOptions={onOpenOptions}
                                />
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default GalleryGrid;
