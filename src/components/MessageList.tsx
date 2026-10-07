import { Fragment, useEffect, useRef } from 'react';
import type { Message } from '../types';
import { formatDay, formatTime, isSameDay } from '../utils/format';

interface MessageListProps {
  messages: Message[];
}

const STATUS_LABEL: Record<Message['status'], string> = {
  sending: 'Отправляется',
  sent: 'Отправлено',
  failed: 'Не отправлено',
};

export function MessageList({ messages }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="messages messages--empty">
        <p>Сообщений пока нет. Напишите первым.</p>
      </div>
    );
  }

  return (
    <div className="messages">
      {messages.map((message, index) => {
        const previous = messages[index - 1];
        const showDay =
          !previous || !isSameDay(new Date(previous.timestamp), new Date(message.timestamp));

        return (
          <Fragment key={message.id}>
            {showDay && <div className="messages__day">{formatDay(message.timestamp)}</div>}
            <div className={`bubble-row${message.outgoing ? ' bubble-row--out' : ''}`}>
              <div
                className={`bubble${message.outgoing ? ' bubble--out' : ''}${
                  message.status === 'failed' ? ' bubble--failed' : ''
                }`}
              >
                <span className="bubble__text">{message.text}</span>
                <span className="bubble__meta">
                  {message.outgoing && message.status !== 'sent' && (
                    <span className="bubble__status">{STATUS_LABEL[message.status]}</span>
                  )}
                  <time dateTime={new Date(message.timestamp).toISOString()}>
                    {formatTime(message.timestamp)}
                  </time>
                </span>
              </div>
            </div>
          </Fragment>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
