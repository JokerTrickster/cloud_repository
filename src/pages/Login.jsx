import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cloud } from 'lucide-react';
import { setTokens } from '../utils/auth';
import client from '../api/client';

const Login = () => {
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Initialize Google Sign-In
        if (window.google) {
            window.google.accounts.id.initialize({
                client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
                callback: handleGoogleCallback,
            });

            // Render the Google Sign-In button
            window.google.accounts.id.renderButton(
                document.getElementById('googleSignInButton'),
                {
                    theme: 'outline',
                    size: 'large',
                    width: '100%',
                    text: 'signin_with',
                    locale: 'ko'
                }
            );
        }
    }, []);

    const handleGoogleCallback = async (response) => {
        setIsLoading(true);
        setError('');

        try {
            console.log('Sending Google ID token to backend...');

            // Send ID token to backend
            const { data } = await client.post('/v0.1/auth/google/signin', {
                idToken: response.credential
            });

            console.log('Login successful, received tokens');

            // Store tokens
            setTokens(data.accessToken, data.refreshToken);

            // Check if there's a redirect URL saved from before login
            const redirectPath = sessionStorage.getItem('redirectAfterLogin');
            if (redirectPath) {
                sessionStorage.removeItem('redirectAfterLogin');
                navigate(redirectPath);
            } else {
                // Default navigation to gallery
                navigate('/gallery');
            }
        } catch (err) {
            console.error('Login failed:', err);
            console.error('Error response:', err.response);
            console.error('Error response data:', err.response?.data);

            // Enhanced error message extraction to handle nested error structures
            let errorMessage = '로그인에 실패했습니다. 다시 시도해주세요.';

            if (err.response?.data) {
                // Try nested error.message first (backend standard format)
                if (err.response.data.error?.message) {
                    errorMessage = err.response.data.error.message;
                }
                // Fallback to direct message field
                else if (err.response.data.message) {
                    errorMessage = err.response.data.message;
                }
                // Handle 500 errors specifically
                else if (err.response.status === 500) {
                    errorMessage = '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
                    console.error('Server returned 500 error - possible backend configuration issue');
                }
            }

            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
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

                {error && (
                    <div style={{
                        marginBottom: '16px',
                        padding: '12px',
                        background: '#fee',
                        border: '1px solid #fcc',
                        borderRadius: 'var(--radius)',
                        color: '#c33',
                        fontSize: '14px'
                    }}>
                        {error}
                    </div>
                )}

                {isLoading ? (
                    <div style={{
                        padding: '12px',
                        textAlign: 'center',
                        color: 'var(--text-secondary)'
                    }}>
                        로그인 중...
                    </div>
                ) : (
                    <div id="googleSignInButton" style={{ width: '100%' }}></div>
                )}
            </div>
            <footer style={{ marginTop: '24px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                © 2025 CloudBox Inc.
            </footer>
        </div>
    );
};

export default Login;
