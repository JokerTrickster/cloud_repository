import { format } from 'date-fns';

// Mock Data for Gallery
export const MOCK_FILES = Array.from({ length: 50 }).map((_, i) => {
    const date = new Date(2025, 10, 21 - Math.floor(i / 5)); // Group by every 5 items
    return {
        id: i,
        url: `https://picsum.photos/seed/${i}/400/400`,
        type: 'image',
        name: `Photo ${i + 1}`,
        date: format(date, 'yyyy-MM-dd'),
        tags: i % 3 === 0 ? ['여행', '풍경'] : i % 3 === 1 ? ['음식'] : ['가족', '친구']
    };
});

export const RECENT_TAGS = ['여행', '풍경', '음식', '가족', '친구'];

// Mock Data for Activity
export const ACTIVITY_DATA = {
    '2025-11-21': { uploads: 12, downloads: 5, tags: ['여행', '풍경'] },
    '2025-11-20': { uploads: 45, downloads: 0, tags: ['음식'] },
    '2025-11-15': { uploads: 0, downloads: 20, tags: [] },
    '2025-11-01': { uploads: 5, downloads: 2, tags: ['가족'] },
};
