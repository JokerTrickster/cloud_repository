# 📁 폴더 관리 시스템 개발 노트

> 작성일: 2025-12-09
> 작업 범위: 폴더 관리 기능 구현 및 모바일 UI 최적화

## 📌 개요

CloudBox 프로젝트에 폴더 관리 시스템을 추가하면서 발생한 주요 이슈와 해결 방법을 정리한 문서입니다.
백엔드와 프론트엔드 간의 데이터 필터링 로직, 모바일 UI 최적화, 그리고 상태 관리에 대한 실전 경험을 공유합니다.

---

## 🔍 주요 이슈 및 해결 방법

### 1. 폴더 파일 표시 문제 (이중 필터링 이슈)

#### 🚨 문제 상황
```
Backend: 폴더 6의 파일 2개 로드됨
Frontend: 필터링 결과 0개 표시
Console: [Gallery] Loaded 2 files from folder 6
         [FolderFilter] Folder files: [] (empty)
```

폴더를 선택했을 때 백엔드에서 정상적으로 파일을 가져왔지만, 화면에는 아무것도 표시되지 않았습니다.

#### 🔎 원인 분석

**백엔드와 프론트엔드의 역할 혼재:**
```javascript
// Backend API
GET /api/v1/files/folder/:folderId
// 이미 folder_id로 필터링된 파일만 반환

// Frontend (잘못된 로직)
const folderFiles = filteredFiles.filter(file => file.folder_id === currentFolder.id);
// 백엔드 응답에는 folder_id 필드가 없거나, 이미 필터링된 데이터를 또 필터링
```

**핵심 문제:**
1. 백엔드 API가 이미 폴더별로 필터링된 파일을 반환
2. 프론트엔드가 다시 `folder_id` 필드로 필터링 시도
3. 백엔드 응답 구조에 `folder_id`가 없거나 다른 형식으로 반환됨
4. 결과적으로 모든 파일이 필터링되어 빈 배열 반환

#### ✅ 해결 방법

**책임 분리 원칙 적용:**
```javascript
const folderFilteredFiles = useMemo(() => {
    if (!filteredFiles || filteredFiles.length === 0) {
        return [];
    }

    if (currentFolder === null) {
        // 루트 뷰: 폴더가 없는 파일만 클라이언트에서 필터링
        return filteredFiles.filter(file =>
            !file.folder_id || file.folder_id === null
        );
    }

    // 폴더 뷰: 백엔드가 이미 필터링한 결과를 그대로 사용
    // 추가 필터링 불필요!
    return filteredFiles;
}, [filteredFiles, currentFolder]);
```

#### 💡 배운 점

**API 설계 시 고려사항:**
- 백엔드와 프론트엔드의 책임을 명확히 분리
- 백엔드가 필터링을 제공하면, 프론트엔드는 그대로 사용
- API 응답 구조를 명확히 문서화 (어떤 필드가 포함되는지)
- 로깅을 통해 각 단계별 데이터 흐름 추적

**디버깅 팁:**
```javascript
console.log('[FolderFilter] Files loaded:', {
    totalFiles: filteredFiles?.length || 0,
    currentFolder: currentFolder?.id || 'root',
    currentFolderName: currentFolder?.folder_name || 'root',
    sampleFile: filteredFiles?.[0] // 실제 응답 구조 확인
});
```

---

### 2. 파일 이동 후 UI 업데이트 문제

#### 🚨 문제 상황

```
1. 폴더 A에서 파일 선택
2. 폴더 B로 이동 → 백엔드: 성공
3. 화면이 폴더 B로 자동 이동
4. 다시 폴더 A로 돌아가면 → 이동한 파일이 여전히 표시됨
```

백엔드는 정상적으로 파일을 이동했지만, 원본 폴더의 UI가 업데이트되지 않았습니다.

#### 🔎 원인 분석

**잘못된 UX 플로우:**
```javascript
// Before (문제가 있던 코드)
const handleMoveFiles = async (targetFolderId) => {
    await folderApi.moveFiles(selectedFiles, targetFolderId);

    // 타겟 폴더로 자동 이동
    const targetFolder = folders.find(f => f.id === targetFolderId);
    setCurrentFolder(targetFolder);

    // 문제: 현재 폴더(source)의 파일 목록이 업데이트되지 않음
    await loadFolders(); // 폴더 카운트만 업데이트
};
```

**문제점:**
1. 타겟 폴더로 이동하면서 원본 폴더의 컨텍스트를 잃음
2. 원본 폴더로 돌아올 때 기존 캐시된 데이터 사용
3. 파일 목록 재로드 없이 stale data 표시

#### ✅ 해결 방법

**즉시 UI 업데이트 전략:**
```javascript
// After (개선된 코드)
const handleMoveFiles = async (targetFolderId) => {
    try {
        console.log('[MoveFiles] Starting move operation:', {
            selectedFiles,
            targetFolderId,
            currentFolderId: currentFolder?.id,
            fileCount: selectedFiles.length
        });

        // 1. 백엔드 API 호출
        await folderApi.moveFiles(selectedFiles, targetFolderId);

        // 2. 선택 모드 해제
        setSelectedFiles([]);
        setIsSelectionMode(false);

        // 3. 폴더 목록 먼저 업데이트 (파일 카운트 갱신)
        await loadFolders();

        // 4. 현재 폴더의 파일 목록 즉시 재로드
        // 타겟 폴더로 이동하지 않고, 현재 폴더 유지
        await loadFiles({
            dateRange,
            filterType,
            sortOption,
            favoriteOnly,
            folderId: currentFolder?.id // 현재 폴더 ID 그대로 사용
        });

        console.log('[MoveFiles] Move operation complete');
    } catch (err) {
        console.error('[MoveFiles] Move failed:', err);
        alert('파일 이동에 실패했습니다.');
    }
};
```

#### 💡 배운 점

**UX 원칙:**
- 사용자가 현재 작업 중인 컨텍스트를 유지
- 자동 네비게이션은 사용자 의도와 다를 수 있음
- "파일 이동"은 "폴더 전환"이 아님

**상태 관리 순서:**
1. 백엔드 작업 완료
2. 로컬 상태 정리 (선택 해제)
3. 관련 데이터 순차적 업데이트 (폴더 목록 → 파일 목록)
4. 현재 뷰 유지하며 데이터만 갱신

**테스트 시나리오:**
```javascript
// 백엔드 검증 테스트
1. Source 폴더에 파일 추가
2. Target 폴더로 파일 이동
3. Source 폴더 확인 → 파일 없어야 함 ✅
4. Target 폴더 확인 → 파일 있어야 함 ✅
```

---

### 3. 모바일 UI 최적화 이슈

#### 3-1. 폴더 아이콘 정렬 문제

**🚨 문제:** 모바일에서 폴더 메뉴 버튼이 왼쪽으로 치우쳐 보임

**✅ 해결:**
```javascript
// Before
style={{
    padding: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
}}

// After
style={{
    padding: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center', // 추가
    gap: '4px',
    minWidth: '40px',  // 터치 영역 확보
    minHeight: '40px'  // 터치 영역 확보
}}
```

**배운 점:**
- 모바일 버튼은 최소 44x44px 터치 영역 필요 (iOS HIG)
- `justifyContent: 'center'`로 아이콘 중앙 정렬
- 시각적 균형을 위한 padding과 minWidth/Height 조합

---

#### 3-2. Bottom Sheet 삭제 버튼 가시성 문제

**🚨 문제:** 모바일에서 폴더 삭제 버튼이 화면 하단에 잘려서 반만 보임

**시도 1 (실패):**
```javascript
// paddingBottom 추가
paddingBottom: 'max(20px, env(safe-area-inset-bottom))'
// → 효과 없음, 스크롤 영역에 영향
```

**시도 2 (부분 성공):**
```javascript
// 별도 spacer div 추가
{isMobile && (
    <div style={{
        height: 'calc(40px + env(safe-area-inset-bottom, 0px))',
        flexShrink: 0
    }} />
)}
// → 여전히 반만 보임
```

**시도 3 (최종 해결):**
```javascript
// spacer 높이 대폭 증가
{isMobile && (
    <div style={{
        height: 'calc(80px + env(safe-area-inset-bottom, 0px))',
        background: 'transparent',
        flexShrink: 0  // 스크롤 시 축소 방지
    }} />
)}
```

**컨테이너 설정:**
```javascript
<div style={{
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',  // 중요: 스크롤바 숨김
    maxHeight: '80vh'    // 화면의 80%까지만 사용
}}>
    {/* 메뉴 아이템들 */}
    {/* Spacer */}
</div>
```

#### 💡 배운 점

**Safe Area 대응:**
- `env(safe-area-inset-bottom)`: iPhone 노치/홈 인디케이터 영역
- iOS Safari에서 하단 툴바 고려 필요
- 실제 디바이스 테스트 필수

**Bottom Sheet 설계 원칙:**
```
1. maxHeight: 80vh (화면을 다 차지하지 않게)
2. overflow: hidden (스크롤바 UI 방지)
3. flexShrink: 0 (spacer가 축소되지 않게)
4. Safe area + 추가 여유 공간 (80px)
```

**디버깅 팁:**
- 실제 모바일 기기에서 테스트
- Chrome DevTools의 모바일 시뮬레이터는 safe area를 정확히 재현 못함
- 배경색을 임시로 넣어서 spacer 영역 확인

---

#### 3-3. 갤러리 아이콘 스타일 불일치

**🚨 문제:** MoreVertical(더보기) 아이콘과 Star(즐겨찾기) 아이콘의 스타일이 달라 보임

**원인:**
```javascript
// MoreVertical (Before)
<button style={{
    background: 'rgba(0,0,0,0.6)',
    border: '1px solid rgba(255,255,255,0.2)',
    backdropFilter: 'blur(4px)',
    width: '20px',
    height: '20px'
}}>
    <MoreVertical size={12} />
</button>

// Star (기존)
<div style={{
    background: 'rgba(0,0,0,0.3)',
    backdropFilter: 'blur(2px)',
    width: '20px',
    height: '20px'
}}>
    <Star size={12} color="white" strokeWidth={2} />
</div>
```

**차이점:**
1. MoreVertical은 `<button>` 래퍼 사용
2. 배경 불투명도 차이 (0.6 vs 0.3)
3. Border 유무
4. Blur 강도 차이 (4px vs 2px)
5. Icon props 차이 (color, strokeWidth)

**✅ 해결:**
```javascript
// MoreVertical (After) - Star와 동일하게 변경
<div
    onClick={(e) => {
        e.stopPropagation();
        if (onOpenOptions) {
            onOpenOptions(file);
        }
    }}
    style={{
        position: 'absolute',
        top: '8px',
        right: '8px',
        zIndex: 20,
        cursor: 'pointer',
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        background: 'rgba(0,0,0,0.3)',      // Star와 동일
        backdropFilter: 'blur(2px)',        // Star와 동일
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s ease'
    }}
>
    <MoreVertical
        size={12}
        color="white"      // 추가
        strokeWidth={2}    // 추가
    />
</div>
```

#### 💡 배운 점

**UI 일관성 원칙:**
- 같은 계층의 컴포넌트는 동일한 스타일 패턴 사용
- `<button>` vs `<div>`: semantic HTML은 좋지만 스타일 일관성도 중요
- Icon props (color, strokeWidth)도 통일

**디자인 시스템:**
```javascript
// 공통 스타일을 변수로 관리하는 것이 좋음
const ICON_BUTTON_STYLE = {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: 'rgba(0,0,0,0.3)',
    backdropFilter: 'blur(2px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease'
};
```

---

## 🎯 아키텍처 개선사항

### 폴더 네비게이션 UX 개선

**Before: 툴바 햄버거 메뉴**
```
[날짜 선택] [☰ 폴더 메뉴] [정렬] [업로드]
```
- 문제: 폴더 기능이 숨겨져 있음
- 모바일에서만 표시, 데스크톱은 사이드바 사용

**After: 필터 바 통합**
```
[전체] [📁 폴더] [이미지] [동영상] [⭐ 즐겨찾기]
```
- 장점: 폴더가 다른 필터와 동등한 위치
- 원클릭으로 폴더 네비게이션 접근
- 직관적이고 일관된 UX

**구현:**
```javascript
// GalleryFilters.jsx
<button onClick={onFolderClick} style={{...}}>
    <Folder size={14} color="#F59E0B" strokeWidth={2} />
    폴더
</button>

// Gallery.jsx
<GalleryFilters
    filterType={filterType}
    onFilterChange={setFilterType}
    onFolderClick={() => setIsFolderSidebarOpen(true)}
/>
```

---

## 📊 데이터 플로우 다이어그램

### 폴더 파일 로딩 플로우

```
사용자 클릭: 폴더 "앵모닝" (id: 6)
    ↓
Gallery.jsx: setCurrentFolder({ id: 6, folder_name: '앵모닝' })
    ↓
useEffect: loadFiles({ folderId: 6, ... })
    ↓
Backend API: GET /api/v1/files/folder/6
    ↓
Response: [
    { id: 101, name: 'photo1.jpg', s3_key: '...', thumbnail_key: '...' },
    { id: 102, name: 'photo2.jpg', s3_key: '...', thumbnail_key: '...' }
]
    ↓
useGalleryFiles: transformFileData() + add download URLs
    ↓
Gallery.jsx: setFiles([...transformed files])
    ↓
useMemo: folderFilteredFiles
    ├─ currentFolder === null → filter by !folder_id (Root)
    └─ currentFolder !== null → return all (Already filtered by backend)
    ↓
Render: GalleryGrid with 2 files
```

### 파일 이동 플로우

```
사용자 선택: 파일 3개 선택 (ids: [101, 102, 103])
    ↓
사용자 클릭: "폴더로 이동" → 타겟 폴더 선택 (id: 7)
    ↓
Gallery.jsx: handleMoveFiles(targetFolderId: 7)
    ↓
Backend API: PUT /api/v1/files/move
    Body: { file_ids: [101, 102, 103], folder_id: 7 }
    ↓
Response: { moved_count: 3 }
    ↓
Frontend: 순차 업데이트
    ├─ 1. setSelectedFiles([])
    ├─ 2. setIsSelectionMode(false)
    ├─ 3. loadFolders() → 폴더 카운트 갱신
    └─ 4. loadFiles({ folderId: currentFolder?.id }) → 파일 목록 새로고침
    ↓
Result:
    - Source 폴더: 3개 파일 사라짐
    - Target 폴더: 3개 파일 추가 (file_count 증가)
    - UI: 현재 폴더에 남아있으면서 실시간 업데이트
```

---

## 🔧 개발 환경 및 도구

### 로깅 전략

**효과적인 디버깅을 위한 로깅 패턴:**

```javascript
// 1. Operation 시작
console.log('[MoveFiles] Starting move operation:', {
    selectedFiles,
    targetFolderId,
    currentFolderId: currentFolder?.id,
    fileCount: selectedFiles.length
});

// 2. API 응답
console.log('[MoveFiles] API response:', result);

// 3. 각 단계별 진행 상황
console.log('[MoveFiles] Reloading folders...');
console.log('[MoveFiles] Reloading files for current folder...');

// 4. 완료
console.log('[MoveFiles] Move operation complete');

// 5. 에러 처리
console.error('[MoveFiles] Move failed:', err);
```

**장점:**
- `[ComponentName]` prefix로 로그 출처 명확히
- 객체로 관련 데이터 한번에 출력
- 단계별 추적 가능

### 테스트 체크리스트

**폴더 관리 기능:**
- [ ] 폴더 생성 → DB 저장 확인
- [ ] 폴더 이름 변경 → UI 즉시 반영
- [ ] 폴더 삭제 → 파일 루트로 이동 확인
- [ ] 하위 폴더 있는 폴더 삭제 → 경고 메시지
- [ ] 파일 이동 → Source 폴더에서 사라짐 확인
- [ ] 파일 이동 → Target 폴더에 추가 확인
- [ ] 폴더별 필터링 → 올바른 파일만 표시

**모바일 UI:**
- [ ] iOS Safari 하단 툴바 고려 (safe area)
- [ ] Android Chrome 테스트
- [ ] Bottom Sheet 삭제 버튼 완전히 보임
- [ ] 터치 영역 44x44px 이상 (Apple HIG)
- [ ] 스크롤 동작 자연스러움

---

## 💭 고민해야 할 부분

### 1. 페이징 처리

**현재 상황:**
- 폴더당 모든 파일을 한번에 로드
- 파일이 많을 경우 성능 이슈 가능

**개선 방향:**
```javascript
// Infinite Scroll or Pagination
const [page, setPage] = useState(1);
const [hasMore, setHasMore] = useState(true);

const loadMoreFiles = async () => {
    const result = await folderApi.getFolderFiles(folderId, {
        page,
        size: 50
    });
    setFiles(prev => [...prev, ...result.files]);
    setPage(p => p + 1);
    setHasMore(result.has_more);
};
```

**고려사항:**
- Intersection Observer로 자동 로드 vs 명시적 "더보기" 버튼
- 스크롤 위치 복원 (뒤로가기 시)
- 로딩 스켈레톤 UI

---

### 2. 낙관적 업데이트 적용

**현재: 서버 응답 대기 후 UI 업데이트**
```javascript
await folderApi.moveFiles(selectedFiles, targetFolderId);
await loadFiles(); // 서버 응답 후 UI 업데이트
```

**개선: 즉시 UI 업데이트 + 실패 시 롤백**
```javascript
// 1. 즉시 UI 업데이트
setFiles(prev => prev.filter(f => !selectedFiles.includes(f.id)));

// 2. 백엔드 요청
try {
    await folderApi.moveFiles(selectedFiles, targetFolderId);
} catch (err) {
    // 3. 실패 시 롤백
    await loadFiles();
    alert('파일 이동에 실패했습니다.');
}
```

**장점:**
- 즉각적인 사용자 피드백
- 네트워크 지연 체감 감소

**단점:**
- 실패 시 롤백 복잡도 증가
- 동시 작업 시 상태 동기화 이슈

---

### 3. 폴더 구조 캐싱

**현재: 매번 서버에서 폴더 트리 로드**

**개선: Context API + Local Storage**
```javascript
// FolderContext.jsx
const FolderContext = createContext();

export const FolderProvider = ({ children }) => {
    const [folders, setFolders] = useState(() => {
        // Local Storage에서 초기 로드
        const cached = localStorage.getItem('folderTree');
        return cached ? JSON.parse(cached) : [];
    });

    const refreshFolders = async () => {
        const result = await folderApi.getFolders();
        setFolders(result);
        localStorage.setItem('folderTree', JSON.stringify(result));
    };

    return (
        <FolderContext.Provider value={{ folders, refreshFolders }}>
            {children}
        </FolderContext.Provider>
    );
};
```

**고려사항:**
- 캐시 무효화 전략 (TTL, 버전 관리)
- 여러 탭에서 동시 작업 시 동기화
- Local Storage 용량 제한

---

### 4. 드래그 앤 드롭 파일 이동

**현재: 선택 → 메뉴 → 폴더 선택**

**개선: 드래그 앤 드롭**
```javascript
// 파일 드래그 시작
const handleDragStart = (e, file) => {
    e.dataTransfer.setData('fileId', file.id);
};

// 폴더에 드롭
const handleDrop = async (e, folderId) => {
    e.preventDefault();
    const fileId = e.dataTransfer.getData('fileId');
    await folderApi.moveFiles([fileId], folderId);
    await loadFiles();
};
```

**고려사항:**
- 모바일 터치 이벤트 지원
- 드래그 중 시각적 피드백
- 다중 파일 드래그 처리

---

### 5. 폴더 즐겨찾기

**아이디어:**
- 자주 사용하는 폴더를 즐겨찾기로 등록
- 사이드바 상단에 고정 표시
- 빠른 접근 지원

**구현 방향:**
```javascript
// Backend
PUT /api/v1/folders/:id/favorite
{
    "is_favorite": true
}

// Frontend
const FolderItem = ({ folder }) => (
    <div>
        <Star
            onClick={() => toggleFolderFavorite(folder.id)}
            fill={folder.is_favorite ? '#FFD700' : 'none'}
        />
        {folder.folder_name}
    </div>
);
```

---

## 📈 성능 모니터링

### 측정 지표

**로딩 시간:**
```javascript
console.time('[Gallery] Load files');
await loadFiles({ folderId });
console.timeEnd('[Gallery] Load files');
// → [Gallery] Load files: 245ms
```

**렌더링 성능:**
```javascript
// React DevTools Profiler 사용
// - 컴포넌트별 렌더링 시간
// - 리렌더링 빈도
// - 메모이제이션 효과
```

**네트워크:**
```javascript
// Chrome DevTools Network 탭
// - API 응답 시간
// - Payload 크기
// - 동시 요청 수
```

---

## ✅ 체크리스트: 새로운 UI 컴포넌트 추가 시

### 모바일 최적화
- [ ] 터치 영역 최소 44x44px (iOS HIG)
- [ ] Safe Area Inset 고려 (`env(safe-area-inset-*)`)
- [ ] 반응형 폰트 크기 (16px 이상)
- [ ] 스크롤 영역 `overflow-y: auto`
- [ ] Bottom Sheet는 `maxHeight: 80vh`

### 접근성
- [ ] 적절한 semantic HTML (`<button>`, `<nav>`)
- [ ] Keyboard navigation 지원
- [ ] ARIA labels (`aria-label`, `role`)
- [ ] Color contrast 4.5:1 이상

### 성능
- [ ] React.memo로 불필요한 리렌더링 방지
- [ ] useMemo/useCallback 활용
- [ ] 큰 리스트는 가상화 (react-window)
- [ ] 이미지 lazy loading

### 코드 품질
- [ ] PropTypes 또는 TypeScript
- [ ] 의미있는 변수명
- [ ] 주석으로 복잡한 로직 설명
- [ ] 에러 처리 (try-catch, fallback UI)

---

## 🎓 결론

### 핵심 교훈

1. **API 설계 시 백엔드-프론트엔드 책임 분리가 중요**
   - 백엔드가 필터링하면 프론트는 그대로 사용
   - 불필요한 이중 처리 방지

2. **UX는 사용자 컨텍스트 유지가 핵심**
   - 자동 네비게이션보다 현재 위치 유지 + 데이터 갱신
   - 작업 완료 후 사용자가 예상하는 위치에 있어야 함

3. **모바일 UI는 실제 기기 테스트 필수**
   - Safe Area, 터치 영역, Bottom Sheet
   - 시뮬레이터는 한계가 있음

4. **일관성이 사용자 경험을 좌우**
   - 같은 계층의 UI 요소는 동일한 패턴
   - 디자인 시스템 또는 공통 스타일 변수 활용

5. **효과적인 로깅은 디버깅 시간을 10배 단축**
   - 컴포넌트/작업 단위로 prefix
   - 객체 형태로 관련 데이터 출력
   - 단계별 진행 상황 기록

---

### 다음 단계

- [ ] 폴더 드래그 앤 드롭 구현
- [ ] 폴더 즐겨찾기 기능
- [ ] 무한 스크롤 페이징 적용
- [ ] 낙관적 업데이트 패턴 적용
- [ ] 폴더 구조 캐싱 및 Context API 전환
- [ ] TypeScript 마이그레이션 검토

---

**작성자:** Claude (AI Assistant)
**리뷰:** 실전 프로젝트 경험 기반
**라이선스:** MIT
