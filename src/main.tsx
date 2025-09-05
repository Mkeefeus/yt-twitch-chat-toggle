import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';

// Mount to the container defined in popup.html
createRoot(document.getElementById('app')!).render(<App />);
