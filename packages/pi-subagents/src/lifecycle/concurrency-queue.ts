/**
 * concurrency-queue.ts — Manages background agent scheduling with a configurable concurrency limit.
 *
 * Stores agent IDs (not full agent objects) and decides *when* to start them.
 * The startAgent callback provided at construction handles the actual agent lifecycle.
 */

export class ConcurrencyQueue {
   private queue: string[] = [];
   private running = 0;

   constructor(
      private readonly getMaxConcurrent: () => number,
      private readonly startAgent: (id: string) => void,
   ) {}

   /** Whether the concurrency limit has been reached. */
   isFull(): boolean {
      return this.running >= this.getMaxConcurrent();
   }

   /** Add an agent ID to the wait queue. */
   enqueue(id: string): void {
      this.queue.push(id);
   }

   /** Remove an agent ID from the queue (e.g., aborted before starting). Returns true if found. */
   dequeue(id: string): boolean {
      const idx = this.queue.indexOf(id);
      if (idx === -1) return false;
      this.queue.splice(idx, 1);
      return true;
   }

   /** Increment the running count. Called when an agent transitions to running. */
   markStarted(): void {
      this.running++;
   }

   /** Decrement the running count and drain the queue. Called when a background agent finishes. */
   markFinished(): void {
      this.running--;
      this.drain();
   }

   /** Start queued agents until the concurrency limit is reached. */
   drain(): void {
      while (this.queue.length > 0 && !this.isFull()) {
         const id = this.queue.shift()!;
         this.startAgent(id);
      }
   }

   /** Snapshot of queued IDs for iteration (e.g., abortAll). */
   get queuedIds(): readonly string[] {
      return this.queue;
   }

   /** Clear the queue without starting any agents. */
   clear(): void {
      this.queue = [];
   }
}
