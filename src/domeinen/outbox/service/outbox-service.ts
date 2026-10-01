import type { Logger } from '@/shared/logging/logger';
import type { Clock } from '@/shared/platform/ports';
import {
  deliveryFor,
  OUTBOX_STATUS,
  type OutboxCommand,
  type OutboxItem,
} from '../domain/delivery';
import type { OutboxRepository } from './outbox-repository';

/** Same shape as the photo queue: schedule work, get a cancel function. */
export type OutboxScheduler = {
  schedule(callback: () => void, delayMs: number): () => void;
};

const RETRY_DELAYS_MS = [5_000, 15_000, 60_000, 300_000] as const;

/** Sends one stored command. Throws on failure; the queue decides whether to retry. */
export type OutboxSender = (command: OutboxCommand) => Promise<void>;

export type MutationOutbox = {
  enqueue(command: OutboxCommand): Promise<void>;
  list(): Promise<readonly OutboxItem[]>;
  clearAll(): Promise<void>;
  start(): void;
  stop(): void;
  processNow(): Promise<void>;
  /** Notified after enqueue, send, fail or clear — so the UI can refresh pending badges. */
  subscribe(listener: () => void): () => void;
};

export type OutboxServiceDeps = {
  repository: OutboxRepository;
  send: OutboxSender;
  clock: Clock;
  scheduler: OutboxScheduler;
  logger?: Logger;
  /** After a command actually reached the server. */
  onSent?: (command: OutboxCommand) => void;
};

/**
 * Mutations the berger already confirmed, in the order they were made. A temporary failure
 * blocks the head and is tried again. A hard rejection drops that one item and continues.
 */
export function createOutboxService(deps: OutboxServiceDeps): MutationOutbox {
  const { repository, send, clock, scheduler, logger, onSent } = deps;

  let running = false;
  let waitingForRetry = false;
  let rerun = false;
  let drainPromise: Promise<void> | null = null;
  let cancelRetry: (() => void) | null = null;
  let retryAttempt = 0;
  let idSequence = 0;
  let chain: Promise<unknown> = Promise.resolve();
  const listeners = new Set<() => void>();

  function notify(): void {
    for (const listener of listeners) {
      listener();
    }
  }

  function nextId(): string {
    idSequence += 1;
    return `outbox-${clock.now()}-${idSequence}`;
  }

  /** One repository update at a time, so an enqueue cannot overwrite a drain (or the reverse). */
  function locked<T>(fn: () => Promise<T>): Promise<T> {
    const run = chain.then(fn, fn);
    chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  function scheduleRetry(): void {
    if (!running) {
      return;
    }
    waitingForRetry = true;
    cancelRetry?.();
    const delay = RETRY_DELAYS_MS[Math.min(retryAttempt, RETRY_DELAYS_MS.length - 1)] ?? 300_000;
    retryAttempt += 1;
    cancelRetry = scheduler.schedule(() => {
      waitingForRetry = false;
      kick();
    }, delay);
  }

  async function updateItem(
    id: string,
    change: (item: OutboxItem) => OutboxItem | null,
  ): Promise<void> {
    await locked(async () => {
      const items = await repository.load();
      if (!items.some((item) => item.id === id)) {
        return;
      }
      const next: OutboxItem[] = [];
      for (const item of items) {
        if (item.id !== id) {
          next.push(item);
          continue;
        }
        const changed = change(item);
        if (changed !== null) {
          next.push(changed);
        }
      }
      await repository.save(next);
    });
    notify();
  }

  async function drain(): Promise<void> {
    while (running && !waitingForRetry) {
      const next = await locked(async () => {
        const items = await repository.load();
        return items.find((item) => item.status === OUTBOX_STATUS.queued) ?? null;
      });
      if (!next) {
        retryAttempt = 0;
        return;
      }
      try {
        await send(next.command);
        await updateItem(next.id, () => null);
        onSent?.(next.command);
        retryAttempt = 0;
      } catch (error) {
        const delivery = deliveryFor(error);
        if (delivery === 'retry') {
          logger?.warn('app', 'Outbox item failed temporarily, will retry', {
            id: next.id,
            kind: next.command.kind,
            error,
          });
          await updateItem(next.id, (item) => ({ ...item, attempts: item.attempts + 1 }));
          scheduleRetry();
          return;
        }
        logger?.warn('app', 'Outbox item rejected, marked failed', {
          id: next.id,
          kind: next.command.kind,
          error,
        });
        await updateItem(next.id, (item) => ({
          ...item,
          status: OUTBOX_STATUS.failed,
          attempts: item.attempts + 1,
        }));
        retryAttempt = 0;
      }
    }
  }

  function kick(): void {
    if (!running || waitingForRetry) {
      return;
    }
    if (drainPromise) {
      rerun = true;
      return;
    }
    drainPromise = drain().finally(() => {
      drainPromise = null;
      if (rerun) {
        rerun = false;
        kick();
      }
    });
  }

  return {
    async enqueue(command) {
      const item: OutboxItem = {
        id: nextId(),
        createdAt: clock.now(),
        attempts: 0,
        status: OUTBOX_STATUS.queued,
        command,
      };
      await locked(async () => {
        const items = await repository.load();
        await repository.save([...items, item]);
      });
      notify();
      kick();
    },

    list: () => repository.load(),

    async clearAll() {
      waitingForRetry = false;
      rerun = false;
      cancelRetry?.();
      cancelRetry = null;
      await locked(async () => {
        await repository.save([]);
      });
      notify();
    },

    start() {
      running = true;
      waitingForRetry = false;
      cancelRetry?.();
      cancelRetry = null;
      kick();
    },

    stop() {
      running = false;
      waitingForRetry = false;
      rerun = false;
      cancelRetry?.();
      cancelRetry = null;
    },

    async processNow() {
      kick();
      while (drainPromise) {
        await drainPromise;
      }
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
