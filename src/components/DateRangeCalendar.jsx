import React from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfDay, endOfDay, eachDayOfInterval, isWithinInterval, isSameDay } from 'date-fns';

const DateRangeCalendar = ({ currentMonth, onMonthChange, dateRange, onDateSelect, onClear }) => {
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
                <button
                    onClick={() => onMonthChange(subMonths(currentMonth, 1))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                    <ChevronLeft size={20} />
                </button>
                <span style={{ fontWeight: '600' }}>{format(currentMonth, 'yyyy년 M월')}</span>
                <button
                    onClick={() => onMonthChange(addMonths(currentMonth, 1))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                    <ChevronRight size={20} />
                </button>
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
                            onClick={() => onDateSelect(day)}
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
                    onClick={onClear}
                    style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                    초기화
                </button>
            </div>
        </div>
    );
};

export default DateRangeCalendar;
