import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import BrowsePage from './pages/BrowsePage';
import NewPreviewPage from './pages/NewPreviewPage';
import PreviewViewPage from './pages/PreviewViewPage';
import ReplacePage from './pages/ReplacePage';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<BrowsePage />} />
          <Route path="/new" element={<NewPreviewPage />} />
          <Route path="/preview/:id" element={<PreviewViewPage />} />
          <Route path="/replace/:id" element={<ReplacePage />} />
        </Routes>
      </Layout>
    </Router>
  );
}
