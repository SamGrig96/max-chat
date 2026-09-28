import { useState, type FormEvent } from 'react';
import { getStateInstance } from '../api/greenApi';
import type { Credentials } from '../types';

const DEFAULT_API_URL = 'https://api.green-api.com';

// хост инстанса: первые 4 цифры idInstance, как в личном кабинете
const apiUrlFor = (idInstance: string) =>
  /^\d{4}/.test(idInstance) ? `https://${idInstance.slice(0, 4)}.api.greenapi.com` : DEFAULT_API_URL;

interface Props {
  onLogin: (creds: Credentials) => void;
}

export function LoginForm({ onLogin }: Props) {
  const [form, setForm] = useState<Credentials>({ apiUrl: DEFAULT_API_URL, idInstance: '', apiTokenInstance: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [apiUrlEdited, setApiUrlEdited] = useState(false);

  const update = (key: keyof Credentials) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    if (key === 'apiUrl') setApiUrlEdited(true);
    setForm((f) => ({
      ...f,
      [key]: value,
      ...(key === 'idInstance' && !apiUrlEdited ? { apiUrl: apiUrlFor(value) } : {}),
    }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { stateInstance } = await getStateInstance(form);
      if (stateInstance !== 'authorized') {
        setError(`Инстанс не авторизован (статус: ${stateInstance}). Авторизуйте его в личном кабинете GREEN-API.`);
        return;
      }
      onLogin(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось подключиться');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = form.idInstance && form.apiTokenInstance && form.apiUrl && !loading;

  return (
    <div className="login">
      <form className="login__card" onSubmit={submit}>
        <div className="login__logo" aria-hidden>
          M
        </div>
        <h1>Вход в чат</h1>
        <p className="login__hint">
          Введите данные инстанса из{' '}
          <a href="https://console.green-api.com" target="_blank" rel="noreferrer">
            личного кабинета GREEN-API
          </a>
        </p>

        <label>
          idInstance
          <input value={form.idInstance} onChange={update('idInstance')} placeholder="3100000000" inputMode="numeric" autoFocus />
        </label>
        <label>
          apiTokenInstance
          <input value={form.apiTokenInstance} onChange={update('apiTokenInstance')} placeholder="d75b3a66374942c5b3c019c698abc2067e151558acbd412345" type="password" />
        </label>
        <label>
          apiUrl
          <input value={form.apiUrl} onChange={update('apiUrl')} placeholder={DEFAULT_API_URL} />
        </label>

        {error && <div className="login__error">{error}</div>}

        <button type="submit" disabled={!canSubmit}>
          {loading ? 'Проверяем…' : 'Войти'}
        </button>
      </form>
    </div>
  );
}
