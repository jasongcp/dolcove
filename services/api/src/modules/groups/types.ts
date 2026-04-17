export interface GroupListItem {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  lastActivityAt: string;
}

export interface GroupDetail {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  createdBy: string;
  createdAt: string;
}

export interface CreateGroupInput {
  userId: string;
  name: string;
  description: string | null;
}

export interface CreatedGroupRecord {
  id: string;
  name: string;
  description: string | null;
  createdBy: string;
  createdAt: string;
}
