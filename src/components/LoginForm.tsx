import { useState, type FormEvent } from 'react';
import { GreenApiError, defaultApiUrl, getStateInstance } from '../api/greenApi';
import type { Credentials } from '../api/types';

interface LoginFormProps {
  onLogin: (credentials: Credentials) => void;
}

const STATE_HINTS: Record<string, string> = {
  notAuthorized: 'Инстанс не авторизован. Войдите в аккаунт MAX в личном кабинете GREEN-API.',
  blocked: 'Аккаунт заблокирован.',
  starting: 'Инстанс запускается, попробуйте через несколько минут.',
  suspended: 'На аккаунте временные ограничения на отправку сообщений.',
  pendingPassword: 'Требуется пароль двухфакторной аутентификации.',
};

export function LoginForm({ onLogin }: LoginFormProps) {
  const [idInstance, setIdInstance] = useState('');
  const [apiTokenInstance, setApiTokenInstance] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const credentials: Credentials = {
      idInstance: idInstance.trim(),
      apiTokenInstance: apiTokenInstance.trim(),
      apiUrl: apiUrl.trim() || undefined,
    };

    if (!credentials.idInstance || !credentials.apiTokenInstance) {
      setError('Заполните idInstance и apiTokenInstance.');
      return;
    }

    setChecking(true);
    try {
      const state = await getStateInstance(credentials);
      const hint = state ? STATE_HINTS[state.stateInstance] : undefined;
      if (hint) {
        setError(hint);
        return;
      }
      onLogin(credentials);
    } catch (caught) {
      setError(
        caught instanceof GreenApiError ? caught.message : 'Не удалось проверить учётные данные.',
      );
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="login">
      <form className="login__card" onSubmit={handleSubmit}>
        <div className="login__logo" aria-hidden="true" />
        <h1 className="login__title">Вход в чат MAX</h1>
        <p className="login__subtitle">
          Введите данные инстанса из личного кабинета{' '}
          <a href="https://console.green-api.com" target="_blank" rel="noreferrer">
            GREEN-API
          </a>
        </p>

        <label className="field">
          <span className="field__label">idInstance</span>
          <input
            className="field__input"
            value={idInstance}
            onChange={(event) => setIdInstance(event.target.value)}
            placeholder="1101123456"
            autoComplete="off"
            inputMode="numeric"
          />
        </label>

        <label className="field">
          <span className="field__label">apiTokenInstance</span>
          <input
            className="field__input"
            value={apiTokenInstance}
            onChange={(event) => setApiTokenInstance(event.target.value)}
            placeholder="d75b3a66c9a8...4f1b"
            autoComplete="off"
          />
        </label>

        {showAdvanced ? (
          <label className="field">
            <span className="field__label">apiUrl (необязательно)</span>
            <input
              className="field__input"
              value={apiUrl}
              onChange={(event) => setApiUrl(event.target.value)}
              placeholder={defaultApiUrl(idInstance || '1101')}
              autoComplete="off"
            />
          </label>
        ) : (
          <button type="button" className="login__advanced" onClick={() => setShowAdvanced(true)}>
            Указать apiUrl вручную
          </button>
        )}

        {error && <p className="login__error">{error}</p>}

        <button className="button button--primary" type="submit" disabled={checking}>
          {checking ? 'Проверяем...' : 'Войти'}
        </button>
      </form>
    </div>
  );
}
