import type { Credentials, Notification } from '../types';

export class GreenApiError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'GreenApiError';
    this.status = status;
  }
}

function buildUrl({ apiUrl, idInstance, apiTokenInstance }: Credentials, method: string, suffix = '') {
  const base = apiUrl.replace(/\/+$/, '');
  return `${base}/waInstance${idInstance}/${method}/${apiTokenInstance}${suffix}`;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const message =
      res.status === 401 || res.status === 403
        ? 'Неверный idInstance или apiTokenInstance'
        : `GREEN-API: ${res.status} ${text || res.statusText}`;
    throw new GreenApiError(message, res.status);
  }
  const text = await res.text();
  // пустая очередь -> пустое тело или null
  return (text ? JSON.parse(text) : null) as T;
}

export function getStateInstance(creds: Credentials, signal?: AbortSignal) {
  return request<{ stateInstance: string }>(buildUrl(creds, 'getStateInstance'), { signal });
}

export function sendMessage(creds: Credentials, chatId: string, message: string) {
  return request<{ idMessage: string }>(buildUrl(creds, 'sendMessage'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId, message }),
  });
}

export function receiveNotification(creds: Credentials, receiveTimeout: number, signal?: AbortSignal) {
  return request<Notification | null>(
    buildUrl(creds, 'receiveNotification', `?receiveTimeout=${receiveTimeout}`),
    { signal },
  );
}

export function deleteNotification(creds: Credentials, receiptId: number) {
  return request<{ result: boolean }>(buildUrl(creds, 'deleteNotification', `/${receiptId}`), {
    method: 'DELETE',
  });
}
