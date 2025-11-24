import axios from 'axios';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '../utils/auth';

const client = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
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
                if (!refreshToken) {
                    throw new Error('No refresh token');
                }

                // Call refresh endpoint (Mocking this part as we don't have a real backend yet)
                // In a real app: const { data } = await axios.post('/api/auth/refresh', { refreshToken });
                // For now, we simulate a successful refresh with a new dummy token
                const newAccessToken = `new_mock_access_token_${Date.now()}`;
                const newRefreshToken = `new_mock_refresh_token_${Date.now()}`;

                setTokens(newAccessToken, newRefreshToken);

                // Update header and retry original request
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return client(originalRequest);

            } catch (refreshError) {
                // Refresh failed - logout user
                clearTokens();
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default client;
