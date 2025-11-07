export interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
}

export interface Message {
  id: string;
  text?: string;
  senderId: string;
  receiverId: string;
  timestamp: Date;
  imageUrl?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
}

export type MessagePreviewType = 'text' | 'image' | 'file';

export interface Chat {
  id: string;
  participants: string[];
  lastMessage?: {
    text?: string;
    senderId: string;
    imageUrl?: string;
    fileName?: string;
    type?: MessagePreviewType;
  };
  lastMessageTime?: Date;
}

