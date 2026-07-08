import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import AuthenticatedApp from './AuthenticatedApp.tsx';
import { AuthProvider } from './contexts/AuthContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  </StrictMode>,
);
