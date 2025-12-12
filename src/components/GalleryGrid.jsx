import React from 'react';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { UploadIcon, Loader } from 'lucide-react';
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
    onShowUpload,
    onToggleFavorite,
    uploadState,
    hasMore
}) => {
    // Loading State (only show for initial load, not for "load more")
    if (loading && (!files || files.length === 0)) {
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
    if (!files || files.length === 0) {
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
        <div
            style={{
                flex: 1,
                overflowY: 'auto',
                // Performance optimizations
                willChange: 'scroll-position',
                contain: 'layout style paint'
            }}
            className="no-scrollbar"
        >
            {/* Uploading Files Section */}
            {uploadState && !uploadState.done && (
                <div style={{ marginBottom: '32px' }}>
                    <h3 style={{
                        fontSize: '14px',
                        marginBottom: '12px',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                        업로드 중 ({uploadState.completed}/{uploadState.total})
                    </h3>
                    <div style={{
                        display: 'flex',
                        gap: '12px',
                        overflowX: 'auto',
                        overflowY: 'hidden',
                        paddingBottom: '8px',
                        marginBottom: '8px'
                    }} className="upload-scroll">
                        <style>{`
                            .upload-scroll::-webkit-scrollbar {
                                height: 6px;
                            }
                            .upload-scroll::-webkit-scrollbar-track {
                                background: var(--background);
                                border-radius: 3px;
                            }
                            .upload-scroll::-webkit-scrollbar-thumb {
                                background: var(--border);
                                border-radius: 3px;
                            }
                            .upload-scroll::-webkit-scrollbar-thumb:hover {
                                background: var(--text-tertiary);
                            }
                            @media (min-width: 768px) {
                                .upload-scroll {
                                    display: grid;
                                    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                                    overflow: visible;
                                }
                            }
                        `}</style>
                        {uploadState.files && uploadState.files.map((file, index) => {
                            const progress = uploadState.progress[index] || 0;
                            const isCompleted = progress === 100;

                            return (
                                <div
                                    key={`uploading-${index}`}
                                    style={{
                                        position: 'relative',
                                        minWidth: '140px',
                                        width: '140px',
                                        height: '140px',
                                        borderRadius: 'var(--radius-md)',
                                        overflow: 'hidden',
                                        background: 'var(--surface)',
                                        border: '2px solid var(--border)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '12px',
                                        flexShrink: 0
                                    }}
                                >
                                    {/* File Icon/Preview */}
                                    <UploadIcon
                                        size={40}
                                        color={isCompleted ? '#4CAF50' : 'var(--primary)'}
                                        style={{ marginBottom: '8px' }}
                                    />

                                    {/* File Name */}
                                    <div style={{
                                        fontSize: '12px',
                                        color: 'var(--text-secondary)',
                                        textAlign: 'center',
                                        marginBottom: '8px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        width: '100%',
                                        padding: '0 4px'
                                    }}>
                                        {file.name}
                                    </div>

                                    {/* Progress Bar */}
                                    <div style={{
                                        width: '100%',
                                        height: '6px',
                                        background: 'var(--background)',
                                        borderRadius: '3px',
                                        overflow: 'hidden',
                                        marginBottom: '4px'
                                    }}>
                                        <div style={{
                                            width: `${progress}%`,
                                            height: '100%',
                                            background: isCompleted ? '#4CAF50' : 'var(--primary)',
                                            transition: 'width 0.3s ease'
                                        }} />
                                    </div>

                                    {/* Progress Percentage */}
                                    <div style={{
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        color: isCompleted ? '#4CAF50' : 'var(--primary)'
                                    }}>
                                        {progress}%
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Existing Files by Date */}
            {groupedFiles && Object.entries(groupedFiles).map(([date, dateFiles]) => (
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
                        {dateFiles && dateFiles.map((file) => {
                            // Calculate absolute index across all files for fetchpriority
                            const absoluteIndex = filteredFiles && Array.isArray(filteredFiles)
                                ? filteredFiles.findIndex(f => f.id === file.id)
                                : -1;
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
                                    onToggleFavorite={onToggleFavorite}
                                />
                            );
                        })}
                    </div>
                </div>
            ))}

            {/* Loading More Indicator */}
            {!loading && hasMore && (
                <div style={{
                    padding: '24px',
                    textAlign: 'center',
                    color: 'var(--text-secondary)',
                    fontSize: '14px'
                }}>
                    <Loader
                        size={20}
                        style={{
                            animation: 'spin 1s linear infinite',
                            display: 'inline-block',
                            marginRight: '8px'
                        }}
                    />
                    더 많은 파일 불러오는 중...
                </div>
            )}

            {/* End of List Indicator */}
            {!loading && !hasMore && files && files.length > 0 && (
                <div style={{
                    padding: '24px',
                    textAlign: 'center',
                    color: 'var(--text-tertiary)',
                    fontSize: '14px'
                }}>
                    모든 파일을 불러왔습니다
                </div>
            )}
        </div>
    );
};

export default GalleryGrid;
