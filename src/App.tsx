import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import { ToastProvider } from './components/Toast';
import BrowsePage from './pages/BrowsePage';
import NewPreviewPage from './pages/NewPreviewPage';
import PreviewViewPage from './pages/PreviewViewPage';
import ReplacePage from './pages/ReplacePage';
import { purgeOldTrash } from './lib/folders';

export default function App() {
  useEffect(() => {
    purgeOldTrash().catch((err) => console.warn('Trash purge failed', err));
  }, []);

  return (
    <Router>
      <ToastProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<BrowsePage />} />
            <Route path="/folder/:folderId" element={<BrowsePage />} />
            <Route path="/new" element={<NewPreviewPage />} />
            <Route path="/preview/:id" element={<PreviewViewPage />} />
            <Route path="/replace/:id" element={<ReplacePage />} />
          </Routes>
        </Layout>
      </ToastProvider>
    </Router>
  );
}
