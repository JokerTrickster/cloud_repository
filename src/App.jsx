import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Gallery from './pages/Gallery';
import MyPage from './pages/MyPage';
import SharedWithMe from './pages/SharedWithMe';
import SharedFolderView from './pages/SharedFolderView';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { WebSocketProvider } from './context/WebSocketContext';
import ProcessingToast from './components/ProcessingToast';

function App() {
  return (
    <WebSocketProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/shared-with-me" element={<SharedWithMe />} />
            <Route path="/shared-folder/:folderId" element={<SharedFolderView />} />
            <Route path="/mypage" element={<MyPage />} />
          </Route>
          <Route path="/" element={<Navigate to="/gallery" replace />} />
        </Routes>
        <ProcessingToast />
      </Router>
    </WebSocketProvider>
  );
}

export default App;
