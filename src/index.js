import WorkerClient from './client/worker-client';

export * from 'arquero';
export function worker(source) {
  return new WorkerClient(source);
}