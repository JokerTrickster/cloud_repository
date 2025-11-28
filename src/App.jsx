import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Gallery from './pages/Gallery';
import Upload from './pages/Upload';
import MyPage from './pages/MyPage';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { UploadProvider } from './context/UploadContext';

const App = () => {
  return (
    <Router>
      <UploadProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/gallery" replace />} />
            <Route path="gallery" element={<Gallery />} />
            <Route path="upload" element={<Upload />} />
            <Route path="mypage" element={<MyPage />} />
          </Route>
        </Routes>
      </UploadProvider>
    </Router>
  );
};

export default App;
