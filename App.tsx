// src/App.tsx
import React from 'react';
import { ChatProvider } from './context/ChatContext';
import Sidebar from './components/sidebar';
import ChatPage from './components/ChatPage';
import ConversationHistorySidebar from './components/ConversationHistorySidebar';
import './styles/App.css';

function App() {
  return (
    <ChatProvider>
      {/* Đặt footer trong cùng một cấp với .app */}
      <div className="app-and-footer-container">
        <div className="app">
          <Sidebar />
          <ChatPage />
          <ConversationHistorySidebar />
        </div>
        
      </div>
    </ChatProvider>
  );
}

export default App;

