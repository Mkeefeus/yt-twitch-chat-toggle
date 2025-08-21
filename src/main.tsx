import { render } from 'preact';
import { useState } from 'preact/hooks';
import { Popup } from './views/popup.tsx';
import { Settings } from './views/settings.tsx';
import './tailwind.css';

const App = () => {
  const [showSettings, setShowSettings] = useState(false);

  const handleNavigation = () => setShowSettings((s) => !s);

  return (
    <div class="min-w-[300px] max-w-[400px] p-4 bg-white rounded-lg shadow-lg border border-gray-200 relative overflow-hidden">
      <div class="relative">
        {/* Popup View */}
        <div 
          class={`transition-transform duration-300 ease-in-out ${
            showSettings ? '-translate-x-full opacity-0' : 'translate-x-0 opacity-100'
          }`}
        >
          <Popup handleNavigation={handleNavigation} />
        </div>
        
        {/* Settings View */}
        <div 
          class={`absolute top-0 left-0 w-full transition-transform duration-300 ease-in-out ${
            showSettings ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
          }`}
        >
          <Settings handleNavigation={handleNavigation} />
        </div>
      </div>
    </div>
  );
};

// Mount to the container defined in popup.html
render(<App />, document.getElementById('app')!);
