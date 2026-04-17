import type { MemoryJob } from '@dolcove/shared';

import type { MemoryJobProcessor } from './memory.processor';
import type { MemoryJobQueue } from './memory-job.queue';

export interface MemoryWorkerDependencies {
  queue: MemoryJobQueue;
  processor: MemoryJobProcessor;
}

export interface MemoryWorker {
  processNext(): Promise<boolean>;
}

export const createMemoryWorker = (
  dependencies: MemoryWorkerDependencies
): MemoryWorker => {
  return {
    async processNext(): Promise<boolean> {
      const job = await dependencies.queue.dequeue();

      if (!job) {
        return false;
      }

      await dependencies.processor.process(job);

      return true;
    }
  };
};

export type { MemoryJob };
