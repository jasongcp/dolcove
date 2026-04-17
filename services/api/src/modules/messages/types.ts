export interface MessageItem {
  id: string;
  groupId: string;
  senderId: string;
  type: 'text';
  text: string;
  mediaUrl: null;
  createdAt: string;
}

export interface MessageListInput {
  groupId: string;
  userId: string;
  limit?: number;
  cursor?: string | null;
}

export interface MessageListResult {
  items: MessageItem[];
  nextCursor: string | null;
}

export interface CreateTextMessageInput {
  groupId: string;
  userId: string;
  text: string;
}
