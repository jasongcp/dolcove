import type { Plan, PlanVote } from '@dolcove/shared';

export interface ListPlansInput {
  groupId: string;
  userId: string;
}

export interface GetPlanInput {
  planId: string;
  userId: string;
}

export interface CreatePlanInput {
  groupId: string;
  userId: string;
  title: string;
  description: string | null;
  startTime: string | null;
  location: string | null;
}

export interface VoteOnPlanInput {
  planId: string;
  userId: string;
  vote: PlanVote['vote'];
}

export type PlanRecord = Plan;
export type PlanVoteRecord = PlanVote;
