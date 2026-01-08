// src/components/ChatPage.tsx
import React, { useState } from 'react';
import { useChat } from '../context/ChatContext';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { Message } from '../models/ChatModels';
import { FiSearch, FiZap, FiImage, FiVideo, FiBookOpen, FiMic, FiUser, FiChevronDown } from 'react-icons/fi';
import '../styles/ChatPage.css';

// --- COMPONENT ModelSelector ---
const ModelSelector: React.FC = () => {
  const { currentModel, setCurrentModel, availableModels } = useChat();
  const [isOpen, setIsOpen] = useState(false);

  const ChevronDownIcon = FiChevronDown as React.ComponentType<React.SVGProps<SVGSVGElement>>;

  const handleModelChange = (model: typeof availableModels[number]) => {
    setCurrentModel(model);
    setIsOpen(false);
  };

  return (
    <div className="model-selector-container">
      <button
        className="model-selector-button"
        onClick={() => setIsOpen(!isOpen)}
        title={`Model hiện tại: ${currentModel.name} ${currentModel.version}`}
      >
        <span className="model-name">{currentModel.name} {currentModel.version}</span>
        <ChevronDownIcon className={`dropdown-icon ${isOpen ? 'open' : ''}`} />
      </button>
      {isOpen && (
        <ul className="model-dropdown-list">
          {availableModels.map((model) => (
            <li
              key={model.id}
              className={`model-dropdown-item ${model.id === currentModel.id ? 'selected' : ''}`}
              onClick={() => handleModelChange(model)}
            >
              {model.name} {model.version}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const ChatPage: React.FC = () => {
  const { messages, clearMessages, startNewConversation, sendMessage: sendContextMessage, loading } = useChat();
  const [input, setInput] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  const [isSearchMode, setIsSearchMode] = useState(false);
  const [isThinkingMode, setIsThinkingMode] = useState(false);
  const [activeSpecialMode, setActiveSpecialMode] = useState<'image' | 'video' | 'research' | 'audio' | 'agent' | null>(null);

  const handleClearClick = () => {
    if (window.confirm("Do you want to delete this chat?")) {
      clearMessages();
    }
  };

  const handleNewClick = () => {
    //if (window.confirm("Do you want to start a new chat?")) {
      startNewConversation();
    //}
  };

  const handleEditMessage = (message: Message) => {
    setInput(message.content);
    setEditingMessageId(message.id);
  };

  const handleSaveEdit = async (newContent: string) => {
    if (editingMessageId && newContent.trim()) {
      await sendContextMessage(newContent);
      setInput('');
      setEditingMessageId(null);
    }
  };

  const handleSendMessage = async (content: string, files?: File[]) => {
    if (editingMessageId) {
      await handleSaveEdit(content);
    } else {
      let mode: 'image' | 'video' | 'research' | 'audio' | 'agent' | 'default' = 'default';
      if (activeSpecialMode) {
        mode = activeSpecialMode;
      }

      await sendContextMessage(content, files, mode);
      setInput('');
      setAttachedFiles([]);
      // Có thể giữ chế độ bật sau khi gửi, hoặc tắt
      // setActiveSpecialMode(null);
    }
  };

  const handleAttachFile = (files: FileList) => {
    const newFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      newFiles.push(files[i]);
    }
    setAttachedFiles(prev => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSearchToggle = () => {
    setIsSearchMode(!isSearchMode);
  };

  const handleThinkingToggle = () => {
    setIsThinkingMode(!isThinkingMode);
  };

  const handleSpecialModeToggle = (mode: 'image' | 'video' | 'research' | 'audio' | 'agent') => {
    if (activeSpecialMode === mode) {
      setActiveSpecialMode(null);
    } else {
      setActiveSpecialMode(mode);
    }
  };

  const SearchIcon = FiSearch as React.ComponentType<React.SVGProps<SVGSVGElement>>;
  const ZapIcon = FiZap as React.ComponentType<React.SVGProps<SVGSVGElement>>;
  const ImageIcon = FiImage as React.ComponentType<React.SVGProps<SVGSVGElement>>;
  const VideoIcon = FiVideo as React.ComponentType<React.SVGProps<SVGSVGElement>>;
  const BookOpenIcon = FiBookOpen as React.ComponentType<React.SVGProps<SVGSVGElement>>;
  const MicIcon = FiMic as React.ComponentType<React.SVGProps<SVGSVGElement>>;
  const UserIcon = FiUser as React.ComponentType<React.SVGProps<SVGSVGElement>>;

  return (
    <div className="chat-page">
      <div className="chat-container">
        <div className="chat-controls">
          <ModelSelector />
          <button onClick={handleNewClick} className="new-conversation-button">
            + New Chat
          </button>
          <button onClick={handleClearClick} className="clear-chat-button-top">
            DELETE
          </button>
        </div>
        <div className="chat-main-content">
          <MessageList messages={messages} onEditMessage={handleEditMessage} />
          <MessageInput
            input={input}
            setInput={setInput}
            onSendMessage={handleSendMessage}
            attachedFiles={attachedFiles}
            onAttachFile={handleAttachFile}
            onRemoveFile={handleRemoveFile}
            isEditing={!!editingMessageId}
            loading={loading}
            isAudioMode={activeSpecialMode === 'audio'}
          />
        </div>
        <div className="input-controls-row">
          <button
            type="button"
            className={`input-control-button ${isSearchMode ? 'active' : ''}`}
            onClick={handleSearchToggle}
            title="Search Mode"
            disabled={loading}
          >
            <SearchIcon />
          </button>
          <button
            type="button"
            className={`input-control-button ${isThinkingMode ? 'active' : ''}`}
            onClick={handleThinkingToggle}
            title="Thinking Mode"
            disabled={loading}
          >
            <ZapIcon />
          </button>
          <button
            type="button"
            className={`input-control-button ${activeSpecialMode === 'image' ? 'active' : ''}`}
            onClick={() => handleSpecialModeToggle('image')}
            title="Create Image"
            disabled={loading}
          >
            <ImageIcon />
          </button>
          <button
            type="button"
            className={`input-control-button ${activeSpecialMode === 'video' ? 'active' : ''}`}
            onClick={() => handleSpecialModeToggle('video')}
            title="Create Video"
            disabled={loading}
          >
            <VideoIcon />
          </button>
          <button
            type="button"
            className={`input-control-button ${activeSpecialMode === 'research' ? 'active' : ''}`}
            onClick={() => handleSpecialModeToggle('research')}
            title="Deep Research"
            disabled={loading}
          >
            <BookOpenIcon />
          </button>
          <button
            type="button"
            className={`input-control-button ${activeSpecialMode === 'audio' ? 'active' : ''}`}
            onClick={() => handleSpecialModeToggle('audio')}
            title="Recording"
            disabled={loading}
          >
            <MicIcon />
          </button>
          <button
            type="button"
            className={`input-control-button ${activeSpecialMode === 'agent' ? 'active' : ''}`}
            onClick={() => handleSpecialModeToggle('agent')}
            title="Create AI Agent"
            disabled={loading}
          >
            <UserIcon />
          </button>
        </div>
        <div className="footer-note-below-input">
          <p>AI Generated can make mistakes.</p>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;