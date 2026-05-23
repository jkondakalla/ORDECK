import { useState } from 'react';
import BootSequence from './components/BootSequence';
import Dashboard from './pages/Dashboard';

export default function App() {
  const [booted, setBooted] = useState(false);

  return (
    <>
      <BootSequence onDone={() => setBooted(true)} />
      {booted && <Dashboard />}
    </>
  );
}
