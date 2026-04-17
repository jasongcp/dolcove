import type { MemoryJob } from '@dolcove/shared';

export interface MemoryJobProcessor {
  process(job: MemoryJob): Promise<void>;
}

export class NoopMemoryJobProcessor implements MemoryJobProcessor {
  async process(job: MemoryJob): Promise<void> {
    console.log(
      JSON.stringify({
        service: 'worker',
        module: 'memory',
        status: 'job-received',
        jobId: job.id,
        jobType: job.type,
        groupId: job.payload.groupId,
        messageId: job.payload.messageId,
        sourceEvent: job.payload.sourceEvent,
        note: 'Memory extraction not implemented yet'
      })
    );
  }
}
