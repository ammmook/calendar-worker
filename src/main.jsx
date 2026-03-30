import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './components/AuthContext.jsx'
import { LoadingProvider } from './components/LoadingContext.jsx'

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'dummy_client_id_for_dev';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={clientId}>
      <LoadingProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </LoadingProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
)