import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  GreenApiError,
  checkAccount,
  deleteNotification,
  receiveNotification,
  sendMessage as sendMessageRequest,
} from '../api/greenApi';
import type { Credentials, MessageData, NotificationBody } from '../api/types';
import type { Chat, ConnectionState, Message } from '../types';
import { formatPhone, isValidPhone, normalizePhone } from '../utils/phone';
import { loadChats, loadMessages, saveChats, saveMessages } from '../utils/storage';

const RECEIVE_TIMEOUT_SECONDS = 10;
const RETRY_DELAY_MS = 3000;

/** В задании нужны только текстовые сообщения — остальные типы пропускаем. */
function extractText(messageData?: MessageData): string | null {
  if (!messageData) return null;
  if (messageData.typeMessage === 'textMessage') {
    return messageData.textMessageData?.textMessage ?? null;
  }
  if (messageData.typeMessage === 'extendedTextMessage') {
    return messageData.extendedTextMessageData?.text ?? null;
  }
  return null;
}

function chatTitleFromId(chatId: string): string {
  const phone = /^(\d+)@c\.us$/.exec(chatId);
  return phone ? formatPhone(phone[1]) : chatId;
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

function sortedInsert(list: Message[], message: Message): Message[] {
  const next = [...list, message];
  next.sort((a, b) => a.timestamp - b.timestamp);
  return next;
}

export function useChat(credentials: Credentials) {
  const { idInstance } = credentials;

  const [chats, setChats] = useState<Chat[]>(() => loadChats(idInstance));
  const [messages, setMessages] = useState<Record<string, Message[]>>(() => loadMessages(idInstance));
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [connection, setConnection] = useState<ConnectionState>({ status: 'connecting' });
  const [instanceState, setInstanceState] = useState<string | null>(null);

  // Идентификаторы уже показанных сообщений: защита от дублей, когда отправленное
  // нами сообщение возвращается ещё и уведомлением outgoingAPIMessageReceived.
  const seenMessageIds = useRef<Set<string>>(
    new Set(
      Object.values(loadMessages(idInstance))
        .flat()
        .map((message) => message.id),
    ),
  );

  useEffect(() => saveChats(idInstance, chats), [idInstance, chats]);
  useEffect(() => saveMessages(idInstance, messages), [idInstance, messages]);

  const upsertChat = useCallback((chat: Chat) => {
    setChats((prev) => {
      const existing = prev.find((item) => item.id === chat.id);
      if (!existing) return [chat, ...prev];
      // Имя собеседника из MAX точнее, чем подставленный нами номер телефона.
      if (chat.name && chat.name !== chat.id && existing.name !== chat.name) {
        return prev.map((item) =>
          item.id === chat.id ? { ...item, name: chat.name, phone: item.phone ?? chat.phone } : item,
        );
      }
      return prev;
    });
  }, []);

  const appendMessage = useCallback((message: Message) => {
    seenMessageIds.current.add(message.id);
    setMessages((prev) => ({
      ...prev,
      [message.chatId]: sortedInsert(prev[message.chatId] ?? [], message),
    }));
  }, []);

  const handleNotification = useCallback(
    (body: NotificationBody) => {
      if (body.typeWebhook === 'stateInstanceChanged') {
        setInstanceState(body.stateInstance ?? null);
        return;
      }

      const outgoing =
        body.typeWebhook === 'outgoingMessageReceived' ||
        body.typeWebhook === 'outgoingAPIMessageReceived';
      const incoming = body.typeWebhook === 'incomingMessageReceived';
      if (!outgoing && !incoming) return;

      const chatId = body.senderData?.chatId;
      const text = extractText(body.messageData);
      if (!chatId || text === null) return;

      const id = body.idMessage ?? `${body.timestamp ?? Date.now()}-${chatId}`;
      if (seenMessageIds.current.has(id)) return;

      const name = incoming
        ? body.senderData?.senderName ||
          body.senderData?.senderContactName ||
          body.senderData?.chatName
        : body.senderData?.chatName;

      upsertChat({ id: chatId, name: name || chatTitleFromId(chatId) });
      appendMessage({
        id,
        chatId,
        text,
        outgoing,
        timestamp: body.timestamp ? body.timestamp * 1000 : Date.now(),
        status: 'sent',
      });
    },
    [appendMessage, upsertChat],
  );

  // Приём сообщений по технологии HTTP API: receiveNotification + deleteNotification.
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const poll = async () => {
      while (!signal.aborted) {
        try {
          const notification = await receiveNotification(credentials, RECEIVE_TIMEOUT_SECONDS, signal);
          if (signal.aborted) return;
          setConnection({ status: 'online' });

          if (notification) {
            handleNotification(notification.body);
            await deleteNotification(credentials, notification.receiptId, signal);
          }
        } catch (error) {
          if (signal.aborted || (error as Error)?.name === 'AbortError') return;
          setConnection({
            status: 'error',
            error: error instanceof GreenApiError ? error.message : 'Ошибка связи с GREEN-API.',
          });
          await delay(RETRY_DELAY_MS, signal);
        }
      }
    };

    void poll();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credentials.idInstance, credentials.apiTokenInstance, credentials.apiUrl, handleNotification]);

  /** Создаёт чат по номеру телефона, предварительно уточнив chatId через checkAccount. */
  const createChat = useCallback(
    async (phoneInput: string): Promise<string> => {
      const digits = normalizePhone(phoneInput);
      if (!isValidPhone(digits)) {
        throw new Error('Введите номер в формате +7 999 123-45-67 (поддерживаются коды 7 и 375).');
      }

      let chatId = `${digits}@c.us`;
      try {
        const account = await checkAccount(credentials, digits);
        if (account && account.exist === false) {
          throw new Error('У этого номера нет аккаунта в MAX.');
        }
        if (account?.chatId) chatId = account.chatId;
      } catch (error) {
        // Если checkAccount недоступен, отправляем по номеру — MAX принимает такой формат.
        if (!(error instanceof GreenApiError)) throw error;
      }

      upsertChat({ id: chatId, name: formatPhone(digits), phone: digits });
      setActiveChatId(chatId);
      return chatId;
    },
    [credentials, upsertChat],
  );

  const sendText = useCallback(
    async (chatId: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      appendMessage({
        id: localId,
        chatId,
        text: trimmed,
        outgoing: true,
        timestamp: Date.now(),
        status: 'sending',
      });

      try {
        const { idMessage } = await sendMessageRequest(credentials, chatId, trimmed);
        seenMessageIds.current.add(idMessage);
        setMessages((prev) => ({
          ...prev,
          [chatId]: (prev[chatId] ?? []).map((message) =>
            message.id === localId ? { ...message, id: idMessage, status: 'sent' as const } : message,
          ),
        }));
      } catch (error) {
        setMessages((prev) => ({
          ...prev,
          [chatId]: (prev[chatId] ?? []).map((message) =>
            message.id === localId ? { ...message, status: 'failed' as const } : message,
          ),
        }));
        throw error;
      }
    },
    [appendMessage, credentials],
  );

  const orderedChats = useMemo(() => {
    const lastTimestamp = (chat: Chat) => {
      const list = messages[chat.id];
      return list?.length ? list[list.length - 1].timestamp : 0;
    };
    return [...chats].sort((a, b) => lastTimestamp(b) - lastTimestamp(a));
  }, [chats, messages]);

  return {
    chats: orderedChats,
    messages,
    activeChatId,
    setActiveChatId,
    connection,
    instanceState,
    createChat,
    sendText,
  };
}
