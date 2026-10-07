import type {
  CheckAccountResponse,
  Credentials,
  Notification,
  SendMessageResponse,
  StateInstanceResponse,
} from './types';

const GENERIC_API_URL = 'https://api.green-api.com';

/**
 * Хост API указан в личном кабинете и обычно образован первыми четырьмя
 * цифрами idInstance (https://green-api.com/v3/docs/request-format/).
 */
export function defaultApiUrl(idInstance: string): string {
  const prefix = idInstance.trim().slice(0, 4);
  return /^\d{4}$/.test(prefix) ? `https://${prefix}.api.green-api.com` : GENERIC_API_URL;
}

/** Хост, который реально ответил, чтобы не перебирать варианты на каждом запросе. */
const resolvedHosts = new Map<string, string>();

function candidateHosts(credentials: Credentials): string[] {
  const explicit = credentials.apiUrl?.trim();
  if (explicit) return [explicit.replace(/\/+$/, '')];

  const cached = resolvedHosts.get(credentials.idInstance);
  if (cached) return [cached];

  const derived = defaultApiUrl(credentials.idInstance);
  return derived === GENERIC_API_URL ? [GENERIC_API_URL] : [derived, GENERIC_API_URL];
}

export class GreenApiError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'GreenApiError';
    this.status = status;
  }
}

function describeStatus(status: number, text: string): string {
  switch (status) {
    case 400:
      return 'Некорректный запрос к GREEN-API.';
    case 401:
    case 403:
      return 'Неверные idInstance или apiTokenInstance.';
    case 429:
      return 'Слишком много запросов к GREEN-API, попробуйте позже.';
    case 466:
      return 'Превышен лимит запросов тарифа или инстанс не оплачен.';
    default:
      return `GREEN-API вернул ошибку ${status}${text ? `: ${text.slice(0, 200)}` : ''}`;
  }
}

/**
 * Выполняет запрос к методу API. Если хост по умолчанию недоступен,
 * пробует общий хост api.green-api.com.
 */
async function request<T>(
  credentials: Credentials,
  method: string,
  init: RequestInit,
  options: { tail?: string | number; query?: string } = {},
): Promise<T | null> {
  const hosts = candidateHosts(credentials);
  let lastNetworkError: GreenApiError | null = null;

  for (const host of hosts) {
    const path = `${host}/waInstance${credentials.idInstance}/${method}/${credentials.apiTokenInstance}`;
    const url = `${path}${options.tail === undefined ? '' : `/${options.tail}`}${options.query ?? ''}`;

    let response: Response;
    try {
      response = await fetch(url, init);
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') throw error;
      lastNetworkError = new GreenApiError(
        'Не удалось связаться с GREEN-API. Проверьте подключение к сети и значение apiUrl.',
      );
      continue;
    }

    resolvedHosts.set(credentials.idInstance, host);

    const text = await response.text();
    if (!response.ok) {
      throw new GreenApiError(describeStatus(response.status, text), response.status);
    }
    // receiveNotification при отсутствии уведомлений отвечает пустым телом.
    if (!text.trim()) return null;

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new GreenApiError('GREEN-API вернул ответ в неизвестном формате.');
    }
  }

  throw lastNetworkError ?? new GreenApiError('Не удалось связаться с GREEN-API.');
}

function postInit(body: unknown, signal?: AbortSignal): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  };
}

/** Проверка состояния инстанса — используется для валидации учётных данных. */
export function getStateInstance(
  credentials: Credentials,
  signal?: AbortSignal,
): Promise<StateInstanceResponse | null> {
  return request<StateInstanceResponse>(credentials, 'getStateInstance', { method: 'GET', signal });
}

/** Проверка наличия аккаунта MAX у номера и получение его chatId. */
export function checkAccount(
  credentials: Credentials,
  phoneNumber: string,
  signal?: AbortSignal,
): Promise<CheckAccountResponse | null> {
  return request<CheckAccountResponse>(
    credentials,
    'checkAccount',
    postInit({ phoneNumber: Number(phoneNumber) }, signal),
  );
}

/** Отправка текстового сообщения. */
export async function sendMessage(
  credentials: Credentials,
  chatId: string,
  message: string,
  signal?: AbortSignal,
): Promise<SendMessageResponse> {
  const result = await request<SendMessageResponse>(
    credentials,
    'sendMessage',
    postInit({ chatId, message }, signal),
  );
  if (!result?.idMessage) {
    throw new GreenApiError('GREEN-API не подтвердил отправку сообщения.');
  }
  return result;
}

/**
 * Получение входящего уведомления. Запрос ожидает ответа до receiveTimeout секунд
 * и возвращает null, если за это время ничего не пришло.
 */
export function receiveNotification(
  credentials: Credentials,
  receiveTimeout = 10,
  signal?: AbortSignal,
): Promise<Notification | null> {
  return request<Notification>(
    credentials,
    'receiveNotification',
    { method: 'GET', signal },
    { query: `?receiveTimeout=${receiveTimeout}` },
  );
}

/** Подтверждение обработки уведомления — удаляет его из очереди. */
export function deleteNotification(
  credentials: Credentials,
  receiptId: number,
  signal?: AbortSignal,
): Promise<{ result: boolean } | null> {
  return request<{ result: boolean }>(
    credentials,
    'deleteNotification',
    { method: 'DELETE', signal },
    { tail: receiptId },
  );
}
