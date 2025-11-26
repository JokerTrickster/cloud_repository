import React, { useState, useMemo, useEffect, memo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Grid, Check, X, Play, Trash2, Filter, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Upload as UploadIcon } from 'lucide-react';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import fileApi from '../api/fileApi';
import FileUpload from '../components/FileUpload';

// Memoized Gallery Item Component with Lazy Loading
const GalleryItem = memo(({ file, isSelectionMode, isSelected, onToggle, searchTerm, onLoad, index }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const imgRef = useRef(null);

    useEffect(() => {
        // Intersection Observer for lazy loading with preload margin
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && imgRef.current) {
                        // Start loading the image
                        const img = imgRef.current;
                        if (!img.src || img.src.includes('data:image')) {
                            img.src = file.url;
                        }
                    }
                });
            },
            {
                rootMargin: '50px', // Load images 50px before they enter viewport
                threshold: 0.01
            }
        );

        if (imgRef.current) {
            observer.observe(imgRef.current);
        }

        return () => {
            if (imgRef.current) {
                observer.unobserve(imgRef.current);
            }
        };
    }, [file.url]);

    const handleLoad = () => {
        setIsLoaded(true);
        if (onLoad) onLoad();
    };

    return (
        <div
            onClick={() => isSelectionMode && onToggle(file.id)}
            style={{
                position: 'relative',
                paddingBottom: '100%',
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden',
                background: '#eee',
                cursor: isSelectionMode ? 'pointer' : 'default',
                border: isSelectionMode && isSelected ? '3px solid var(--primary)' : 'none'
            }}
        >
            {/* Loading Placeholder */}
            {!isLoaded && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.5s infinite'
                }} />
            )}

            <img
                ref={imgRef}
                src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" // 1px transparent placeholder
                alt={file.name}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transition: 'opacity 0.3s ease-in-out',
                    opacity: isLoaded ? (isSelectionMode && isSelected ? 0.7 : 1) : 0
                }}
                loading="lazy"
                decoding="async"
                fetchPriority={index < 6 ? 'high' : 'low'}
                onLoad={handleLoad}
                onError={(e) => {
                    // Fallback to original URL on error
                    if (!e.target.src.includes(file.url)) {
                        e.target.src = file.url;
                    }
                }}
            />

            {/* Video Indicator & Duration */}
            {file.type === 'video' && (
                <>
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backdropFilter: 'blur(4px)'
                    }}>
                        <Play size={20} fill="white" color="white" style={{ marginLeft: '2px' }} />
                    </div>
                    {file.duration && (
                        <div style={{
                            position: 'absolute',
                            bottom: '8px',
                            right: '8px',
                            background: 'rgba(0,0,0,0.7)',
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '500'
                        }}>
                            {file.duration}
                        </div>
                    )}
                </>
            )}

            {/* Tag Overlay */}
            <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '4px',
                background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                display: 'flex',
                gap: '3px',
                flexWrap: 'wrap',
                justifyContent: 'flex-end'
            }}>
                {file.tags.map(tag => (
                    <span key={tag} style={{
                        fontSize: '9px',
                        color: 'white',
                        background: searchTerm === `#${tag}` ? 'var(--primary)' : 'rgba(0,0,0,0.6)',
                        padding: '2px 5px',
                        borderRadius: '3px',
                        backdropFilter: 'blur(2px)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        fontWeight: '500'
                    }}>
                        #{tag}
                    </span>
                ))}
            </div>

            {/* Selection Indicator */}
            {isSelectionMode && (
                <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.8)',
                    border: '2px solid white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                }}>
                    {isSelected && <Check size={14} color="white" />}
                </div>
            )}
        </div>
    );
});

const Gallery = () => {
    const location = useLocation();
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [imageSize, setImageSize] = useState(150);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [sortOption, setSortOption] = useState('latest'); // latest, oldest, name, size
    const [filterType, setFilterType] = useState('all'); // all, image, video
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [targetDate, setTargetDate] = useState('');
    const [dateRange, setDateRange] = useState({ start: null, end: null });
    const [showCalendar, setShowCalendar] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [showTagInput, setShowTagInput] = useState(false);
    const [manualTag, setManualTag] = useState('');
    const [tags, setTags] = useState([]);
    const [showUpload, setShowUpload] = useState(false);
    const [error, setError] = useState('');

    // Performance Measurement Refs
    const loadStartTime = useRef(0);
    const loadedImagesCount = useRef(0);
    const totalImagesToLoad = useRef(0);
    const apiEndTime = useRef(0);

    // Load files from API
    useEffect(() => {
        loadFiles();
    }, [dateRange, filterType, sortOption]);

    // Handle URL query param for date navigation
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const dateParam = params.get('date');
        if (dateParam) {
            setTargetDate(dateParam);
            // Wait for render then scroll
            setTimeout(() => {
                const element = document.getElementById(`date-${dateParam}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 500);
        }
    }, [location.search]);

    const loadFiles = async () => {
        setLoading(true);
        setError('');

        // Reset performance metrics
        loadStartTime.current = performance.now();
        loadedImagesCount.current = 0;
        totalImagesToLoad.current = 0;
        apiEndTime.current = 0;

        console.time('Gallery Load');

        try {
            const params = {
                file_type: filterType === 'all' ? undefined : filterType,
                sort: sortOption,
                start_date: dateRange.start ? format(dateRange.start, 'yyyy-MM-dd') : undefined,
                end_date: dateRange.end ? format(dateRange.end, 'yyyy-MM-dd') : undefined,
                page: 1,
                page_size: 100,
            };

            const result = await fileApi.getFiles(params);

            // Transform API response to match frontend structure
            const transformedFiles = result.files.map(file => ({
                id: file.id,
                name: file.file_name,
                // 목록에서는 썸네일 우선 사용 (빠른 로딩)
                url: file.thumbnail_url || file.download_url || file.url || `https://via.placeholder.com/300?text=${file.file_name}`,
                // 원본 URL은 별도로 저장 (상세보기용)
                originalUrl: file.download_url || file.url,
                type: file.file_type,
                date: format(parseISO(file.created_at), 'yyyy-MM-dd'),
                tags: file.tags ? file.tags.map(t => t.name) : [],
                size: file.file_size,
                created_at: file.created_at,
            }));

            setFiles(transformedFiles);

            apiEndTime.current = performance.now();
            totalImagesToLoad.current = transformedFiles.length;

            if (transformedFiles.length === 0) {
                console.timeEnd('Gallery Load');
                const totalTime = apiEndTime.current - loadStartTime.current;
                console.log(`[Performance] No files to load. Total time: ${totalTime.toFixed(2)}ms`);
            }


            // Extract unique tags
            const allTags = new Set();
            transformedFiles.forEach(file => {
                file.tags.forEach(tag => allTags.add(tag));
            });
            setTags(Array.from(allTags).slice(0, 5));

        } catch (err) {
            console.error('Failed to load files:', err);
            setError(err.response?.data?.error || '파일을 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleScrollToDate = (e) => {
        const date = e.target.value;
        setTargetDate(date);
        const element = document.getElementById(`date-${date}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const handleDateRangeSelect = (date) => {
        if (!dateRange.start || (dateRange.start && dateRange.end)) {
            setDateRange({ start: date, end: null });
        } else {
            // Ensure start is before end
            if (date < dateRange.start) {
                setDateRange({ start: date, end: dateRange.start });
            } else {
                setDateRange({ start: dateRange.start, end: date });
            }
            setShowCalendar(false); // Close calendar after selecting range
        }
    };

    const renderCalendar = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfDay(monthStart);
        const endDate = endOfDay(monthEnd);
        const days = eachDayOfInterval({ start: startDate, end: endDate });

        return (
            <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                zIndex: 50,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                marginTop: '8px',
                width: '280px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><ChevronLeft size={20} /></button>
                    <span style={{ fontWeight: '600' }}>{format(currentMonth, 'yyyy년 M월')}</span>
                    <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><ChevronRight size={20} /></button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', fontSize: '12px' }}>
                    {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                        <div key={day} style={{ color: 'var(--text-tertiary)', padding: '4px' }}>{day}</div>
                    ))}
                    {days.map(day => {
                        const isSelected = (dateRange.start && isSameDay(day, dateRange.start)) || (dateRange.end && isSameDay(day, dateRange.end));
                        const isInRange = dateRange.start && dateRange.end && isWithinInterval(day, { start: dateRange.start, end: dateRange.end });

                        return (
                            <button
                                key={day.toString()}
                                onClick={() => handleDateRangeSelect(day)}
                                style={{
                                    padding: '6px',
                                    background: isSelected ? 'var(--primary)' : isInRange ? '#E8F0FE' : 'transparent',
                                    color: isSelected ? 'white' : 'var(--text-primary)',
                                    border: 'none',
                                    borderRadius: isSelected ? '50%' : '0',
                                    cursor: 'pointer'
                                }}
                            >
                                {format(day, 'd')}
                            </button>
                        );
                    })}
                </div>
                <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        onClick={() => { setDateRange({ start: null, end: null }); setShowCalendar(false); }}
                        style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                        초기화
                    </button>
                </div>
            </div>
        );
    };

    // Memoized Filter and Sort Logic (client-side filtering for search term only)
    const filteredFiles = useMemo(() => {
        return files.filter(file => {
            const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                file.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase().replace('#', '')));

            return matchesSearch;
        });
    }, [files, searchTerm]);

    // Memoized Grouping
    const groupedFiles = useMemo(() => {
        return filteredFiles.reduce((acc, file) => {
            const date = file.date;
            if (!acc[date]) acc[date] = [];
            acc[date].push(file);
            return acc;
        }, {});
    }, [filteredFiles]);

    const toggleSelection = (id) => {
        if (selectedFiles.includes(id)) {
            setSelectedFiles(selectedFiles.filter(fid => fid !== id));
        } else {
            if (selectedFiles.length >= 30) {
                alert('최대 30개까지만 선택할 수 있습니다.');
                return;
            }
            setSelectedFiles([...selectedFiles, id]);
        }
    };

    const handleDownload = async () => {
        try {
            await fileApi.downloadBatchFiles(selectedFiles);
            setSelectedFiles([]);
            setIsSelectionMode(false);
        } catch (err) {
            console.error('Download failed:', err);
            alert('다운로드에 실패했습니다.');
        }
    };

    const handleDelete = async () => {
        if (window.confirm(`${selectedFiles.length}개의 파일을 삭제하시겠습니까?`)) {
            try {
                await fileApi.deleteBatchFiles(selectedFiles);
                setSelectedFiles([]);
                setIsSelectionMode(false);
                // Reload files
                loadFiles();
            } catch (err) {
                console.error('Delete failed:', err);
                alert('삭제에 실패했습니다.');
            }
        }
    };

    const handleUploadComplete = (results) => {
        console.log('Upload complete:', results);
        // Reload files
        loadFiles();
        setShowUpload(false);
    };

    const handleImageLoad = () => {
        loadedImagesCount.current += 1;

        if (loadedImagesCount.current === totalImagesToLoad.current && totalImagesToLoad.current > 0) {
            const endTime = performance.now();
            const totalTime = endTime - loadStartTime.current;
            const apiTime = apiEndTime.current - loadStartTime.current;
            const renderTime = endTime - apiEndTime.current;

            console.timeEnd('Gallery Load');
            console.log(`[Performance] All ${totalImagesToLoad.current} images loaded.`);
            console.log(`[Performance] Total Time: ${totalTime.toFixed(2)}ms`);
            console.log(`[Performance] API Latency: ${apiTime.toFixed(2)}ms`);
            console.log(`[Performance] Image Rendering Time: ${renderTime.toFixed(2)}ms`);

            // Optional: Show a toast or alert if needed, but console is cleaner for now.
            // alert(`Performance: Total ${totalTime.toFixed(0)}ms (API: ${apiTime.toFixed(0)}ms, Render: ${renderTime.toFixed(0)}ms)`);
        }
    };


    return (
        <div style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column', paddingBottom: '80px' }}>
            <style>{`
                .gallery-grid {
                    display: grid;
                    grid-template-columns: repeat(5, 1fr);
                    gap: 2px;
                }
                @media (max-width: 768px) {
                    .gallery-grid {
                        grid-template-columns: repeat(5, 1fr);
                        gap: 1px;
                    }
                }  .gallery-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }
        .image-slider-container {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        @media (max-width: 768px) {
          .gallery-grid {
            grid-template-columns: repeat(5, 1fr) !important;
            gap: 1px !important;
          }
          .image-slider-container {
            display: none !important;
          }
          .gallery-toolbar {
            gap: 8px;
          }
          .gallery-toolbar select {
            font-size: 12px;
            padding: 6px;
          }
          .gallery-toolbar button {
            font-size: 12px;
            padding: 6px 12px;
          }
        }

        /* Shimmer loading animation */
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

            {/* Header Controls */}
            <div style={{ marginBottom: '16px', flexShrink: 0 }}>
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
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            border: 'none',
                            outline: 'none',
                            width: '100%',
                            fontSize: '14px',
                            background: 'transparent'
                        }}
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')}>
                            <X size={16} color="var(--text-secondary)" />
                        </button>
                    )}
                </div>

                {/* Filter Tabs & Date Picker */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {['all', 'image', 'video'].map(type => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: 'var(--radius-full)',
                                    border: filterType === type ? '1px solid var(--primary)' : '1px solid var(--border)',
                                    background: filterType === type ? 'var(--primary)' : 'var(--surface)',
                                    color: filterType === type ? 'white' : 'var(--text-secondary)',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    textTransform: 'capitalize'
                                }}
                            >
                                {type === 'all' ? '전체' : type === 'image' ? '이미지' : '동영상'}
                            </button>
                        ))}
                    </div>


                </div>

                {/* Recent Tags */}
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
                                onClick={() => setSearchTerm(searchTerm === `#${tag}` ? '' : `#${tag}`)}
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
                                    setTags(tags.filter(t => t !== tag));
                                    if (searchTerm === `#${tag}`) setSearchTerm('');
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
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    if (manualTag.trim()) {
                                        const newTag = manualTag.trim();
                                        if (!tags.includes(newTag)) {
                                            setTags([...tags, newTag]);
                                            setSearchTerm(`#${newTag}`);
                                        } else {
                                            setSearchTerm(`#${newTag}`);
                                        }
                                        setShowTagInput(false);
                                        setManualTag('');
                                    }
                                }}
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

                {/* Toolbar */}
                <div className="gallery-toolbar">
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {/* Date Range Filter */}
                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={() => setShowCalendar(!showCalendar)}
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
                                        setDateRange({ start: null, end: null });
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

                            {showCalendar && renderCalendar()}
                        </div>

                        <select
                            value={sortOption}
                            onChange={(e) => setSortOption(e.target.value)}
                            style={{
                                padding: '8px 12px',
                                borderRadius: 'var(--radius-full)',
                                border: '1px solid var(--border)',
                                background: 'var(--surface)',
                                fontSize: '13px',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                outline: 'none'
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
                                    onClick={() => setShowUpload(true)}
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
                                    onClick={() => setIsSelectionMode(true)}
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
            </div>

            {/* Error Message */}
            {error && (
                <div style={{
                    padding: '12px',
                    background: '#FEE2E2',
                    border: '1px solid #FCA5A5',
                    borderRadius: 'var(--radius-sm)',
                    color: '#DC2626',
                    marginBottom: '16px',
                    fontSize: '14px'
                }}>
                    {error}
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-secondary)'
                }}>
                    로딩 중...
                </div>
            )}

            {/* Empty State */}
            {!loading && files.length === 0 && (
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
                        onClick={() => setShowUpload(true)}
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
            )}

            {/* Gallery Grid */}
            {!loading && files.length > 0 && (
                <div style={{ flex: 1, overflowY: 'auto' }} className="no-scrollbar">
                    {Object.entries(groupedFiles).map(([date, files]) => (
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
                                {files.map((file, idx) => {
                                    // Calculate absolute index across all files for fetchpriority
                                    const absoluteIndex = filteredFiles.findIndex(f => f.id === file.id);
                                    return (
                                        <GalleryItem
                                            key={file.id}
                                            file={file}
                                            isSelectionMode={isSelectionMode}
                                            isSelected={selectedFiles.includes(file.id)}
                                            onToggle={toggleSelection}
                                            searchTerm={searchTerm}
                                            onLoad={handleImageLoad}
                                            index={absoluteIndex}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* File Upload Modal */}
            {showUpload && (
                <FileUpload
                    onUploadComplete={handleUploadComplete}
                    onClose={() => setShowUpload(false)}
                />
            )}

            {/* Floating Action Bar for Selection Mode */}
            {isSelectionMode && (
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
                        onClick={() => { setIsSelectionMode(false); setSelectedFiles([]); }}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', color: 'var(--text-secondary)'
                        }}
                    >
                        <X size={20} />
                    </button>

                    <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />

                    <span style={{ fontSize: '14px', fontWeight: '600', minWidth: '40px', textAlign: 'center' }}>
                        {selectedFiles.length}
                    </span>

                    <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={handleDownload}
                            disabled={selectedFiles.length === 0}
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: selectedFiles.length === 0 ? 'var(--text-tertiary)' : 'var(--primary)',
                                display: 'flex', alignItems: 'center', gap: '4px',
                                transition: 'color 0.2s'
                            }}
                            title="다운로드"
                        >
                            <div style={{
                                padding: '8px',
                                borderRadius: '50%',
                                background: selectedFiles.length > 0 ? 'rgba(26, 115, 232, 0.1)' : 'transparent'
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
                            onClick={handleDelete}
                            disabled={selectedFiles.length === 0}
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: selectedFiles.length === 0 ? 'var(--text-tertiary)' : '#DC2626',
                                display: 'flex', alignItems: 'center', gap: '4px',
                                transition: 'color 0.2s'
                            }}
                            title="삭제"
                        >
                            <div style={{
                                padding: '8px',
                                borderRadius: '50%',
                                background: selectedFiles.length > 0 ? '#FEE2E2' : 'transparent'
                            }}>
                                <Trash2 size={20} />
                            </div>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Gallery;
