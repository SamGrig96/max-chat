import { useState, type FormEvent } from 'react';
import { phoneToChatId } from '../store/chatReducer';
import type { Chat } from '../types';
import { formatTime } from '../utils/format';
import { Avatar } from './Avatar';
import type { PollingStatus } from '../hooks/useNotifications';

interface Props {
  chats: Chat[];
  activeChatId: string | null;
  idInstance: string;
  status: PollingStatus;
  onSelect: (chatId: string) => void;
  onCreate: (chatId: string, title: string) => void;
  onLogout: () => void;
}

const STATUS_LABEL: Record<PollingStatus, string> = {
  connecting: 'Подключение…',
  online: 'В сети',
  error: 'Нет соединения',
};

export function Sidebar({ chats, activeChatId, idInstance, status, onSelect, onCreate, onLogout }: Props) {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create = (e: FormEvent) => {
    e.preventDefault();
    const chatId = phoneToChatId(phone);
    if (!chatId) {
      setError('Введите номер в международном формате, например 79991234567');
      return;
    }
    onCreate(chatId, `+${chatId.replace('@c.us', '')}`);
    setPhone('');
    setError(null);
  };

  return (
    <aside className="sidebar">
      <header className="sidebar__header">
        <div>
          <div className="sidebar__title">Чаты</div>
          <div className={`status status--${status}`}>
            {STATUS_LABEL[status]} · {idInstance}
          </div>
        </div>
        <button className="logout" onClick={onLogout}>
          Выйти
        </button>
      </header>

      <form className="new-chat" onSubmit={create}>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Номер получателя, напр. 79991234567"
          inputMode="tel"
          aria-label="Номер телефона получателя"
        />
        <button type="submit" disabled={!phone.trim()} title="Создать чат">
          +
        </button>
      </form>
      {error && <div className="new-chat__error">{error}</div>}

      <ul className="chat-list">
        {chats.length === 0 && <li className="chat-list__empty">Создайте чат, введя номер телефона</li>}
        {chats.map((chat) => {
          const last = chat.messages[chat.messages.length - 1];
          return (
            <li key={chat.id}>
              <button
                className={`chat-item ${chat.id === activeChatId ? 'chat-item--active' : ''}`}
                onClick={() => onSelect(chat.id)}
              >
                <Avatar name={chat.title} />
                <div className="chat-item__body">
                  <div className="chat-item__row">
                    <span className="chat-item__title">{chat.title}</span>
                    {last && <span className="chat-item__time">{formatTime(last.timestamp)}</span>}
                  </div>
                  <div className="chat-item__row">
                    <span className="chat-item__preview">
                      {last ? `${last.direction === 'out' ? 'Вы: ' : ''}${last.text}` : 'Нет сообщений'}
                    </span>
                    {chat.unread > 0 && <span className="badge">{chat.unread}</span>}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
