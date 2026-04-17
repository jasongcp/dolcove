export interface User {
  id: string;
  email: string | null;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMembership {
  id: string;
  groupId: string;
  userId: string;
  role: 'owner' | 'member';
  joinedAt: string;
}

export interface SessionUser {
  userId: string;
  sessionToken: string;
}

export interface Plan {
  id: string;
  groupId: string;
  title: string;
  description: string | null;
  status: 'proposed' | 'confirmed' | 'cancelled' | 'completed';
  startTime: string | null;
  location: string | null;
  createdBy: string;
  createdAt: string;
}

export interface PlanVote {
  id: string;
  planId: string;
  userId: string;
  vote: 'yes' | 'no' | 'maybe';
  updatedAt: string;
}

export interface MessageCreatedEvent {
  type: 'message.created';
  occurredAt: string;
  payload: {
    messageId: string;
    groupId: string;
    senderId: string;
    createdAt: string;
  };
}

export interface MemoryProcessingJob {
  id: string;
  type: 'memory.process-message';
  occurredAt: string;
  payload: {
    sourceEvent: 'message.created';
    messageId: string;
    groupId: string;
    senderId: string;
    createdAt: string;
  };
}

export type MemoryJob = MemoryProcessingJob;

export const createMessageCreatedMemoryJob = (
  event: MessageCreatedEvent
): MemoryProcessingJob => {
  return {
    id: `memjob_${event.payload.messageId}`,
    type: 'memory.process-message',
    occurredAt: event.occurredAt,
    payload: {
      sourceEvent: event.type,
      messageId: event.payload.messageId,
      groupId: event.payload.groupId,
      senderId: event.payload.senderId,
      createdAt: event.payload.createdAt
    }
  };
};

export interface Recap {
  id: string;
  groupId: string;
  periodStart: string;
  periodEnd: string;
  content: string;
  createdAt: string;
}

export interface RecapRequestedEvent {
  type: 'recap.requested';
  occurredAt: string;
  payload: {
    groupId: string;
    requestedBy: string;
    periodStart: string;
    periodEnd: string;
  };
}

export interface RecapGenerationJob {
  id: string;
  type: 'recap.generate';
  occurredAt: string;
  payload: {
    sourceEvent: 'recap.requested';
    groupId: string;
    requestedBy: string;
    periodStart: string;
    periodEnd: string;
  };
}

export type RecapJob = RecapGenerationJob;

export const createRecapGenerationJob = (
  event: RecapRequestedEvent
): RecapGenerationJob => {
  return {
    id: `recapjob_${event.payload.groupId}_${event.payload.periodStart}_${event.payload.periodEnd}`,
    type: 'recap.generate',
    occurredAt: event.occurredAt,
    payload: {
      sourceEvent: event.type,
      groupId: event.payload.groupId,
      requestedBy: event.payload.requestedBy,
      periodStart: event.payload.periodStart,
      periodEnd: event.payload.periodEnd
    }
  };
};

export interface HealthStatus {
  status: 'ok';
}

export interface SuccessResponse<T> {
  ok: true;
  data: T;
}

export interface ErrorResponse {
  ok: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;
