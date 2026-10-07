export type MessageStatus = 'sending' | 'sent' | 'failed';

export interface Message {
  id: string;
  chatId: string;
  text: string;
  /** true — сообщение отправлено нами, false — получено от собеседника. */
  outgoing: boolean;
  /** Время в миллисекундах. */
  timestamp: number;
  status: MessageStatus;
}

export interface Chat {
  /** chatId в терминах GREEN-API. */
  id: string;
  /** Отображаемое имя: имя из MAX либо номер телефона. */
  name: string;
  /** Номер телефона, если чат создан по номеру. */
  phone?: string;
}

export type ConnectionStatus = 'connecting' | 'online' | 'error';

export interface ConnectionState {
  status: ConnectionStatus;
  error?: string;
}
