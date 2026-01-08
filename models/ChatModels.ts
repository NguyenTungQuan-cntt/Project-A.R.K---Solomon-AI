// src/models/ChatModels.ts

// Định nghĩa interface cho Attachment
export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string; // Nếu cần
  // objectURL?: string; // Nếu cần trong tương lai
}
export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  //attachments?: { id: string; name: string; size: number; type: string; url?: string }[];
  attachments?: Attachment[]; // Sử dụng Attachment interface
  isSearchResult?: boolean;
  imageUrl?: string; 
  videoUrl?: string; 
  thumbnailUrl?: string;
  agentId?: string; 
  agentName?: string; 
  type?: 'text' | 'image' | 'search_result'; 
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
}