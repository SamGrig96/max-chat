import { useState } from 'react';
import { LoginForm } from './components/LoginForm';
import { Messenger } from './components/Messenger';
import type { Credentials } from './types';
import { storage } from './utils/storage';

const CREDS_KEY = 'max-chat:credentials';

export default function App() {
  const [creds, setCreds] = useState<Credentials | null>(() => storage.get<Credentials>(CREDS_KEY));

  const login = (value: Credentials) => {
    storage.set(CREDS_KEY, value);
    setCreds(value);
  };

  const logout = () => {
    storage.remove(CREDS_KEY);
    setCreds(null);
  };

  return creds ? <Messenger key={creds.idInstance} creds={creds} onLogout={logout} /> : <LoginForm onLogin={login} />;
}
