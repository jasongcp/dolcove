import {
  createMessageCreatedMemoryJob,
  type MemoryJob,
  type MessageCreatedEvent
} from '@dolcove/shared';

export interface MemoryJobQueue {
  enqueue(job: MemoryJob): Promise<void>;
  enqueueFromMessageCreated(event: MessageCreatedEvent): Promise<MemoryJob>;
  dequeue(): Promise<MemoryJob | null>;
  size(): Promise<number>;
}

export class InMemoryMemoryJobQueue implements MemoryJobQueue {
  private readonly jobs: MemoryJob[] = [];

  async enqueue(job: MemoryJob): Promise<void> {
    this.jobs.push(job);
  }

  async enqueueFromMessageCreated(event: MessageCreatedEvent): Promise<MemoryJob> {
    const job = createMessageCreatedMemoryJob(event);
    await this.enqueue(job);

    return job;
  }

  async dequeue(): Promise<MemoryJob | null> {
    return this.jobs.shift() ?? null;
  }

  async size(): Promise<number> {
    return this.jobs.length;
  }
}
