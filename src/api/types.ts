/** Учётные данные инстанса GREEN-API. */
export interface Credentials {
  idInstance: string;
  apiTokenInstance: string;
  /** Необязательное переопределение хоста API (по умолчанию вычисляется из idInstance). */
  apiUrl?: string;
}

export interface SendMessageResponse {
  idMessage: string;
}

export interface StateInstanceResponse {
  stateInstance:
    | 'authorized'
    | 'notAuthorized'
    | 'blocked'
    | 'starting'
    | 'suspended'
    | 'pendingPassword'
    | string;
}

export interface CheckAccountResponse {
  exist: boolean;
  chatId?: string;
  fromCache?: boolean;
}

export interface SenderData {
  chatId: string;
  chatName?: string;
  sender?: string;
  senderName?: string;
  senderContactName?: string;
}

export interface MessageData {
  typeMessage: string;
  textMessageData?: { textMessage: string };
  extendedTextMessageData?: { text: string; description?: string; title?: string };
}

/** Тело уведомления, приходящего из очереди инстанса. */
export interface NotificationBody {
  typeWebhook: string;
  timestamp?: number;
  idMessage?: string;
  senderData?: SenderData;
  messageData?: MessageData;
  /** Присутствует в уведомлениях о статусе исходящего сообщения. */
  chatId?: string;
  status?: string;
  stateInstance?: string;
}

export interface Notification {
  receiptId: number;
  body: NotificationBody;
}
