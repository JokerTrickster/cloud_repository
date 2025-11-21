import React, { useState, memo } from 'react';
import { PieChart, HardDrive, Calendar as CalendarIcon, ChevronLeft, ChevronRight, ArrowDown, ArrowUp } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { ACTIVITY_DATA } from '../data/mockData';

// Memoized Day Cell Component
const DayCell = memo(({ date, activity, isToday, onClick }) => (
    <div
        onClick={onClick}
        style={{
            height: '120px',
            background: 'var(--surface)',
            borderRadius: '16px',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1)',
            border: isToday ? '2px solid var(--primary)' : '1px solid transparent',
            boxShadow: isToday ? '0 4px 12px rgba(26, 115, 232, 0.15)' : 'none',
            position: 'relative',
            overflow: 'hidden'
        }}
        onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
        }}
        onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = isToday ? '0 4px 12px rgba(26, 115, 232, 0.15)' : 'none';
        }}
    >
        {/* Date & Indicators Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{
                fontSize: '16px',
                fontWeight: isToday ? '700' : '600',
                color: isToday ? 'var(--primary)' : 'var(--text-primary)',
                lineHeight: 1
            }}>
                {format(date, 'd')}
            </span>

            {activity && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end' }}>
                    {activity.uploads > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '11px', color: 'var(--primary)', fontWeight: '600' }}>
                            <ArrowUp size={12} strokeWidth={3} />
                            {activity.uploads}
                        </div>
                    )}
                    {activity.downloads > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '11px', color: 'var(--primary)', fontWeight: '600' }}>
                            <ArrowDown size={12} strokeWidth={3} />
                            {activity.downloads}
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* Tags Area */}
        {activity && activity.tags && activity.tags.length > 0 && (
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {activity.tags.slice(0, 2).map((tag, idx) => (
                    <span key={idx} style={{
                        fontSize: '11px',
                        padding: '4px 8px',
                        background: 'rgba(66, 133, 244, 0.1)', // primary with opacity
                        color: 'var(--primary)',
                        borderRadius: '6px',
                        fontWeight: '500',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        textAlign: 'center'
                    }}>
                        #{tag}
                    </span>
                ))}
            </div>
        )}
    </div>
));

const MyPage = () => {
    const storageUsed = 75; // Percentage
    const [currentDate, setCurrentDate] = useState(new Date());
    const navigate = useNavigate();

    const daysInMonth = eachDayOfInterval({
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate),
    });

    const startDay = getDay(startOfMonth(currentDate)); // 0 (Sun) to 6 (Sat)
    const emptyDays = Array.from({ length: startDay });

    const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', paddingBottom: '100px' }}>
            <style>{`
                .calendar-grid {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    gap: 12px;
                }
                @media (max-width: 768px) {
                    .calendar-grid {
                        gap: 8px;
                    }
                }
            `}</style>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 8px 0', color: 'var(--primary)' }}>
                        마이페이지
                    </h1>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>
                        내 활동 내역과 저장 공간을 확인하세요.
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
                        padding: '10px 20px',
                        borderRadius: '12px',
                        border: '1px solid rgba(0,0,0,0.1)',
                        background: 'white',
                        color: '#EA4335',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                        transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    로그아웃
                </button>
            </div>

            {/* Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px', marginBottom: '40px' }}>
                {/* Storage Card */}
                <div style={{
                    background: 'white',
                    padding: '32px',
                    borderRadius: '24px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                        <div style={{ padding: '12px', background: 'rgba(26, 115, 232, 0.1)', borderRadius: '16px' }}>
                            <HardDrive size={28} color="var(--primary)" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>저장 공간</h3>
                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>총 15GB 제공</span>
                        </div>
                    </div>

                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '15px', fontWeight: '500' }}>
                            <span style={{ color: 'var(--text-primary)' }}>11.25GB 사용 중</span>
                            <span style={{ color: 'var(--primary)' }}>{storageUsed}%</span>
                        </div>
                        <div style={{
                            width: '100%',
                            height: '12px',
                            background: '#F1F3F4',
                            borderRadius: '100px',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                width: `${storageUsed}%`,
                                height: '100%',
                                background: 'linear-gradient(90deg, var(--primary), #34A853)',
                                borderRadius: '100px'
                            }} />
                        </div>
                    </div>
                </div>

                {/* Monthly Activity Card */}
                <div style={{
                    background: 'white',
                    padding: '32px',
                    borderRadius: '24px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.04)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                        <div style={{ padding: '12px', background: 'rgba(52, 168, 83, 0.1)', borderRadius: '16px' }}>
                            <PieChart size={28} color="#34A853" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>이번 달 활동</h3>
                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>최근 30일 기준</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 12px' }}>
                        {[
                            { label: '업로드', value: 128, color: 'var(--primary)' },
                            { label: '다운로드', value: 45, color: '#EA4335' },
                            { label: '태그 생성', value: 12, color: '#FBBC04' }
                        ].map((item, i) => (
                            <div key={i} style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '32px', fontWeight: '800', color: item.color, marginBottom: '4px' }}>
                                    {item.value}
                                </div>
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>
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
                padding: '32px',
                borderRadius: '32px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ padding: '10px', background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                            <CalendarIcon size={24} color="var(--text-primary)" />
                        </div>
                        <h3 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>활동 캘린더</h3>
                    </div>

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        background: 'white',
                        padding: '6px 12px',
                        borderRadius: '100px',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.05)'
                    }}>
                        <button onClick={handlePrevMonth} style={{ padding: '8px', borderRadius: '50%', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex' }}>
                            <ChevronLeft size={20} color="var(--text-secondary)" />
                        </button>
                        <span style={{ fontSize: '16px', fontWeight: '600', minWidth: '100px', textAlign: 'center' }}>
                            {format(currentDate, 'yyyy년 M월', { locale: ko })}
                        </span>
                        <button onClick={handleNextMonth} style={{ padding: '8px', borderRadius: '50%', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex' }}>
                            <ChevronRight size={20} color="var(--text-secondary)" />
                        </button>
                    </div>
                </div>

                {/* Weekday Headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px', marginBottom: '12px' }}>
                    {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
                        <div key={day} style={{
                            textAlign: 'center',
                            fontSize: '13px',
                            fontWeight: '600',
                            color: i === 0 ? '#EA4335' : 'var(--text-secondary)',
                            padding: '8px'
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
                                activity={ACTIVITY_DATA[dateKey]}
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
