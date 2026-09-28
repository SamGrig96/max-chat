export interface Credentials {
  apiUrl: string;
  idInstance: string;
  apiTokenInstance: string;
}

export type MessageDirection = 'in' | 'out';

export type MessageStatus = 'sending' | 'sent' | 'error';

export interface ChatMessage {
  // idMessage или временный local-id
  id: string;
  text: string;
  direction: MessageDirection;
  timestamp: number; // ms
  status?: MessageStatus;
}

export interface Chat {
  id: string;
  title: string;
  messages: ChatMessage[];
  unread: number;
}

// GREEN-API notifications

export interface MessageData {
  typeMessage: string;
  textMessageData?: { textMessage: string };
  extendedTextMessageData?: { text: string };
}

export interface NotificationBody {
  typeWebhook: string;
  timestamp: number; // seconds
  idMessage?: string;
  senderData?: {
    chatId: string;
    sender?: string;
    senderName?: string;
    chatName?: string;
  };
  messageData?: MessageData;
}

export interface Notification {
  receiptId: number;
  body: NotificationBody;
}
