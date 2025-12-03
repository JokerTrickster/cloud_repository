import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Cloud, Grid, User } from 'lucide-react';

const Layout = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const navItems = [
        { icon: Grid, label: '갤러리', path: '/gallery' },
        { icon: User, label: '마이페이지', path: '/mypage' },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            {/* Desktop Sidebar */}
            <div className="desktop-sidebar" style={{
                display: 'none',
                width: '240px',
                borderRight: '1px solid var(--border)',
                padding: '20px',
                flexDirection: 'column',
                position: 'fixed',
                height: '100%',
                background: 'var(--surface)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px', paddingLeft: '12px' }}>
                    <Cloud size={32} color="var(--primary)" />
                    <span style={{ fontSize: '20px', fontWeight: 'bold' }}>CloudBox</span>
                </div>
                <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {navItems.map((item) => (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px',
                                borderRadius: 'var(--radius-full)',
                                background: location.pathname === item.path ? '#E8F0FE' : 'transparent',
                                color: location.pathname === item.path ? 'var(--primary)' : 'var(--text-secondary)',
                                fontSize: '16px',
                                fontWeight: location.pathname === item.path ? '500' : '400',
                                textAlign: 'left'
                            }}
                        >
                            <item.icon size={24} />
                            {item.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Main Content */}
            <main style={{ flex: 1, overflowY: 'auto', paddingBottom: '80px' }} className="main-content no-scrollbar">
                <Outlet />
            </main>

            {/* Mobile Bottom Nav */}
            <div className="mobile-nav" style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'var(--surface)',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-around',
                padding: '12px 0',
                zIndex: 1000
            }}>
                {navItems.map((item) => (
                    <button
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'transparent',
                            color: location.pathname === item.path ? 'var(--primary)' : 'var(--text-secondary)',
                            fontSize: '12px'
                        }}
                    >
                        <item.icon size={24} />
                        {item.label}
                    </button>
                ))}
            </div>

            <style>{`
        @media (min-width: 768px) {
          .desktop-sidebar { display: flex !important; }
          .mobile-nav { display: none !important; }
          .main-content { margin-left: 240px; padding-bottom: 0 !important; }
        }
      `}</style>
        </div>
    );
};

export default Layout;
