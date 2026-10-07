import type { Credentials } from '../api/types';
import type { Chat, Message } from '../types';

const CREDENTIALS_KEY = 'max-chat:credentials';
const chatsKey = (idInstance: string) => `max-chat:chats:${idInstance}`;
const messagesKey = (idInstance: string) => `max-chat:messages:${idInstance}`;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Приватный режим браузера — работаем без сохранения истории.
  }
}

export function loadCredentials(): Credentials | null {
  const saved = read<Credentials | null>(CREDENTIALS_KEY, null);
  return saved?.idInstance && saved?.apiTokenInstance ? saved : null;
}

export function saveCredentials(credentials: Credentials): void {
  write(CREDENTIALS_KEY, credentials);
}

export function clearCredentials(): void {
  try {
    localStorage.removeItem(CREDENTIALS_KEY);
  } catch {
    // ignore
  }
}

export function loadChats(idInstance: string): Chat[] {
  return read<Chat[]>(chatsKey(idInstance), []);
}

export function saveChats(idInstance: string, chats: Chat[]): void {
  write(chatsKey(idInstance), chats);
}

export function loadMessages(idInstance: string): Record<string, Message[]> {
  return read<Record<string, Message[]>>(messagesKey(idInstance), {});
}

export function saveMessages(idInstance: string, messages: Record<string, Message[]>): void {
  write(messagesKey(idInstance), messages);
}
