import browser from '../utils/browser-polyfill';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import '../reminder/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
