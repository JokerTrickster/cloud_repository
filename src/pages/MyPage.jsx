import React, { useState, memo, useEffect } from 'react';
import { PieChart, HardDrive, Calendar as CalendarIcon, ChevronLeft, ChevronRight, ArrowDown, ArrowUp } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import fileApi from '../api/fileApi';

// Memoized Day Cell Component
const DayCell = memo(({ date, activity, isToday, onClick }) => (
    <div className="day-cell"
        onClick={onClick}
        style={{
            aspectRatio: '1',
            background: 'var(--surface)',
            borderRadius: '16px',
            padding: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1)',
            border: isToday ? '1.5px solid var(--primary)' : '1px solid transparent', // Thinner border
            boxShadow: isToday ? '0 2px 8px rgba(26, 115, 232, 0.15)' : 'none',
            position: 'relative',
            overflow: 'hidden'
        }}
    >
        {/* Date & Indicators Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
            <span style={{
                fontSize: '12px', // Smaller date
                fontWeight: isToday ? '700' : '600',
                color: isToday ? 'var(--primary)' : 'var(--text-primary)',
                lineHeight: 1
            }}>
                {format(date, 'd')}
            </span>

            {activity && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', marginTop: '2px' }}>
                    {activity.uploads > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
                            <ArrowUp size={8} strokeWidth={3} color="var(--primary)" />
                            <span style={{ fontSize: '8px', fontWeight: '700', color: 'var(--primary)', lineHeight: 1 }}>
                                {activity.uploads}
                            </span>
                        </div>
                    )}
                    {activity.downloads > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
                            <ArrowDown size={8} strokeWidth={3} color="#EA4335" />
                            <span style={{ fontSize: '8px', fontWeight: '700', color: '#EA4335', lineHeight: 1 }}>
                                {activity.downloads}
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* Tags Area - Compact List */}
        {activity && activity.tags && activity.tags.length > 0 && (
            <div style={{
                marginTop: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                overflow: 'hidden'
            }}>
                {activity.tags.slice(0, 3).map((tag, idx) => (
                    <span key={idx} style={{
                        fontSize: '11px',
                        padding: '4px 8px',
                        background: 'rgba(66, 133, 244, 0.1)',
                        color: 'var(--primary)',
                        borderRadius: '4px',
                        fontWeight: '500',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        lineHeight: '1.2'
                    }}>
                        #{tag}
                    </span>
                ))}
                {activity.tags.length > 3 && (
                    <span style={{ fontSize: '8px', color: 'var(--text-secondary)', paddingLeft: '2px' }}>
                        +{activity.tags.length - 3}
                    </span>
                )}
            </div>
        )}
    </div>
));

const MyPage = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [stats, setStats] = useState(null);
    const [activityData, setActivityData] = useState({});
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const daysInMonth = eachDayOfInterval({
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate),
    });

    const startDay = getDay(startOfMonth(currentDate)); // 0 (Sun) to 6 (Sat)
    const emptyDays = Array.from({ length: startDay });

    const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

    // Fetch user stats (once on mount)
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await fileApi.getUserStats();
                setStats(data);
            } catch (error) {
                console.error('Failed to fetch user stats:', error);
            }
        };
        fetchStats();
    }, []);

    // Fetch activity data when month changes
    useEffect(() => {
        const fetchActivity = async () => {
            setLoading(true);
            try {
                const month = format(currentDate, 'yyyy-MM');
                const data = await fileApi.getActivity(month);
                setActivityData(data);
            } catch (error) {
                console.error('Failed to fetch activity data:', error);
                setActivityData({});
            } finally {
                setLoading(false);
            }
        };
        fetchActivity();
    }, [currentDate]);

    return (
        <div style={{ padding: '16px', maxWidth: '100%', margin: '0 auto', paddingBottom: '80px' }}>
            <style>{`
                /* Calendar layout */
                .calendar-grid {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    gap: 12px;
                    grid-auto-rows: auto;
                }
                .day-cell {
                    aspect-ratio: 1;
                    padding: 10px;
                    gap: 8px;
                }
                /* Stats cards */
                .stats-container {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 24px;
                }
                /* Header */
                .header-title {
                    font-size: 28px;
                }
                .header-sub {
                    font-size: 14px;
                }
                @media (max-width: 768px) {
                    .calendar-grid {
                        gap: 6px;
                    }
                    .day-cell {
                        aspect-ratio: 1;
                        padding: 6px;
                        gap: 4px;
                    }
                    .stats-container {
                        grid-template-columns: 1fr;
                        gap: 16px;
                    }
                    .header-title {
                        font-size: 24px;
                    }
                    .header-sub {
                        font-size: 12px;
                    }
                }
            `}</style>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 4px 0', color: 'var(--primary)' }}>
                        마이페이지
                    </h1>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13px' }}>
                        내 활동 내역과 저장 공간
                    </p>
                </div>
                <button
                    onClick={() => {
                        import('../utils/auth').then(({ clearTokens }) => {
                            clearTokens();
                            navigate('/login');
                        });
                    }}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '10px',
                        border: '1px solid rgba(0,0,0,0.1)',
                        background: 'white',
                        color: '#EA4335',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '600',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
                    }}
                >
                    로그아웃
                </button>
            </div>

            {/* Stats Row - Scrollable on mobile if needed, or stacked */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                {/* Storage & File Stats Card */}
                <div style={{
                    background: 'white',
                    padding: '20px',
                    borderRadius: '20px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ padding: '8px', background: 'rgba(26, 115, 232, 0.1)', borderRadius: '12px' }}>
                            <HardDrive size={20} color="var(--primary)" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>저장 공간</h3>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                사용 중인 공간
                            </span>
                        </div>
                    </div>

                    <div>
                        {/* Used Space */}
                        <div style={{
                            fontSize: '28px',
                            fontWeight: '700',
                            color: 'var(--primary)',
                            marginBottom: '16px'
                        }}>
                            {stats ? (
                                stats.storage.used >= 1024 * 1024 * 1024
                                    ? `${(stats.storage.used / 1024 / 1024 / 1024).toFixed(2)} GB`
                                    : `${(stats.storage.used / 1024 / 1024).toFixed(2)} MB`
                            ) : '0.00 MB'}
                        </div>

                        {/* File Counts */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '12px'
                        }}>
                            <div style={{
                                padding: '12px',
                                background: 'rgba(26, 115, 232, 0.05)',
                                borderRadius: '12px'
                            }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                    총 업로드
                                </div>
                                <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                    {stats?.monthlyStats?.uploads || 0}
                                    <span style={{ fontSize: '12px', fontWeight: '500', marginLeft: '2px' }}>개</span>
                                </div>
                            </div>
                            <div style={{
                                padding: '12px',
                                background: 'rgba(52, 168, 83, 0.05)',
                                borderRadius: '12px'
                            }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                    총 다운로드
                                </div>
                                <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                    {stats?.monthlyStats?.downloads || 0}
                                    <span style={{ fontSize: '12px', fontWeight: '500', marginLeft: '2px' }}>회</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Monthly Activity Card */}
                <div style={{
                    background: 'white',
                    padding: '20px',
                    borderRadius: '20px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <div style={{ padding: '8px', background: 'rgba(52, 168, 83, 0.1)', borderRadius: '12px' }}>
                            <PieChart size={20} color="#34A853" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>이번 달 활동</h3>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>최근 30일</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                        {[
                            { label: '업로드', value: stats?.monthlyStats.uploads || 0, color: 'var(--primary)' },
                            { label: '다운로드', value: stats?.monthlyStats.downloads || 0, color: '#EA4335' },
                            { label: '태그', value: stats?.monthlyStats.tagsCreated || 0, color: '#FBBC04' }
                        ].map((item, i) => (
                            <div key={i} style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '24px', fontWeight: '800', color: item.color, marginBottom: '2px' }}>
                                    {item.value}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                                    {item.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Calendar Section */}
            <div style={{
                background: '#F8F9FA',
                padding: '16px',
                borderRadius: '24px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ padding: '8px', background: 'white', borderRadius: '10px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
                            <CalendarIcon size={18} color="var(--text-primary)" />
                        </div>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>활동 캘린더</h3>
                    </div>

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'white',
                        padding: '4px 8px',
                        borderRadius: '100px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                    }}>
                        <button onClick={handlePrevMonth} style={{ padding: '6px', borderRadius: '50%', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex' }}>
                            <ChevronLeft size={16} color="var(--text-secondary)" />
                        </button>
                        <span style={{ fontSize: '14px', fontWeight: '600', minWidth: '80px', textAlign: 'center' }}>
                            {format(currentDate, 'yyyy.MM', { locale: ko })}
                        </span>
                        <button onClick={handleNextMonth} style={{ padding: '6px', borderRadius: '50%', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex' }}>
                            <ChevronRight size={16} color="var(--text-secondary)" />
                        </button>
                    </div>
                </div>

                {/* Weekday Headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px' }}>
                    {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
                        <div key={day} style={{
                            textAlign: 'center',
                            fontSize: '11px',
                            fontWeight: '600',
                            color: i === 0 ? '#EA4335' : 'var(--text-secondary)',
                            padding: '4px'
                        }}>
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Grid */}
                <div className="calendar-grid">
                    {emptyDays.map((_, i) => (
                        <div key={`empty-${i}`} />
                    ))}

                    {daysInMonth.map(date => {
                        const dateKey = format(date, 'yyyy-MM-dd');
                        return (
                            <DayCell
                                key={dateKey}
                                date={date}
                                activity={activityData[dateKey]}
                                isToday={isSameDay(date, new Date())}
                                onClick={() => navigate(`/gallery?date=${dateKey}`)}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default MyPage;
