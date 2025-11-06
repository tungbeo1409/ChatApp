export interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
}

export interface Message {
  id: string;
  text: string;
  senderId: string;
  receiverId: string;
  timestamp: Date;
  imageUrl?: string;
}

export interface Chat {
  id: string;
  participants: string[];
  lastMessage?: Message;
  lastMessageTime?: Date;
}

