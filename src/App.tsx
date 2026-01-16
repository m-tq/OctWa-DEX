import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SwapPage } from './pages/SwapPage';
import { ExplorerPage } from './pages/ExplorerPage';
import { IntentDetailPage } from './pages/IntentDetailPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SwapPage />} />
        <Route path="/explorer" element={<ExplorerPage />} />
        <Route path="/intent/:intentId" element={<IntentDetailPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
