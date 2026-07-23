import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { parseCapture, bootCapture } from './capture/captureMode';
import './styles.css';

// Video-capture mode (#capture=<preset>) mounts the bare engine, no React UI.
const capture = parseCapture();
if (capture) {
  bootCapture(capture);
} else {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
