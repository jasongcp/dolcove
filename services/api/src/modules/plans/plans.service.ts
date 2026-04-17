import { randomUUID } from 'node:crypto';

import type { Plan, PlanVote } from '@dolcove/shared';

import type {
  CreatePlanInput,
  GetPlanInput,
  ListPlansInput,
  PlanRecord,
  PlanVoteRecord,
  VoteOnPlanInput
} from './types';

interface MembershipRow {
  exists: boolean;
}

interface AccessiblePlanRow {
  group_id: string;
}

interface ExistingVoteRow {
  id: string;
}

interface PlanRow {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  status: Plan['status'];
  start_time: string | null;
  location: string | null;
  created_by: string;
  created_at: string;
}

interface PlanVoteRow {
  id: string;
  plan_id: string;
  user_id: string;
  vote: PlanVote['vote'];
  updated_at: string;
}

export interface PlansDatabase {
  query<T>(text: string, values?: readonly unknown[]): Promise<{ rows: T[] }>;
  connect(): Promise<PlansDatabaseClient>;
}

export interface PlansDatabaseClient {
  query<T>(text: string, values?: readonly unknown[]): Promise<{ rows: T[] }>;
  release(): void;
}

export class PlansService {
  constructor(
    private readonly db: PlansDatabase,
    private readonly generateId: () => string = randomUUID
  ) {}

  async listPlansForUserInGroup(input: ListPlansInput): Promise<PlanRecord[] | null> {
    const result = await this.db.query<PlanRow>(
      `
        SELECT
          p.id,
          p.group_id,
          p.title,
          p.description,
          p.status,
          p.start_time::text AS start_time,
          p.location,
          p.created_by,
          p.created_at::text AS created_at
        FROM plans p
        JOIN group_members gm
          ON gm.group_id = p.group_id
        WHERE p.group_id = $1
          AND gm.user_id = $2
        ORDER BY COALESCE(p.start_time, p.created_at) ASC, p.id ASC
      `,
      [input.groupId, input.userId]
    );

    if (result.rows.length === 0) {
      const membership = await this.db.query<MembershipRow>(
        `
          SELECT true AS exists
          FROM group_members
          WHERE group_id = $1
            AND user_id = $2
          LIMIT 1
        `,
        [input.groupId, input.userId]
      );

      if (membership.rows.length === 0) {
        return null;
      }
    }

    return result.rows.map((row) => this.mapPlan(row));
  }

  async getPlanForUser(input: GetPlanInput): Promise<PlanRecord | null> {
    const result = await this.db.query<PlanRow>(
      `
        SELECT
          p.id,
          p.group_id,
          p.title,
          p.description,
          p.status,
          p.start_time::text AS start_time,
          p.location,
          p.created_by,
          p.created_at::text AS created_at
        FROM plans p
        JOIN group_members gm
          ON gm.group_id = p.group_id
        WHERE p.id = $1
          AND gm.user_id = $2
        LIMIT 1
      `,
      [input.planId, input.userId]
    );

    const row = result.rows[0];

    return row ? this.mapPlan(row) : null;
  }

  async createPlan(input: CreatePlanInput): Promise<PlanRecord | null> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      const membership = await client.query<MembershipRow>(
        `
          SELECT true AS exists
          FROM group_members
          WHERE group_id = $1
            AND user_id = $2
          LIMIT 1
        `,
        [input.groupId, input.userId]
      );

      if (membership.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const planId = `pln_${this.generateId()}`;
      const result = await client.query<PlanRow>(
        `
          INSERT INTO plans (
            id,
            group_id,
            title,
            description,
            status,
            start_time,
            location,
            created_by,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), now())
          RETURNING
            id,
            group_id,
            title,
            description,
            status,
            start_time::text AS start_time,
            location,
            created_by,
            created_at::text AS created_at
        `,
        [
          planId,
          input.groupId,
          input.title,
          input.description,
          'proposed',
          input.startTime,
          input.location,
          input.userId
        ]
      );

      await client.query('COMMIT');

      return this.mapPlan(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async voteOnPlan(input: VoteOnPlanInput): Promise<PlanVoteRecord | null> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      const accessiblePlan = await client.query<AccessiblePlanRow>(
        `
          SELECT p.group_id
          FROM plans p
          JOIN group_members gm
            ON gm.group_id = p.group_id
          WHERE p.id = $1
            AND gm.user_id = $2
          LIMIT 1
        `,
        [input.planId, input.userId]
      );

      if (accessiblePlan.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const existingVote = await client.query<ExistingVoteRow>(
        `
          SELECT id
          FROM plan_votes
          WHERE plan_id = $1
            AND user_id = $2
          LIMIT 1
        `,
        [input.planId, input.userId]
      );

      const voteId = existingVote.rows[0]?.id ?? `pvt_${this.generateId()}`;
      const result = await client.query<PlanVoteRow>(
        existingVote.rows.length > 0
          ? `
              UPDATE plan_votes
              SET vote = $3,
                  updated_at = now()
              WHERE plan_id = $1
                AND user_id = $2
              RETURNING
                id,
                plan_id,
                user_id,
                vote,
                updated_at::text AS updated_at
            `
          : `
              INSERT INTO plan_votes (
                id,
                plan_id,
                user_id,
                vote,
                updated_at
              )
              VALUES ($1, $2, $3, $4, now())
              RETURNING
                id,
                plan_id,
                user_id,
                vote,
                updated_at::text AS updated_at
            `,
        existingVote.rows.length > 0
          ? [input.planId, input.userId, input.vote]
          : [voteId, input.planId, input.userId, input.vote]
      );

      await client.query('COMMIT');

      return this.mapPlanVote(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private mapPlan(row: PlanRow): PlanRecord {
    return {
      id: row.id,
      groupId: row.group_id,
      title: row.title,
      description: row.description,
      status: row.status,
      startTime: row.start_time,
      location: row.location,
      createdBy: row.created_by,
      createdAt: row.created_at
    };
  }

  private mapPlanVote(row: PlanVoteRow): PlanVoteRecord {
    return {
      id: row.id,
      planId: row.plan_id,
      userId: row.user_id,
      vote: row.vote,
      updatedAt: row.updated_at
    };
  }
}
