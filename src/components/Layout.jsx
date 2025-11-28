import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Cloud, Image as ImageIcon, Upload as UploadIcon, User, Menu, X } from 'lucide-react';
import { clearTokens } from '../utils/auth';
import GlobalUploadToast from './GlobalUploadToast';

const Layout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    const handleLogout = () => {
        clearTokens();
        navigate('/login');
    };

    const isActive = (path) => location.pathname === path;

    return (
        <div style={{ display: 'flex', height: '100vh', background: 'var(--background)' }}>
            {/* Sidebar (Desktop) */}
            <aside className="desktop-sidebar">
                <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        background: 'linear-gradient(135deg, var(--primary), #1967d2)',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        boxShadow: '0 4px 12px rgba(26, 115, 232, 0.3)'
                    }}>
                        <Cloud size={24} strokeWidth={2.5} />
                    </div>
                    <h1 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                        CloudBox
                    </h1>
                </div>

                <nav style={{ padding: '0 12px', marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <NavItem to="/gallery" icon={<ImageIcon size={20} />} label="갤러리" active={isActive('/gallery')} />
                    <NavItem to="/upload" icon={<UploadIcon size={20} />} label="업로드" active={isActive('/upload')} />
                    <NavItem to="/mypage" icon={<User size={20} />} label="마이페이지" active={isActive('/mypage')} />
                </nav>

                <div style={{ marginTop: 'auto', padding: '24px' }}>
                    <button
                        onClick={handleLogout}
                        style={{
                            width: '100%',
                            padding: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            background: 'rgba(234, 67, 53, 0.08)',
                            color: '#EA4335',
                            border: 'none',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '600',
                            transition: 'all 0.2s'
                        }}
                    >
                        <LogOut size={18} />
                        로그아웃
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <header className="mobile-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '32px',
                        height: '32px',
                        background: 'linear-gradient(135deg, var(--primary), #1967d2)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white'
                    }}>
                        <Cloud size={18} strokeWidth={2.5} />
                    </div>
                    <h1 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>CloudBox</h1>
                </div>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    style={{ background: 'none', border: 'none', padding: '8px' }}
                >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </header>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="mobile-menu-overlay">
                    <nav style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <NavItem to="/gallery" icon={<ImageIcon size={20} />} label="갤러리" active={isActive('/gallery')} onClick={() => setIsMobileMenuOpen(false)} />
                        <NavItem to="/upload" icon={<UploadIcon size={20} />} label="업로드" active={isActive('/upload')} onClick={() => setIsMobileMenuOpen(false)} />
                        <NavItem to="/mypage" icon={<User size={20} />} label="마이페이지" active={isActive('/mypage')} onClick={() => setIsMobileMenuOpen(false)} />
                        <button
                            onClick={handleLogout}
                            style={{
                                marginTop: '24px',
                                width: '100%',
                                padding: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                background: 'rgba(234, 67, 53, 0.08)',
                                color: '#EA4335',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: '15px',
                                fontWeight: '600'
                            }}
                        >
                            <LogOut size={20} />
                            로그아웃
                        </button>
                    </nav>
                </div>
            )}

            {/* Main Content */}
            <main style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                <Outlet />
            </main>

            {/* Global Upload Toast */}
            <GlobalUploadToast />

            <style>{`
                .desktop-sidebar {
                    width: 280px;
                    background: var(--surface);
                    border-right: 1px solid var(--border);
                    display: flex;
                    flex-direction: column;
                }
                .mobile-header {
                    display: none;
                    height: 60px;
                    padding: 0 16px;
                    background: var(--surface);
                    border-bottom: 1px solid var(--border);
                    align-items: center;
                    justify-content: space-between;
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    z-index: 100;
                }
                .mobile-menu-overlay {
                    display: none;
                    position: fixed;
                    top: 60px;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: var(--surface);
                    z-index: 99;
                }
                @media (max-width: 768px) {
                    .desktop-sidebar {
                        display: none;
                    }
                    .mobile-header {
                        display: flex;
                    }
                    .mobile-menu-overlay {
                        display: block;
                    }
                    main {
                        margin-top: 60px;
                    }
                }
            `}</style>
        </div>
    );
};

const NavItem = ({ to, icon, label, active, onClick }) => (
    <button
        onClick={() => {
            if (onClick) onClick();
            window.location.href = to; // Using href for simplicity with Router
        }}
        style={{
            width: '100%',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: active ? 'rgba(26, 115, 232, 0.1)' : 'transparent',
            color: active ? 'var(--primary)' : 'var(--text-secondary)',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '15px',
            fontWeight: active ? '600' : '500',
            transition: 'all 0.2s',
            textAlign: 'left'
        }}
    >
        {icon}
        {label}
    </button>
);

export default Layout;
