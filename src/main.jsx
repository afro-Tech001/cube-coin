import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext';
import ScrollToTop from './components/ScrollToTop/ScrollToTop.jsx';
import CubeBot from './components/CubeBot/CubeBot.jsx';

createRoot(document.getElementById('root')).render(
   <BrowserRouter>
      <AuthProvider>
        <ScrollToTop />
        <CubeBot />
        <App />
      </AuthProvider>
    </BrowserRouter>
)
