import React, { useState, memo } from 'react';
import { PieChart, HardDrive, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Download, Upload } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { ACTIVITY_DATA } from '../data/mockData';

// Memoized Day Cell Component
const DayCell = memo(({ date, activity, isToday, onClick }) => (
    <div
        className="calendar-cell"
        onClick={onClick}
        style={{
            border: '1px solid var(--border)',
            padding: '4px',
            background: isToday ? '#E8F0FE' : 'var(--surface)',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            fontSize: '12px',
            position: 'relative',
            cursor: 'pointer'
        }}
    >
        <div style={{
            fontWeight: isToday ? 'bold' : 'normal',
            color: isToday ? 'var(--primary)' : 'var(--text-primary)',
            marginBottom: '2px',
            fontSize: '10px'
        }}>
            {format(date, 'd')}
        </div>

        {activity && (
            <div className="activity-content">
                {/* Desktop View */}
                <div className="desktop-activity">
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '2px' }}>
                        {activity.uploads > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: 'var(--primary)' }}>
                                <Upload size={10} /> {activity.uploads}
                            </div>
                        )}
                        {activity.downloads > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: 'var(--secondary)' }}>
                                <Download size={10} /> {activity.downloads}
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
                        {activity.tags.map(tag => (
                            <span key={tag} style={{
                                fontSize: '9px',
                                padding: '1px 4px',
                                background: 'rgba(0,0,0,0.05)',
                                borderRadius: '4px',
                                color: 'var(--text-secondary)'
                            }}>
                                #{tag}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Mobile View (Dots) */}
                <div className="mobile-activity" style={{ display: 'none', gap: '2px', justifyContent: 'center', marginTop: '2px' }}>
                    {activity.uploads > 0 && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--primary)' }} />}
                    {activity.downloads > 0 && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--secondary)' }} />}
                    {activity.tags.length > 0 && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent)' }} />}
                </div>
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
        <div style={{ padding: '16px', maxWidth: '1000px', margin: '0 auto', paddingBottom: '80px' }}>
            <style>{`
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          border-top: 1px solid var(--border);
          border-left: 1px solid var(--border);
        }
        .calendar-cell {
          min-height: 100px;
        }
        .stats-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
          margin-bottom: 32px;
        }
        
        @media (max-width: 768px) {
          .calendar-cell {
            min-height: 60px !important;
          }
          .desktop-activity {
            display: none !important;
          }
          .mobile-activity {
            display: flex !important;
          }
          .stats-container {
            grid-template-columns: 1fr;
            gap: 16px;
            margin-bottom: 20px;
          }
        }
      `}</style>
            <h2 style={{ marginBottom: '20px', fontSize: '20px' }}>마이페이지</h2>

            <div className="stats-container">
                {/* Storage Usage Card */}
                <div style={{
                    background: 'var(--surface)',
                    padding: '24px',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-sm)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <HardDrive size={24} color="var(--primary)" />
                        <h3 style={{ fontSize: '18px' }}>저장 공간</h3>
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                            <span>15GB 중 11.25GB 사용됨</span>
                            <span>{storageUsed}%</span>
                        </div>
                        <div style={{
                            width: '100%',
                            height: '8px',
                            background: '#E8EAED',
                            borderRadius: '4px',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                width: `${storageUsed}%`,
                                height: '100%',
                                background: storageUsed > 90 ? 'var(--accent)' : 'var(--primary)',
                                borderRadius: '4px'
                            }} />
                        </div>
                    </div>
                </div>

                {/* Quick Stats */}
                <div style={{
                    background: 'var(--surface)',
                    padding: '24px',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-sm)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <PieChart size={24} color="var(--secondary)" />
                        <h3 style={{ fontSize: '18px' }}>이번 달 활동</h3>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary)' }}>128</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>업로드</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--secondary)' }}>45</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>다운로드</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--accent)' }}>12</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>태그 생성</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Activity Calendar */}
            <div style={{
                background: 'var(--surface)',
                padding: '24px',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-sm)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <CalendarIcon size={24} color="var(--text-primary)" />
                        <h3 style={{ fontSize: '18px' }}>활동 이력</h3>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button onClick={handlePrevMonth} style={{ padding: '8px', borderRadius: '50%', background: 'transparent' }}>
                            <ChevronLeft size={20} />
                        </button>
                        <span style={{ fontSize: '16px', fontWeight: '500' }}>
                            {format(currentDate, 'yyyy년 M월', { locale: ko })}
                        </span>
                        <button onClick={handleNextMonth} style={{ padding: '8px', borderRadius: '50%', background: 'transparent' }}>
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="calendar-grid">
                    {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                        <div key={day} style={{
                            padding: '8px',
                            textAlign: 'center',
                            borderRight: '1px solid var(--border)',
                            borderBottom: '1px solid var(--border)',
                            background: '#F8F9FA',
                            fontSize: '12px',
                            fontWeight: '500'
                        }}>
                            {day}
                        </div>
                    ))}

                    {emptyDays.map((_, i) => (
                        <div key={`empty-${i}`} style={{
                            borderRight: '1px solid var(--border)',
                            borderBottom: '1px solid var(--border)',
                            background: '#FAFAFA'
                        }} />
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
