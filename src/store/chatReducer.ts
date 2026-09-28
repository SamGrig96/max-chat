import type { Chat, ChatMessage, NotificationBody } from '../types';

export interface ChatState {
  chats: Chat[];
  activeChatId: string | null;
  // chatId из уведомлений -> id локального чата
  aliases: Record<string, string>;
}

export type ChatAction =
  | { type: 'chat/add'; chatId: string; title: string }
  | { type: 'chat/select'; chatId: string }
  | { type: 'message/sending'; chatId: string; tempId: string; text: string }
  | { type: 'message/sent'; chatId: string; tempId: string; idMessage: string }
  | { type: 'message/failed'; chatId: string; tempId: string }
  | { type: 'notification'; body: NotificationBody };

export const initialChatState: ChatState = { chats: [], activeChatId: null, aliases: {} };

export function phoneToChatId(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15 ? `${digits}@c.us` : null;
}

const digitsOf = (value?: string) => (value ?? '').replace(/@.*$/, '').replace(/\D/g, '');

export function extractText(body: NotificationBody): string | null {
  const data = body.messageData;
  if (!data) return null;
  if (data.typeMessage === 'textMessage') return data.textMessageData?.textMessage ?? null;
  // quotedMessage = ответ с цитатой, текст там же
  if (data.typeMessage === 'extendedTextMessage' || data.typeMessage === 'quotedMessage') {
    return data.extendedTextMessageData?.text ?? null;
  }
  return null;
}

const INCOMING = new Set(['incomingMessageReceived']);
const OUTGOING = new Set(['outgoingMessageReceived', 'outgoingAPIMessageReceived']);

function updateChat(state: ChatState, chatId: string, fn: (chat: Chat) => Chat): ChatState {
  return { ...state, chats: state.chats.map((c) => (c.id === chatId ? fn(c) : c)) };
}

// в MAX ответ может прийти с числовым chatId вместо номер@c.us
function resolveChatId(state: ChatState, body: NotificationBody): string | null {
  const remoteId = body.senderData?.chatId;
  if (!remoteId) return null;
  if (state.aliases[remoteId]) return state.aliases[remoteId];
  if (state.chats.some((c) => c.id === remoteId)) return remoteId;

  const phoneDigits = digitsOf(body.senderData?.sender) || digitsOf(remoteId);
  const byPhone = state.chats.find((c) => digitsOf(c.id) === phoneDigits && phoneDigits);
  if (byPhone) return byPhone.id;

  if (body.idMessage) {
    const byMessage = state.chats.find((c) => c.messages.some((m) => m.id === body.idMessage));
    if (byMessage) return byMessage.id;
  }
  return null;
}

function addMessage(chat: Chat, message: ChatMessage, isActive: boolean): Chat {
  if (chat.messages.some((m) => m.id === message.id)) return chat;
  const messages = [...chat.messages, message].sort((a, b) => a.timestamp - b.timestamp);
  return {
    ...chat,
    messages,
    unread: message.direction === 'in' && !isActive ? chat.unread + 1 : chat.unread,
  };
}

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'chat/add': {
      if (state.chats.some((c) => c.id === action.chatId)) {
        return { ...state, activeChatId: action.chatId };
      }
      const chat: Chat = { id: action.chatId, title: action.title, messages: [], unread: 0 };
      return { ...state, chats: [chat, ...state.chats], activeChatId: chat.id };
    }

    case 'chat/select':
      return {
        ...updateChat(state, action.chatId, (c) => ({ ...c, unread: 0 })),
        activeChatId: action.chatId,
      };

    case 'message/sending':
      return updateChat(state, action.chatId, (c) => ({
        ...c,
        messages: [
          ...c.messages,
          { id: action.tempId, text: action.text, direction: 'out', timestamp: Date.now(), status: 'sending' },
        ],
      }));

    case 'message/sent':
      return updateChat(state, action.chatId, (c) => ({
        ...c,
        messages: c.messages
          // эхо могло прийти раньше ответа sendMessage
          .filter((m) => m.id !== action.idMessage || m.id === action.tempId)
          .map((m) => (m.id === action.tempId ? { ...m, id: action.idMessage, status: 'sent' } : m)),
      }));

    case 'message/failed':
      return updateChat(state, action.chatId, (c) => ({
        ...c,
        messages: c.messages.map((m) => (m.id === action.tempId ? { ...m, status: 'error' } : m)),
      }));

    case 'notification': {
      const { body } = action;
      const isIncoming = INCOMING.has(body.typeWebhook);
      const isOutgoing = OUTGOING.has(body.typeWebhook);
      const text = extractText(body);
      const remoteId = body.senderData?.chatId;
      if ((!isIncoming && !isOutgoing) || text === null || !remoteId || !body.idMessage) return state;

      let next = state;
      let chatId = resolveChatId(state, body);

      if (!chatId) {
        if (!isIncoming) return state;
        const title = body.senderData?.senderName || body.senderData?.chatName || digitsOf(remoteId) || remoteId;
        next = chatReducer(next, { type: 'chat/add', chatId: remoteId, title });
        next = { ...next, activeChatId: state.activeChatId ?? remoteId };
        chatId = remoteId;
      }

      if (remoteId !== chatId) next = { ...next, aliases: { ...next.aliases, [remoteId]: chatId } };

      const message: ChatMessage = {
        id: body.idMessage,
        text,
        direction: isIncoming ? 'in' : 'out',
        timestamp: body.timestamp * 1000,
        status: isOutgoing ? 'sent' : undefined,
      };
      const targetId = chatId;
      return updateChat(next, targetId, (c) => addMessage(c, message, next.activeChatId === targetId));
    }

    default:
      return state;
  }
}
