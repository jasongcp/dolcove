import { createMemoryWorkerRuntime } from './runtime';

const runtime = createMemoryWorkerRuntime();

console.log('Dolcove worker started');
void runtime.logHeartbeat();
runtime.startHeartbeatLoop();
