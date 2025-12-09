import React, { useState, useEffect } from 'react';
import { CalendarIcon, X, UploadIcon, Check, Menu, Folder } from 'lucide-react';
import { format } from 'date-fns';

const GalleryToolbar = ({
    sortOption,
    onSortChange,
    dateRange,
    onDateRangeButtonClick,
    onDateRangeClear,
    showCalendar,
    onUploadClick,
    onSelectionModeToggle,
    isSelectionMode,
    onFolderMenuClick,
    currentFolder
}) => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return (
        <div className="gallery-toolbar">
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {/* Hamburger Menu for Mobile */}
                {isMobile && (
                    <button
                        onClick={onFolderMenuClick}
                        style={{
                            padding: '8px',
                            background: currentFolder ? 'rgba(26, 115, 232, 0.1)' : 'var(--surface)',
                            color: currentFolder ? 'var(--primary)' : 'var(--text-secondary)',
                            border: currentFolder ? '1px solid var(--primary)' : '1px solid var(--border)',
                            borderRadius: 'var(--radius-full)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            fontSize: '13px',
                            fontWeight: '500',
                            minWidth: '40px',
                            minHeight: '40px'
                        }}
                        title="폴더 메뉴"
                    >
                        {currentFolder ? <Folder size={16} /> : <Menu size={16} />}
                    </button>
                )}

                {/* Date Range Filter */}
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={onDateRangeButtonClick}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-full)',
                            border: (dateRange.start || dateRange.end) ? '1px solid var(--primary)' : '1px solid var(--border)',
                            background: (dateRange.start || dateRange.end) ? 'rgba(26, 115, 232, 0.1)' : 'var(--surface)',
                            color: (dateRange.start || dateRange.end) ? 'var(--primary)' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '500',
                            transition: 'all 0.2s'
                        }}
                    >
                        <CalendarIcon size={16} />
                        {dateRange.start ? (
                            <span>
                                {format(dateRange.start, 'yyyy.MM.dd')}
                                {dateRange.end && ` ~ ${format(dateRange.end, 'yyyy.MM.dd')}`}
                            </span>
                        ) : (
                            <span>날짜 선택</span>
                        )}
                    </button>

                    {(dateRange.start || dateRange.end) && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDateRangeClear();
                            }}
                            style={{
                                position: 'absolute',
                                right: '-8px',
                                top: '-8px',
                                background: 'var(--text-secondary)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '50%',
                                width: '18px',
                                height: '18px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                fontSize: '10px',
                                zIndex: 10
                            }}
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>

                <select
                    value={sortOption}
                    onChange={(e) => onSortChange(e.target.value)}
                    style={{
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-full)',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        fontSize: '13px',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        outline: 'none',
                        letterSpacing: '0'
                    }}
                >
                    <option value="latest">최신순</option>
                    <option value="oldest">오래된순</option>
                    <option value="name">이름순</option>
                    <option value="size">크기순</option>
                </select>

                <div className="image-slider-container" style={{ display: 'none' }}>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
                {!isSelectionMode && (
                    <>
                        <button
                            onClick={onUploadClick}
                            style={{
                                padding: '6px 12px',
                                background: 'var(--primary)',
                                color: 'white',
                                border: 'none',
                                borderRadius: 'var(--radius-full)',
                                fontSize: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                cursor: 'pointer',
                                fontWeight: '500'
                            }}
                        >
                            <UploadIcon size={14} /> 업로드
                        </button>
                        <button
                            onClick={onSelectionModeToggle}
                            style={{
                                padding: '6px 12px',
                                background: 'var(--surface)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-full)',
                                fontSize: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            <Check size={14} /> 선택
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default GalleryToolbar;
