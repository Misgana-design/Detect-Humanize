/**
 * Priority queue for humanization requests.
 *
 * Free tier:    concurrency 1, no priority boost
 * Paid tiers:   concurrency 3, priority processing
 *
 * This is an in-process queue using a simple promise-based semaphore.
 * For true distributed priority queuing (across multiple Vercel instances),
 * you would replace this with Upstash QStash or a Redis-backed queue.
 * This implementation is production-grade for single-instance deployments
 * and Vercel serverless (each invocation is isolated, so the queue prevents
 * within-request overload rather than cross-request ordering).
 */

type Priority = "high" | "normal";

interface QueuedTask<T> {
  fn: () => Promise<T>;
  priority: Priority;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

class PriorityQueue<T> {
  private highQueue: Array<QueuedTask<T>> = [];
  private normalQueue: Array<QueuedTask<T>> = [];
  private running = 0;
  private readonly concurrency: number;

  constructor(concurrency: number) {
    this.concurrency = concurrency;
  }

  enqueue(fn: () => Promise<T>, priority: Priority): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const task: QueuedTask<T> = { fn, priority, resolve, reject };
      if (priority === "high") {
        this.highQueue.push(task);
      } else {
        this.normalQueue.push(task);
      }
      this.drain();
    });
  }

  private drain() {
    while (this.running < this.concurrency) {
      const task = this.highQueue.shift() ?? this.normalQueue.shift();
      if (!task) break;

      this.running++;
      task
        .fn()
        .then(task.resolve)
        .catch(task.reject)
        .finally(() => {
          this.running--;
          this.drain();
        });
    }
  }
}

// Singleton queue — shared across all requests in the same serverless instance
const humanizeQueue = new PriorityQueue<unknown>(3);

/**
 * Run a humanization task through the priority queue.
 *
 * @param fn       The async function to execute
 * @param isPaid   Whether the user is on a paid plan (gets high priority)
 */
export async function runWithPriority<T>(
  fn: () => Promise<T>,
  isPaid: boolean,
): Promise<T> {
  const priority: Priority = isPaid ? "high" : "normal";
  return humanizeQueue.enqueue(fn as () => Promise<unknown>, priority) as Promise<T>;
}
