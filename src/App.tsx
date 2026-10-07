import { useState } from 'react';
import type { Credentials } from './api/types';
import { ChatApp } from './components/ChatApp';
import { LoginForm } from './components/LoginForm';
import { clearCredentials, loadCredentials, saveCredentials } from './utils/storage';

export default function App() {
  const [credentials, setCredentials] = useState<Credentials | null>(loadCredentials);

  const handleLogin = (next: Credentials) => {
    saveCredentials(next);
    setCredentials(next);
  };

  const handleLogout = () => {
    clearCredentials();
    setCredentials(null);
  };

  if (!credentials) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <ChatApp
      key={credentials.idInstance}
      credentials={credentials}
      onLogout={handleLogout}
    />
  );
}
