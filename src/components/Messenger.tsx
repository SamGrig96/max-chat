import { useState } from 'react';
import { useChatStore } from '../hooks/useChatStore';
import { useNotifications } from '../hooks/useNotifications';
import type { Credentials } from '../types';
import { ChatWindow } from './ChatWindow';
import { Sidebar } from './Sidebar';

interface Props {
  creds: Credentials;
  onLogout: () => void;
}

export function Messenger({ creds, onLogout }: Props) {
  const { state, addChat, selectChat, send, handleNotification } = useChatStore(creds);
  const { status, error } = useNotifications(creds, handleNotification);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  const activeChat = state.chats.find((c) => c.id === state.activeChatId);

  return (
    <div className={`messenger ${mobileChatOpen ? 'messenger--chat-open' : ''}`}>
      <Sidebar
        chats={state.chats}
        activeChatId={state.activeChatId}
        idInstance={creds.idInstance}
        status={status}
        onSelect={(id) => {
          selectChat(id);
          setMobileChatOpen(true);
        }}
        onCreate={(id, title) => {
          addChat(id, title);
          setMobileChatOpen(true);
        }}
        onLogout={onLogout}
      />
      <ChatWindow chat={activeChat} onSend={send} onBack={() => setMobileChatOpen(false)} />
      {error && <div className="toast">{error}</div>}
    </div>
  );
}
