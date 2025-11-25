import axios from 'axios';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '../utils/auth';

const client = axios.create({
    baseURL: import.meta.env.VITE_AUTH_API_URL || '',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor: Inject Access Token
client.interceptors.request.use(
    (config) => {
        const token = getAccessToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor: Handle Token Refresh
client.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If 401 Unauthorized and not already retrying
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = getRefreshToken();

                // If no refresh token exists, redirect to login immediately
                if (!refreshToken) {
                    console.log('No refresh token available, redirecting to login');
                    clearTokens();
                    // Save the current path to redirect back after login
                    const currentPath = window.location.pathname;
                    if (currentPath !== '/login') {
                        sessionStorage.setItem('redirectAfterLogin', currentPath);
                    }
                    window.location.href = '/login';
                    return Promise.reject(new Error('No refresh token available'));
                }

                // Try to refresh the token
                // In production, this would be an actual API call
                // const { data } = await axios.post('/api/auth/refresh', { refreshToken });

                // For development: simulate token refresh
                // You can set this to fail to test the redirect behavior
                const shouldSimulateRefreshSuccess = Math.random() > 0.3; // 70% success rate

                if (!shouldSimulateRefreshSuccess) {
                    throw new Error('Refresh token expired');
                }

                const newAccessToken = `new_mock_access_token_${Date.now()}`;
                const newRefreshToken = `new_mock_refresh_token_${Date.now()}`;

                setTokens(newAccessToken, newRefreshToken);

                // Update header and retry original request
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return client(originalRequest);

            } catch (refreshError) {
                // Refresh failed - clear tokens and redirect to login
                console.log('Token refresh failed:', refreshError.message);
                clearTokens();

                // Save the current path to redirect back after login
                const currentPath = window.location.pathname;
                if (currentPath !== '/login') {
                    sessionStorage.setItem('redirectAfterLogin', currentPath);
                }

                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        // For other errors (403, 404, 500, etc.), just reject
        return Promise.reject(error);
    }
);

export default client;
