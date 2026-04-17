import { randomUUID } from 'node:crypto';

import type {
  CreateTextMessageInput,
  MessageItem,
  MessageListInput,
  MessageListResult
} from './types';

interface MembershipRow {
  exists: boolean;
}

interface MessageRow {
  id: string;
  group_id: string;
  sender_id: string;
  type: 'text';
  text: string;
  media_url: null;
  created_at: string;
}

interface MessageCursorPayload {
  createdAt: string;
  id: string;
}

export class InvalidMessageCursorError extends Error {
  constructor() {
    super('Invalid cursor payload');
    this.name = 'InvalidMessageCursorError';
  }
}

export interface MessagesDatabase {
  query<T>(text: string, values?: readonly unknown[]): Promise<{ rows: T[] }>;
}

const DEFAULT_MESSAGE_LIMIT = 50;
const MAX_MESSAGE_LIMIT = 100;

export class MessagesService {
  constructor(
    private readonly db: MessagesDatabase,
    private readonly generateId: () => string = randomUUID
  ) {}

  async listMessagesForUserInGroup(input: MessageListInput): Promise<MessageListResult | null> {
    const limit = this.normalizeLimit(input.limit);
    const cursor = this.decodeCursor(input.cursor ?? null);
    const queryValues: unknown[] = [input.groupId, input.userId, limit + 1];
    const cursorFilter = cursor
      ? `
          AND (
            m.created_at > $4
            OR (m.created_at = $4 AND m.id > $5)
          )
        `
      : '';

    if (cursor) {
      queryValues.push(cursor.createdAt, cursor.id);
    }

    const result = await this.db.query<MessageRow>(
      `
        SELECT
          m.id,
          m.group_id,
          m.author_id AS sender_id,
          'text'::text AS type,
          m.content AS text,
          NULL::text AS media_url,
          m.created_at::text AS created_at
        FROM messages m
        JOIN group_members gm
          ON gm.group_id = m.group_id
        WHERE m.group_id = $1
          AND gm.user_id = $2
          ${cursorFilter}
        ORDER BY m.created_at ASC, m.id ASC
        LIMIT $3
      `,
      queryValues
    );

    if (result.rows.length === 0) {
      const membershipResult = await this.lookupMembership(input.groupId, input.userId);

      if (!membershipResult) {
        return null;
      }
    }

    const hasMore = result.rows.length > limit;
    const rows = hasMore ? result.rows.slice(0, limit) : result.rows;
    const lastRow = rows.at(-1) ?? null;

    return {
      items: rows.map((row) => this.mapMessage(row)),
      nextCursor: hasMore && lastRow ? this.encodeCursor(lastRow) : null
    };
  }

  async getMessageForUserInGroup(input: {
    groupId: string;
    messageId: string;
    userId: string;
  }): Promise<MessageItem | null> {
    const result = await this.db.query<MessageRow>(
      `
        SELECT
          m.id,
          m.group_id,
          m.author_id AS sender_id,
          'text'::text AS type,
          m.content AS text,
          NULL::text AS media_url,
          m.created_at::text AS created_at
        FROM messages m
        JOIN group_members gm
          ON gm.group_id = m.group_id
        WHERE m.group_id = $1
          AND m.id = $2
          AND gm.user_id = $3
        LIMIT 1
      `,
      [input.groupId, input.messageId, input.userId]
    );

    const row = result.rows[0];

    return row ? this.mapMessage(row) : null;
  }

  async createTextMessageForUserInGroup(
    input: CreateTextMessageInput
  ): Promise<MessageItem | null> {
    const membershipResult = await this.lookupMembership(input.groupId, input.userId);

    if (!membershipResult) {
      return null;
    }

    const messageId = `msg_${this.generateId()}`;

    const result = await this.db.query<MessageRow>(
      `
        INSERT INTO messages (
          id,
          group_id,
          author_id,
          content,
          created_at
        )
        VALUES ($1, $2, $3, $4, now())
        RETURNING
          id,
          group_id,
          author_id AS sender_id,
          'text'::text AS type,
          content AS text,
          NULL::text AS media_url,
          created_at::text AS created_at
      `,
      [messageId, input.groupId, input.userId, input.text]
    );

    return this.mapMessage(result.rows[0]);
  }

  private normalizeLimit(limit?: number): number {
    if (!Number.isFinite(limit)) {
      return DEFAULT_MESSAGE_LIMIT;
    }

    const normalized = Math.trunc(limit as number);

    if (normalized < 1) {
      return 1;
    }

    if (normalized > MAX_MESSAGE_LIMIT) {
      return MAX_MESSAGE_LIMIT;
    }

    return normalized;
  }

  private encodeCursor(row: MessageRow): string {
    return Buffer.from(
      JSON.stringify({
        createdAt: row.created_at,
        id: row.id
      }),
      'utf8'
    ).toString('base64url');
  }

  private decodeCursor(cursor: string | null): MessageCursorPayload | null {
    if (!cursor) {
      return null;
    }

    try {
      const decoded = JSON.parse(
        Buffer.from(cursor, 'base64url').toString('utf8')
      ) as Partial<MessageCursorPayload>;

      if (typeof decoded.createdAt !== 'string' || typeof decoded.id !== 'string') {
        throw new InvalidMessageCursorError();
      }

      return {
        createdAt: decoded.createdAt,
        id: decoded.id
      };
    } catch (error) {
      if (error instanceof InvalidMessageCursorError) {
        throw error;
      }

      throw new InvalidMessageCursorError();
    }
  }

  private async lookupMembership(groupId: string, userId: string): Promise<boolean> {
    const result = await this.db.query<MembershipRow>(
      `
        SELECT true AS exists
        FROM group_members
        WHERE group_id = $1
          AND user_id = $2
        LIMIT 1
      `,
      [groupId, userId]
    );

    return result.rows.length > 0;
  }

  private mapMessage(row: MessageRow): MessageItem {
    return {
      id: row.id,
      groupId: row.group_id,
      senderId: row.sender_id,
      type: 'text',
      text: row.text,
      mediaUrl: null,
      createdAt: row.created_at
    };
  }
}
