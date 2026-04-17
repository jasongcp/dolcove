import { InMemoryMemoryJobQueue, type MemoryJobQueue } from './modules/memory/memory-job.queue';
import {
  NoopMemoryJobProcessor,
  type MemoryJobProcessor
} from './modules/memory/memory.processor';
import { createMemoryWorker, type MemoryWorker } from './modules/memory/memory-worker';

const HEARTBEAT_INTERVAL_MS = 5000;

export interface WorkerRuntimeDependencies {
  queue?: MemoryJobQueue;
  processor?: MemoryJobProcessor;
  now?: () => string;
}

export interface WorkerHeartbeatPayload {
  service: 'worker';
  status: 'heartbeat';
  queue: {
    memory: {
      pendingJobs: number;
    };
  };
  timestamp: string;
}

export interface WorkerRuntime {
  worker: MemoryWorker;
  createHeartbeat(): Promise<WorkerHeartbeatPayload>;
  logHeartbeat(): Promise<void>;
  startHeartbeatLoop(): void;
}

export const createMemoryWorkerRuntime = (
  dependencies: WorkerRuntimeDependencies = {}
): WorkerRuntime => {
  const queue = dependencies.queue ?? new InMemoryMemoryJobQueue();
  const processor = dependencies.processor ?? new NoopMemoryJobProcessor();
  const now = dependencies.now ?? (() => new Date().toISOString());
  const worker = createMemoryWorker({ queue, processor });

  return {
    worker,
    async createHeartbeat(): Promise<WorkerHeartbeatPayload> {
      return {
        service: 'worker',
        status: 'heartbeat',
        queue: {
          memory: {
            pendingJobs: await queue.size()
          }
        },
        timestamp: now()
      };
    },
    async logHeartbeat(): Promise<void> {
      console.log(JSON.stringify(await this.createHeartbeat()));
    },
    startHeartbeatLoop(): void {
      setInterval(() => {
        void this.logHeartbeat();
      }, HEARTBEAT_INTERVAL_MS);
    }
  };
};
