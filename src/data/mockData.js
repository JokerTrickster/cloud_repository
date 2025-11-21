import { format } from 'date-fns';

export const RECENT_TAGS = ['여행', '풍경', '음식', '가족', '친구'];

// Mock Data for Gallery
export const MOCK_FILES = Array.from({ length: 50 }).map((_, i) => {
    const date = new Date(2025, 10, 21 - Math.floor(i / 5)); // Group by every 5 items
    const isVideo = i % 5 === 0; // Every 5th item is a video
    return {
        id: i,
        url: `https://picsum.photos/id/${i + 10}/300/300`,
        type: isVideo ? 'video' : 'image',
        name: isVideo ? `video_${i}.mp4` : `image_${i}.jpg`,
        tags: RECENT_TAGS.slice(i % 3, (i % 3) + 2),
        date: new Date(2024, 2, (i % 30) + 1).toISOString(),
        size: Math.floor(Math.random() * 5000) + 1000,
        duration: isVideo ? `${Math.floor(Math.random() * 10)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}` : null
    };
});

// Mock Data for Activity
export const ACTIVITY_DATA = {
    '2025-11-21': { uploads: 12, downloads: 5, tags: ['여행', '풍경'] },
    '2025-11-20': { uploads: 45, downloads: 0, tags: ['음식'] },
    '2025-11-15': { uploads: 0, downloads: 20, tags: [] },
    '2025-11-01': { uploads: 5, downloads: 2, tags: ['가족'] },
};
