import { render } from 'preact';
import { App } from './App.tsx';
import './tailwind.css';

// Mount to the container defined in popup.html
render(<App />, document.getElementById('app')!);
