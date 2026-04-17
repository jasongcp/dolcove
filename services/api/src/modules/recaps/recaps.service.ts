import type { Recap } from '@dolcove/shared';

import type { ListRecapsInput, RecapRecord } from './types';

interface MembershipRow {
  exists: boolean;
}

interface RecapRow {
  id: string;
  group_id: string;
  period_start: string;
  period_end: string;
  content: string;
  created_at: string;
}

export interface RecapsDatabase {
  query<T>(text: string, values?: readonly unknown[]): Promise<{ rows: T[] }>;
}

export class RecapsService {
  constructor(private readonly db: RecapsDatabase) {}

  async listRecapsForUserInGroup(input: ListRecapsInput): Promise<RecapRecord[] | null> {
    const result = await this.db.query<RecapRow>(
      `
        SELECT
          r.id,
          r.group_id,
          r.period_start::text AS period_start,
          r.period_end::text AS period_end,
          r.content,
          r.created_at::text AS created_at
        FROM recaps r
        JOIN group_members gm
          ON gm.group_id = r.group_id
        WHERE r.group_id = $1
          AND gm.user_id = $2
        ORDER BY r.period_start DESC, r.id DESC
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

    return result.rows.map((row) => this.mapRecap(row));
  }

  private mapRecap(row: RecapRow): RecapRecord {
    return {
      id: row.id,
      groupId: row.group_id,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      content: row.content,
      createdAt: row.created_at
    };
  }
}
