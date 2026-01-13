// src/contexts/ChatContext.tsx
import React, { createContext, useContext, useReducer, useEffect, useRef, ReactNode, useCallback } from 'react';
import { Message } from '../models/ChatModels'; 
import { fetchAIResponse, fetchImageResponse, fetchVideoResponse, fetchResearchResponse, fetchAudioResponse, fetchAgentResponse } from '../utils/api'; 

const AVAILABLE_MODELS = [
  { id: 'gemini-3-flash', name: 'Gemini ', version: '3.0' },
  { id: 'grok-4', name: 'Grok ', version: '4.0' },
  { id: 'deepseek-r1', name: 'DeepSeek ', version: 'R1' },
  { id: 'ERNIE-4.5-21B-A3B', name: 'Ernie ', version: '4.5' },
  { id: 'claude-3-7-sonnet-20250219', name: 'Claude Sonnet ', version: '3.7' },
  { id: 'gpt-5', name: 'GPT ', version: '5.0' },
];

interface UserInfo {
  name: string;
  avatar: string;
}

// Interface cho Attachment (nếu chưa có trong models/Message.ts)
interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  // objectURL?: string; // Không lưu vào Message, nhưng có thể dùng tạm trong ChatContext
}

type ChatState = {
  messages: Message[];
  loading: boolean;
  history: Message[][];
  currentModel: typeof AVAILABLE_MODELS[number];
  userInfo: UserInfo;
};

type AddMessageAction = { type: 'ADD_MESSAGE'; payload: Message };
type SetLoadingAction = { type: 'SET_LOADING'; payload: boolean };
type ClearMessagesAction = { type: 'CLEAR_MESSAGES' };
type AddToHistoryAction = { type: 'ADD_TO_HISTORY'; payload: Message[] };
type NewConversationAction = { type: 'NEW_CONVERSATION' };
type RemoveFromHistoryAction = { type: 'REMOVE_FROM_HISTORY'; payload: number };
type RestoreHistoryAction = { type: 'RESTORE_HISTORY'; payload: Message[] };
type ClearHistoryAction = { type: 'CLEAR_HISTORY' };
type SetCurrentModelAction = { type: 'SET_CURRENT_MODEL'; payload: typeof AVAILABLE_MODELS[number] };
type UpdateUserInfoAction = { type: 'UPDATE_USER_INFO'; payload: Partial<UserInfo> };
type LoadStateAction = { type: 'LOAD_STATE'; payload: ChatState };
type MoveCurrentToTopAction = { type: 'MOVE_CURRENT_MESSAGES_TO_TOP_OF_HISTORY' };

type ChatAction =
  | AddMessageAction
  | SetLoadingAction
  | ClearMessagesAction
  | AddToHistoryAction
  | NewConversationAction
  | RemoveFromHistoryAction
  | RestoreHistoryAction
  | ClearHistoryAction
  | SetCurrentModelAction
  | UpdateUserInfoAction
  | LoadStateAction
  | MoveCurrentToTopAction;

const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'CLEAR_MESSAGES':
      return { ...state, messages: [] };
    case 'ADD_TO_HISTORY':
      return { ...state, history: [action.payload, ...state.history] };
    case 'NEW_CONVERSATION':
      if (state.messages.length > 0) {
        console.log("Lưu đoạn chat hiện tại vào lịch sử do nhấn + New Chat");
        return { ...state, messages: [], history: [state.messages, ...state.history] };
      }
      return { ...state, messages: [] };
    case 'REMOVE_FROM_HISTORY':
      const newHistory = [...state.history];
      const removedConversation = newHistory[action.payload];
      newHistory.splice(action.payload, 1);

      const isCurrentConversation = state.messages.length === removedConversation.length &&
        state.messages.every((msg, index) =>
          msg.id === removedConversation[index].id &&
          msg.content === removedConversation[index].content &&
          msg.sender === removedConversation[index].sender &&
          msg.timestamp.getTime() === removedConversation[index].timestamp.getTime() &&
          (msg.imageUrl === removedConversation[index].imageUrl) &&
          (msg.videoUrl === removedConversation[index].videoUrl) &&
          (msg.thumbnailUrl === removedConversation[index].thumbnailUrl) &&
          JSON.stringify(msg.attachments) === JSON.stringify(removedConversation[index].attachments)
        );

      if (isCurrentConversation) {
        console.log("Đoạn chat hiện tại bị xóa do đoạn trong lịch sử bị xóa");
        return { ...state, messages: [], history: newHistory };
      }
      return { ...state, history: newHistory };
    case 'RESTORE_HISTORY':
      const newHistoryAfterSave = state.messages.length > 0 ? [state.messages, ...state.history] : state.history;
      console.log("Lưu đoạn chat hiện tại vào lịch sử do chọn đoạn chat từ lịch sử");
      return { ...state, messages: action.payload, history: newHistoryAfterSave };
    case 'CLEAR_HISTORY':
      return { ...state, history: [] };
    case 'SET_CURRENT_MODEL':
      return { ...state, currentModel: action.payload };
    case 'UPDATE_USER_INFO':
      return { ...state, userInfo: { ...state.userInfo, ...action.payload } };
    case 'LOAD_STATE':
      return action.payload;
    case 'MOVE_CURRENT_MESSAGES_TO_TOP_OF_HISTORY':
      const currentConv = state.messages;
      if (currentConv.length === 0) return state;

      let idx = -1;
      for (let i = 0; i < state.history.length; i++) {
        if (messagesAreEqual(state.history[i], currentConv)) {
          idx = i;
          break;
        }
      }

      if (idx !== -1) {
        const updatedHistory = [...state.history];
        updatedHistory.splice(idx, 1);
        updatedHistory.unshift(currentConv);
        console.log("Đưa đoạn chat đã cập nhật lên đầu lịch sử");
        return { ...state, history: updatedHistory };
      }
      return state;
    default:
      return state;
  }
};

const messagesAreEqual = (conv1: Message[], conv2: Message[]): boolean => {
  if (conv1.length !== conv2.length) return false;
  for (let i = 0; i < conv1.length; i++) {
    const msg1 = conv1[i];
    const msg2 = conv2[i];
    if (
      msg1.id !== msg2.id ||
      msg1.content !== msg2.content ||
      msg1.sender !== msg2.sender ||
      msg1.timestamp.getTime() !== msg2.timestamp.getTime() ||
      msg1.imageUrl !== msg2.imageUrl ||
      msg1.videoUrl !== msg2.videoUrl ||
      msg1.thumbnailUrl !== msg2.thumbnailUrl ||
      JSON.stringify(msg1.attachments) !== JSON.stringify(msg2.attachments)
    ) {
      return false;
    }
  }
  return true;
};

const CHAT_STATE_STORAGE_KEY = 'chatAppState';

const loadStateFromLocalStorage = (): ChatState => {
  try {
    const serializedState = localStorage.getItem(CHAT_STATE_STORAGE_KEY);
    if (serializedState === null) {
      return {
        messages: [],
        loading: false,
        history: [],
        currentModel: AVAILABLE_MODELS[0],
        userInfo: {
          name: "TM",
          avatar: "https://placehold.co/100x100/242424/FFFFFF/png?text=U  ",
        },
      };
    }
    const parsedState = JSON.parse(serializedState) as { messages: any[], loading: boolean, history: any[][], currentModel: any, userInfo: UserInfo };
    const loadedMessages: Message[] = parsedState.messages.map(msg => ({ ...msg, timestamp: new Date(msg.timestamp), attachments: msg.attachments || [] }));
    const loadedHistory: Message[][] = parsedState.history.map(conversation =>
      conversation.map(msg => ({ ...msg, timestamp: new Date(msg.timestamp), attachments: msg.attachments || [], imageUrl: msg.imageUrl, videoUrl: msg.videoUrl, thumbnailUrl: msg.thumbnailUrl }))
    );
    const loadedModel = AVAILABLE_MODELS.find(m => m.id === parsedState.currentModel?.id) || AVAILABLE_MODELS[0];
    const loadedUserInfo = parsedState.userInfo || {
      name: "TM",
      avatar: "https://placehold.co/100x100/242424/FFFFFF/png?text=U  ",
    };
    return {
      messages: loadedMessages,
      loading: parsedState.loading,
      history: loadedHistory,
      currentModel: loadedModel,
      userInfo: loadedUserInfo,
    };
  } catch (err) {
    console.error("Lỗi khi tải state từ localStorage (ChatContext):", err);
    return {
      messages: [],
      loading: false,
      history: [],
      currentModel: AVAILABLE_MODELS[0],
      userInfo: {
        name: "TM",
        avatar: "https://placehold.co/100x100/242424/FFFFFF/png?text=U  ",
      },
    };
  }
};

// --- Reducer cho AttachmentURLs ---
const attachmentURLReducer = (state: { [key: string]: string }, action: { type: 'ADD' | 'REMOVE' | 'CLEAR'; id?: string; url?: string }): { [key: string]: string } => {
  switch (action.type) {
    case 'ADD':
      if (action.id && action.url) {
        return { ...state, [action.id]: action.url };
      }
      return state;
    case 'REMOVE':
      if (action.id) {
        const newState = { ...state };
        delete newState[action.id];
        return newState;
      }
      return state;
    case 'CLEAR':
      // Giải phóng tất cả objectURL khi clear state
      Object.values(state).forEach(url => URL.revokeObjectURL(url));
      return {};
    default:
      return state;
  }
};

const saveStateToLocalStorage = (stateToSave: { messages: Message[], loading: boolean, history: Message[][], currentModel: typeof AVAILABLE_MODELS[number], userInfo: UserInfo }) => {
  try {
    const stateForStorage = {
      messages: stateToSave.messages.map(msg => ({ ...msg, timestamp: msg.timestamp.getTime(), attachments: msg.attachments })),
      loading: stateToSave.loading,
      history: stateToSave.history.map(conversation =>
        conversation.map(msg => ({ ...msg, timestamp: msg.timestamp.getTime(), attachments: msg.attachments, imageUrl: msg.imageUrl, videoUrl: msg.videoUrl, thumbnailUrl: msg.thumbnailUrl }))
      ),
      currentModel: stateToSave.currentModel,
      userInfo: stateToSave.userInfo,
    };
    const serializedState = JSON.stringify(stateForStorage);
    localStorage.setItem(CHAT_STATE_STORAGE_KEY, serializedState);
  } catch (err) {
    console.error("Lỗi khi lưu state vào localStorage (ChatContext):", err);
  }
};

// --- Interface cho Context Props ---
interface ChatContextProps {
  messages: Message[];
  loading: boolean;
  history: Message[][];
  currentModel: typeof AVAILABLE_MODELS[number];
  availableModels: typeof AVAILABLE_MODELS;
  userInfo: UserInfo;
  sendMessage: (content: string, attachments?: File[], mode?: 'image' | 'video' | 'research' | 'audio' | 'agent' | 'default') => Promise<void>;
  clearMessages: () => void;
  startNewConversation: () => void;
  removeFromHistory: (index: number) => void;
  restoreConversation: (messages: Message[]) => void;
  setCurrentModel: (model: typeof AVAILABLE_MODELS[number]) => void;
  updateUserInfo: (info: Partial<UserInfo>) => void;
  clearAllHistory: () => void;
  addToHistory: (messages: Message[]) => void;
  getObjectURL: (id: string) => string | null; // Thêm hàm mới
  revokeObjectURL: (id: string) => void; // Thêm hàm này
}

const ChatContext = createContext<ChatContextProps | undefined>(undefined);

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(chatReducer, undefined, loadStateFromLocalStorage);
  const wasRestoredRef = useRef(false);

  // --- State mới để lưu objectURL của file đính kèm ---
  const [attachmentURLs, dispatchAttachmentURLs] = useReducer(attachmentURLReducer, {});


  useEffect(() => {
    saveStateToLocalStorage({
      messages: state.messages,
      loading: state.loading,
      history: state.history,
      currentModel: state.currentModel,
      userInfo: state.userInfo,
    });
  }, [state.messages, state.history, state.loading, state.currentModel, state.userInfo]);

  useEffect(() => {
    if (!state.loading && state.messages.length > 0 && wasRestoredRef.current) {
      for (let i = 0; i < state.history.length; i++) {
        if (messagesAreEqual(state.history[i], state.messages)) {
          dispatch({ type: 'MOVE_CURRENT_MESSAGES_TO_TOP_OF_HISTORY' });
          break;
        }
      }
    }
  }, [state.loading, state.messages, state.history]);

  // --- Hàm để lấy objectURL từ ID ---
  const getObjectURL = useCallback((id: string) => {
    return attachmentURLs[id] || null;
  }, [attachmentURLs]);

  // --- Hàm để giải phóng objectURL ---
  const revokeObjectURL = useCallback((id: string) => {
    dispatchAttachmentURLs({ type: 'REMOVE', id });
  }, []);

  // --- Hàm để giải phóng tất cả objectURL ---
  const revokeAllObjectURLs = useCallback(() => {
    dispatchAttachmentURLs({ type: 'CLEAR' });
  }, []);

  // --- Cleanup khi component unmount ---
  useEffect(() => {
    return () => {
      revokeAllObjectURLs(); // Giải phóng tất cả khi context bị huỷ
    };
  }, [revokeAllObjectURLs]);

  const sendMessage = async (content: string, attachments?: File[], mode: 'image' | 'video' | 'research' | 'audio' | 'agent' | 'default' = 'default') => {
    if ((!content.trim() && !attachments?.length) || state.loading) return;

    // --- TẠO objectURL CHO FILE ĐÍNH KÈM VÀ LƯU VÀO STATE CHO PREVIEW ---
    const attachmentsForMessage: Attachment[] = [];

    if (attachments) {
      for (const file of attachments) {
        const attachmentId = `${file.name}-${file.size}-${file.lastModified}`;
        const objectURL = URL.createObjectURL(file);
        attachmentsForMessage.push({
          id: attachmentId,
          name: file.name,
          size: file.size,
          type: file.type,
        });
        // Lưu objectURL vào state cho preview trong MessageList
        dispatchAttachmentURLs({ type: 'ADD', id: attachmentId, url: objectURL });
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      sender: 'user',
      timestamp: new Date(),
      attachments: attachmentsForMessage, // attachmentsForMessage chứa id, name, size, type
    };

    dispatch({ type: 'ADD_MESSAGE', payload: userMessage });
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      let aiResponseContent = "";
      let aiImageUrl: string | undefined = undefined;
      let aiVideoUrl: string | undefined = undefined;
      let aiThumbnailUrl: string | undefined = undefined;

      // attachmentsForApi có thể vẫn là mô tả file, không chứa objectURL
      const attachmentsForApi = attachments?.map(file => ({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        name: file.name,
        size: file.size,
        type: file.type,
      }));

      if (mode === 'image') {
      const imageResponse = await fetchImageResponse(content, attachmentsForApi);
      aiResponseContent = imageResponse.description; // Có thể là chuỗi rỗng
      aiImageUrl = imageResponse.imageUrl; // Có thể là undefined, null, hoặc chuỗi rỗng

      // --- SỬA LẠI KIỂM TRA FALLBACK ---
      if (!aiImageUrl) { // Nếu imageUrl không hợp lệ
        console.warn("fetchImageResponse không trả về imageUrl hợp lệ:", imageResponse);
        // Không ghi đè aiResponseContent nếu description có giá trị
        // Nếu cả description và imageUrl đều không có, mới hiển thị thông báo lỗi
        if (!aiResponseContent) { // Nếu description cũng không có
          aiResponseContent = "Hình ảnh yêu cầu không được tạo thành công.";
        }
        // Nếu có description, giữ nguyên description, và không có imageUrl -> MessageList sẽ không hiển thị ảnh
      }
      // Nếu aiImageUrl hợp lệ, giữ nguyên aiResponseContent và aiImageUrl
    } else if (mode === 'video') {
      const videoResponse = await fetchVideoResponse(content, attachmentsForApi);
      aiResponseContent = videoResponse.description; // Có thể là chuỗi rỗng
      aiVideoUrl = videoResponse.videoUrl; // Có thể là undefined, null, hoặc chuỗi rỗng
      aiThumbnailUrl = videoResponse.thumbnailUrl; // Có thể là undefined, null, hoặc chuỗi rỗng

      // --- KIỂM TRA FALLBACK ---
      if (!aiVideoUrl) { // Nếu videoUrl không hợp lệ
        console.warn("fetchVideoResponse không trả về videoUrl hợp lệ:", videoResponse);
        // Không ghi đè aiResponseContent nếu description có giá trị
        // Nếu cả description và videoUrl đều không có, mới hiển thị thông báo lỗi
        if (!aiResponseContent) { // Nếu description cũng không có
          aiResponseContent = "Video yêu cầu không được tạo thành công.";
        }
        // Nếu có description, giữ nguyên description, và không có videoUrl -> MessageList sẽ không hiển thị video
      }
      // Nếu aiVideoUrl hợp lệ, giữ nguyên aiResponseContent, aiVideoUrl và aiThumbnailUrl (nếu có)
      } else if (mode === 'research') {
        const researchResponse = await fetchResearchResponse(content, attachmentsForApi);
        aiResponseContent = researchResponse.summary;
      } else if (mode === 'audio') {
        const audioResponse = await fetchAudioResponse(content, attachmentsForApi);
        aiResponseContent = audioResponse.description;
      } else if (mode === 'agent') {
        const agentResponse = await fetchAgentResponse(content, attachmentsForApi);
        aiResponseContent = agentResponse.description;
      } else { // mode === 'default'
        aiResponseContent = await fetchAIResponse(content, attachmentsForApi);
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponseContent,
        sender: 'ai',
        timestamp: new Date(),
        ...(aiImageUrl && { imageUrl: aiImageUrl }),
        ...(aiVideoUrl && { videoUrl: aiVideoUrl }),
        ...(aiThumbnailUrl && { thumbnailUrl: aiThumbnailUrl }),
      };
      dispatch({ type: 'ADD_MESSAGE', payload: aiMessage });
    } catch (error) {
      console.error("Error in sendMessage (ChatContext):", error);
      let errorMessageContent = "Xin lỗi, hiện tại tôi không thể xử lý yêu cầu của bạn.";
      if (error instanceof Error) {
        // Có thể hiển thị lỗi cụ thể hơn nếu an toàn và từ backend
      }
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        content: errorMessageContent,
        sender: 'ai',
        timestamp: new Date(),
      };
      dispatch({ type: 'ADD_MESSAGE', payload: errorMessage });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const clearMessages = () => {
    dispatch({ type: 'CLEAR_MESSAGES' });
    // Giải phóng objectURL khi xóa đoạn chat
    revokeAllObjectURLs();
    wasRestoredRef.current = false;
  };

  const startNewConversation = () => {
    // Giải phóng objectURL khi bắt đầu đoạn chat mới
    revokeAllObjectURLs();
    dispatch({ type: 'NEW_CONVERSATION' });
    wasRestoredRef.current = false;
  };

  const removeFromHistory = (index: number) => {
    dispatch({ type: 'REMOVE_FROM_HISTORY', payload: index });
  };

  const restoreConversation = (messages: Message[]) => {
    wasRestoredRef.current = true;
    dispatch({ type: 'RESTORE_HISTORY', payload: messages });
  };

  const setCurrentModel = (model: typeof AVAILABLE_MODELS[number]) => {
    dispatch({ type: 'SET_CURRENT_MODEL', payload: model });
  };

  const updateUserInfo = (info: Partial<UserInfo>) => {
    dispatch({ type: 'UPDATE_USER_INFO', payload: info });
  };

  const clearAllHistory = () => {
    dispatch({ type: 'CLEAR_HISTORY' });
  };

  const addToHistory = (messages: Message[]) => {
    if (messages.length > 0) {
        dispatch({ type: 'ADD_TO_HISTORY', payload: messages });
    }
  };

  return (
    <ChatContext.Provider value={{
      messages: state.messages,
      loading: state.loading,
      history: state.history,
      currentModel: state.currentModel,
      availableModels: AVAILABLE_MODELS,
      userInfo: state.userInfo,
      sendMessage,
      clearMessages,
      startNewConversation,
      removeFromHistory,
      restoreConversation,
      setCurrentModel,
      updateUserInfo,
      clearAllHistory,
      addToHistory,
      getObjectURL, // Truyền hàm lấy URL đến các component con
      revokeObjectURL, // Truyền hàm giải phóng URL đến các component con
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
