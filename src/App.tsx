import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from './components';
import { SwapPage } from './pages/SwapPage';
import { ExplorerPage } from './pages/ExplorerPage';
import { IntentDetailPage } from './pages/IntentDetailPage';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<SwapPage />} />
          <Route path="/explorer" element={<ExplorerPage />} />
          <Route path="/intent/:intentId" element={<IntentDetailPage />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
