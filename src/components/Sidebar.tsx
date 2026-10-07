import { useState, type FormEvent } from 'react';
import type { Chat, ConnectionState, Message } from '../types';
import { formatTime, initials } from '../utils/format';

interface SidebarProps {
  chats: Chat[];
  messages: Record<string, Message[]>;
  activeChatId: string | null;
  connection: ConnectionState;
  idInstance: string;
  onSelectChat: (chatId: string) => void;
  onCreateChat: (phone: string) => Promise<string>;
  onLogout: () => void;
}

const CONNECTION_LABEL: Record<ConnectionState['status'], string> = {
  connecting: 'Подключение...',
  online: 'На связи',
  error: 'Нет связи',
};

export function Sidebar({
  chats,
  messages,
  activeChatId,
  connection,
  idInstance,
  onSelectChat,
  onCreateChat,
  onLogout,
}: SidebarProps) {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setCreating(true);
    try {
      await onCreateChat(phone);
      setPhone('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось создать чат.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <aside className="sidebar">
      <header className="sidebar__header">
        <div>
          <div className="sidebar__brand">MAX</div>
          <div className="sidebar__instance" title="idInstance">
            Инстанс {idInstance}
          </div>
        </div>
        <button className="button button--ghost" type="button" onClick={onLogout}>
          Выйти
        </button>
      </header>

      <div className={`status status--${connection.status}`} title={connection.error}>
        <span className="status__dot" />
        {CONNECTION_LABEL[connection.status]}
      </div>

      <form className="new-chat" onSubmit={handleSubmit}>
        <input
          className="field__input"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="+7 999 123-45-67"
          inputMode="tel"
          autoComplete="off"
        />
        <button className="button button--primary" type="submit" disabled={creating}>
          {creating ? '...' : 'Новый чат'}
        </button>
      </form>
      {error && <p className="new-chat__error">{error}</p>}

      <ul className="chat-list">
        {chats.length === 0 && <li className="chat-list__empty">Чатов пока нет</li>}
        {chats.map((chat) => {
          const chatMessages = messages[chat.id] ?? [];
          const last = chatMessages[chatMessages.length - 1];
          return (
            <li key={chat.id}>
              <button
                type="button"
                className={`chat-item${chat.id === activeChatId ? ' chat-item--active' : ''}`}
                onClick={() => onSelectChat(chat.id)}
              >
                <span className="chat-item__avatar">{initials(chat.name)}</span>
                <span className="chat-item__body">
                  <span className="chat-item__row">
                    <span className="chat-item__name">{chat.name}</span>
                    {last && <span className="chat-item__time">{formatTime(last.timestamp)}</span>}
                  </span>
                  <span className="chat-item__preview">
                    {last ? `${last.outgoing ? 'Вы: ' : ''}${last.text}` : 'Нет сообщений'}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
