import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createMessageCreatedMemoryJob,
  type MemoryJob,
  type MessageCreatedEvent
} from '@dolcove/shared';

import { InMemoryMemoryJobQueue } from '../src/modules/memory/memory-job.queue';
import { createMemoryWorker } from '../src/modules/memory/memory-worker';
import { createMemoryWorkerRuntime } from '../src/runtime';

test('createMessageCreatedMemoryJob creates a stable memory job contract from a message-created event', () => {
  const event: MessageCreatedEvent = {
    type: 'message.created',
    occurredAt: '2026-04-12T00:00:00.000Z',
    payload: {
      messageId: 'msg_123',
      groupId: 'grp_weekend-crew',
      senderId: 'usr_123',
      createdAt: '2026-04-12T00:00:00.000Z'
    }
  };

  const job = createMessageCreatedMemoryJob(event);

  assert.deepEqual(job, {
    id: 'memjob_msg_123',
    type: 'memory.process-message',
    occurredAt: '2026-04-12T00:00:00.000Z',
    payload: {
      sourceEvent: 'message.created',
      messageId: 'msg_123',
      groupId: 'grp_weekend-crew',
      senderId: 'usr_123',
      createdAt: '2026-04-12T00:00:00.000Z'
    }
  });
});

test('InMemoryMemoryJobQueue enqueues jobs generated from message-created activity', async () => {
  const queue = new InMemoryMemoryJobQueue();
  const event: MessageCreatedEvent = {
    type: 'message.created',
    occurredAt: '2026-04-12T00:00:00.000Z',
    payload: {
      messageId: 'msg_123',
      groupId: 'grp_weekend-crew',
      senderId: 'usr_123',
      createdAt: '2026-04-12T00:00:00.000Z'
    }
  };

  const enqueuedJob = await queue.enqueueFromMessageCreated(event);
  const nextJob = await queue.dequeue();

  assert.deepEqual(enqueuedJob, nextJob);
  assert.equal(nextJob?.type, 'memory.process-message');
  assert.equal(nextJob?.payload.messageId, 'msg_123');
});

test('memory worker processes one queued job and delegates to the processor service', async () => {
  const queue = new InMemoryMemoryJobQueue();
  const processedJobs: MemoryJob[] = [];
  const worker = createMemoryWorker({
    queue,
    processor: {
      async process(job) {
        processedJobs.push(job);
      }
    }
  });

  await queue.enqueue({
    id: 'memjob_msg_123',
    type: 'memory.process-message',
    occurredAt: '2026-04-12T00:00:00.000Z',
    payload: {
      sourceEvent: 'message.created',
      messageId: 'msg_123',
      groupId: 'grp_weekend-crew',
      senderId: 'usr_123',
      createdAt: '2026-04-12T00:00:00.000Z'
    }
  });

  const processed = await worker.processNext();

  assert.equal(processed, true);
  assert.equal(processedJobs.length, 1);
  assert.equal(processedJobs[0]?.id, 'memjob_msg_123');
});

test('memory worker returns false when no job is available', async () => {
  const worker = createMemoryWorker({
    queue: new InMemoryMemoryJobQueue(),
    processor: {
      async process() {
        throw new Error('should not run');
      }
    }
  });

  const processed = await worker.processNext();

  assert.equal(processed, false);
});

test('memory worker runtime heartbeat reports queue depth', async () => {
  const queue = new InMemoryMemoryJobQueue();
  const runtime = createMemoryWorkerRuntime({
    queue,
    processor: {
      async process() {
        return;
      }
    }
  });

  await queue.enqueue({
    id: 'memjob_msg_123',
    type: 'memory.process-message',
    occurredAt: '2026-04-12T00:00:00.000Z',
    payload: {
      sourceEvent: 'message.created',
      messageId: 'msg_123',
      groupId: 'grp_weekend-crew',
      senderId: 'usr_123',
      createdAt: '2026-04-12T00:00:00.000Z'
    }
  });

  const heartbeat = await runtime.createHeartbeat();

  assert.deepEqual(heartbeat, {
    service: 'worker',
    status: 'heartbeat',
    queue: {
      memory: {
        pendingJobs: 1
      }
    },
    timestamp: heartbeat.timestamp
  });
  assert.match(heartbeat.timestamp, /^\d{4}-\d{2}-\d{2}T/);
});
