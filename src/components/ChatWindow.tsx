import { useState, type FormEvent, type KeyboardEvent } from 'react';
import type { Chat, Message } from '../types';
import { initials } from '../utils/format';
import { MessageList } from './MessageList';

const MAX_MESSAGE_LENGTH = 4000;

interface ChatWindowProps {
  chat: Chat | null;
  messages: Message[];
  onSend: (text: string) => Promise<void>;
}

export function ChatWindow({ chat, messages, onSend }: ChatWindowProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!chat) {
    return (
      <section className="chat chat--placeholder">
        <p>Выберите чат слева или создайте новый по номеру телефона</p>
      </section>
    );
  }

  const submit = async () => {
    const value = text.trim();
    if (!value || sending) return;

    setSending(true);
    setError(null);
    setText('');
    try {
      await onSend(value);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось отправить сообщение.');
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void submit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <section className="chat">
      <header className="chat__header">
        <span className="chat__avatar">{initials(chat.name)}</span>
        <span className="chat__titles">
          <span className="chat__name">{chat.name}</span>
          <span className="chat__id">{chat.id}</span>
        </span>
      </header>

      <MessageList messages={messages} />

      {error && <p className="chat__error">{error}</p>}

      <form className="composer" onSubmit={handleSubmit}>
        <textarea
          className="composer__input"
          value={text}
          onChange={(event) => setText(event.target.value.slice(0, MAX_MESSAGE_LENGTH))}
          onKeyDown={handleKeyDown}
          placeholder="Напишите сообщение..."
          rows={1}
        />
        <button
          className="button button--send"
          type="submit"
          disabled={sending || text.trim().length === 0}
          aria-label="Отправить"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M3 20.5v-6l9-2.5-9-2.5v-6l19 8.5-19 8.5z" fill="currentColor" />
          </svg>
        </button>
      </form>
    </section>
  );
}
