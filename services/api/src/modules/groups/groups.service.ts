import { randomUUID } from 'node:crypto';

import type {
  CreatedGroupRecord,
  CreateGroupInput,
  GroupDetail,
  GroupListItem
} from './types';

interface QueryResultRow {
  id: string;
  name: string;
  description: string | null;
  member_count: number | string;
  last_activity_at: string;
}

interface GroupDetailRow {
  id: string;
  name: string;
  description: string | null;
  member_count: number | string;
  created_by: string;
  created_at: string;
}

interface CreatedGroupRow {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
}

export interface GroupsDatabaseClient {
  query<T>(text: string, values?: readonly unknown[]): Promise<{ rows: T[] }>;
  release(): void;
}

export interface GroupsDatabase {
  query<T>(text: string, values?: readonly unknown[]): Promise<{ rows: T[] }>;
  connect(): Promise<GroupsDatabaseClient>;
}

export class GroupsService {
  constructor(
    private readonly db: GroupsDatabase,
    private readonly generateId: () => string = randomUUID
  ) {}

  async listGroupsForUser(userId: string): Promise<GroupListItem[]> {
    const result = await this.db.query<QueryResultRow>(
      `
        SELECT
          g.id,
          g.name,
          g.description,
          COUNT(DISTINCT gm_all.user_id)::int AS member_count,
          COALESCE(g.updated_at, g.created_at)::text AS last_activity_at
        FROM groups g
        JOIN group_members gm
          ON gm.group_id = g.id
        LEFT JOIN group_members gm_all
          ON gm_all.group_id = g.id
        WHERE gm.user_id = $1
        GROUP BY g.id, g.name, g.description, g.updated_at, g.created_at
        ORDER BY COALESCE(g.updated_at, g.created_at) DESC
      `,
      [userId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      memberCount: Number(row.member_count),
      lastActivityAt: row.last_activity_at
    }));
  }

  async getGroupForUser(groupId: string, userId: string): Promise<GroupDetail | null> {
    const result = await this.db.query<GroupDetailRow>(
      `
        SELECT
          g.id,
          g.name,
          g.description,
          COUNT(DISTINCT gm_all.user_id)::int AS member_count,
          g.created_by,
          g.created_at::text AS created_at
        FROM groups g
        JOIN group_members gm
          ON gm.group_id = g.id
        LEFT JOIN group_members gm_all
          ON gm_all.group_id = g.id
        WHERE g.id = $1
          AND gm.user_id = $2
        GROUP BY g.id, g.name, g.description, g.created_by, g.created_at
      `,
      [groupId, userId]
    );

    const row = result.rows[0];

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      memberCount: Number(row.member_count),
      createdBy: row.created_by,
      createdAt: row.created_at
    };
  }

  async createGroup(input: CreateGroupInput): Promise<CreatedGroupRecord> {
    const client = await this.db.connect();
    const timestamp = new Date().toISOString();
    const groupId = `grp_${this.generateId()}`;
    const membershipId = `gm_${this.generateId()}`;

    try {
      await client.query('BEGIN');

      const groupResult = await client.query<CreatedGroupRow>(
        `
          INSERT INTO groups (
            id,
            name,
            description,
            created_by,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id, name, description, created_by, created_at::text AS created_at
        `,
        [groupId, input.name, input.description, input.userId, timestamp, timestamp]
      );

      await client.query(
        `
          INSERT INTO group_members (
            id,
            group_id,
            user_id,
            role,
            joined_at
          )
          VALUES ($1, $2, $3, $4, $5)
        `,
        [membershipId, groupId, input.userId, 'owner', timestamp]
      );

      await client.query('COMMIT');

      const createdGroup = groupResult.rows[0];

      return {
        id: createdGroup.id,
        name: createdGroup.name,
        description: createdGroup.description,
        createdBy: createdGroup.created_by,
        createdAt: createdGroup.created_at
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
