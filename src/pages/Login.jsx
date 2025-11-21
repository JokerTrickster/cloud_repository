import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Cloud } from 'lucide-react';

const Login = () => {
    const navigate = useNavigate();

    const handleLogin = () => {
        // Mock login: Store dummy tokens
        const mockAccessToken = `mock_access_token_${Date.now()}`;
        const mockRefreshToken = `mock_refresh_token_${Date.now()}`;

        // Dynamic import to avoid circular dependency issues if any, 
        // but standard import is fine here. Using direct import in file head is better.
        // We will add import at top.
        import('../utils/auth').then(({ setTokens }) => {
            setTokens(mockAccessToken, mockRefreshToken);
            navigate('/gallery');
        });
    };

    return (
        <div className="flex-center" style={{ minHeight: '100vh', flexDirection: 'column', padding: '20px' }}>
            <div style={{
                background: 'var(--surface)',
                padding: '40px',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-md)',
                width: '100%',
                maxWidth: '400px',
                textAlign: 'center'
            }}>
                <div style={{ marginBottom: '24px', color: 'var(--primary)' }}>
                    <Cloud size={64} />
                </div>
                <h1 style={{ marginBottom: '8px', fontSize: '24px' }}>CloudBox</h1>
                <p style={{ marginBottom: '32px', color: 'var(--text-secondary)' }}>
                    모든 사진과 동영상을 한 곳에서 안전하게 보관하세요.
                </p>

                <button
                    onClick={handleLogin}
                    style={{
                        width: '100%',
                        padding: '12px',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-full)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        fontSize: '16px',
                        color: 'var(--text-primary)',
                        transition: 'background 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#f1f3f4'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'var(--surface)'}
                >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width="20" height="20" />
                    Google 계정으로 로그인
                </button>
            </div>
            <footer style={{ marginTop: '24px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                © 2025 CloudBox Inc.
            </footer>
        </div>
    );
};

export default Login;
