import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';

window.__CAPY_RETOUCHING_VERSION__ = '0.1.0';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
