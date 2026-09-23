import { Route, Routes } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { HostPage } from './pages/HostPage';
import { PlayerPage } from './pages/PlayerPage';
import { TestPage } from './pages/TestPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/host" element={<HostPage />} />
      <Route path="/play" element={<PlayerPage />} />
      <Route path="/test" element={<TestPage />} />
    </Routes>
  );
}
