import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated, getRefreshToken } from '../utils/auth';

const ProtectedRoute = ({ children }) => {
    const location = useLocation();
    const hasAccessToken = isAuthenticated();
    const hasRefreshToken = !!getRefreshToken();

    useEffect(() => {
        // Check token validity on component mount
        if (!hasAccessToken && !hasRefreshToken) {
            // No tokens at all - redirect to login
            console.log('No tokens found, redirecting to login');
        }
    }, [hasAccessToken, hasRefreshToken]);

    // If no tokens at all, redirect to login
    if (!hasAccessToken && !hasRefreshToken) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // If we have refresh token but no access token, the interceptor will handle it
    // For now, we allow the request to proceed
    return children;
};

export default ProtectedRoute;