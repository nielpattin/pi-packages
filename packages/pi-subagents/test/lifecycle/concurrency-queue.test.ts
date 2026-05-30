import { describe, expect, it, vi } from "vitest";
import { ConcurrencyQueue } from "#src/lifecycle/concurrency-queue";

describe("ConcurrencyQueue", () => {
   describe("isFull()", () => {
      it("returns false when no agents are running", () => {
         const queue = new ConcurrencyQueue(() => 2, vi.fn());
         expect(queue.isFull()).toBe(false);
      });

      it("returns false when running count is below the limit", () => {
         const queue = new ConcurrencyQueue(() => 2, vi.fn());
         queue.markStarted();
         expect(queue.isFull()).toBe(false);
      });

      it("returns true when running count equals the limit", () => {
         const queue = new ConcurrencyQueue(() => 2, vi.fn());
         queue.markStarted();
         queue.markStarted();
         expect(queue.isFull()).toBe(true);
      });

      it("returns true when running count exceeds the limit (limit decreased)", () => {
         let limit = 3;
         const queue = new ConcurrencyQueue(() => limit, vi.fn());
         queue.markStarted();
         queue.markStarted();
         queue.markStarted();
         limit = 2;
         expect(queue.isFull()).toBe(true);
      });

      it("re-evaluates the limit dynamically", () => {
         let limit = 1;
         const queue = new ConcurrencyQueue(() => limit, vi.fn());
         queue.markStarted();
         expect(queue.isFull()).toBe(true);
         limit = 2;
         expect(queue.isFull()).toBe(false);
      });
   });

   describe("enqueue() / dequeue()", () => {
      it("enqueue adds an ID to the queue", () => {
         const queue = new ConcurrencyQueue(() => 4, vi.fn());
         queue.enqueue("a");
         expect(queue.queuedIds).toEqual(["a"]);
      });

      it("enqueue preserves insertion order", () => {
         const queue = new ConcurrencyQueue(() => 4, vi.fn());
         queue.enqueue("a");
         queue.enqueue("b");
         queue.enqueue("c");
         expect(queue.queuedIds).toEqual(["a", "b", "c"]);
      });

      it("dequeue removes a specific ID and returns true", () => {
         const queue = new ConcurrencyQueue(() => 4, vi.fn());
         queue.enqueue("a");
         queue.enqueue("b");
         queue.enqueue("c");
         expect(queue.dequeue("b")).toBe(true);
         expect(queue.queuedIds).toEqual(["a", "c"]);
      });

      it("dequeue returns false for a missing ID", () => {
         const queue = new ConcurrencyQueue(() => 4, vi.fn());
         queue.enqueue("a");
         expect(queue.dequeue("z")).toBe(false);
      });

      it("dequeue returns false on an empty queue", () => {
         const queue = new ConcurrencyQueue(() => 4, vi.fn());
         expect(queue.dequeue("a")).toBe(false);
      });
   });

   describe("markStarted() / markFinished()", () => {
      it("markStarted increments the running count", () => {
         const queue = new ConcurrencyQueue(() => 2, vi.fn());
         queue.markStarted();
         queue.markStarted();
         expect(queue.isFull()).toBe(true);
      });

      it("markFinished decrements the running count", () => {
         const queue = new ConcurrencyQueue(() => 1, vi.fn());
         queue.markStarted();
         expect(queue.isFull()).toBe(true);
         queue.markFinished();
         expect(queue.isFull()).toBe(false);
      });
   });

   describe("drain()", () => {
      it("calls startAgent for each queued ID until full", () => {
         const start = vi.fn();
         const queue = new ConcurrencyQueue(() => 2, start);
         queue.enqueue("a");
         queue.enqueue("b");
         queue.enqueue("c");

         // Simulate startAgent incrementing the running count (as the real observer does)
         start.mockImplementation(() => {
            queue.markStarted();
         });

         queue.drain();

         expect(start).toHaveBeenCalledTimes(2);
         expect(start).toHaveBeenCalledWith("a");
         expect(start).toHaveBeenCalledWith("b");
         expect(queue.queuedIds).toEqual(["c"]);
      });

      it("does nothing when the queue is empty", () => {
         const start = vi.fn();
         const queue = new ConcurrencyQueue(() => 4, start);
         queue.drain();
         expect(start).not.toHaveBeenCalled();
      });

      it("does nothing when already full", () => {
         const start = vi.fn();
         const queue = new ConcurrencyQueue(() => 1, start);
         queue.markStarted();
         queue.enqueue("a");
         queue.drain();
         expect(start).not.toHaveBeenCalled();
      });

      it("drains in FIFO order", () => {
         const order: string[] = [];
         const start = vi.fn((id: string) => {
            order.push(id);
         });
         const queue = new ConcurrencyQueue(() => 10, start);
         queue.enqueue("first");
         queue.enqueue("second");
         queue.enqueue("third");
         queue.drain();
         expect(order).toEqual(["first", "second", "third"]);
      });

      it("respects dynamic limit changes mid-drain", () => {
         let limit = 2;
         const start = vi.fn(() => {
            queue.markStarted();
         });
         const queue = new ConcurrencyQueue(() => limit, start);
         queue.enqueue("a");
         queue.enqueue("b");
         queue.enqueue("c");

         // After first start, reduce limit
         start.mockImplementation(() => {
            queue.markStarted();
            limit = 1;
         });

         queue.drain();

         // Only one agent starts because after it runs, isFull (1 >= 1) is true
         expect(start).toHaveBeenCalledTimes(1);
      });
   });

   describe("markFinished() auto-drain", () => {
      it("auto-drains the next queued agent when a running agent finishes", () => {
         const start = vi.fn(() => {
            queue.markStarted();
         });
         const queue = new ConcurrencyQueue(() => 1, start);

         queue.markStarted(); // one running
         queue.enqueue("waiting");

         queue.markFinished(); // running--, drain → starts "waiting"

         expect(start).toHaveBeenCalledOnce();
         expect(start).toHaveBeenCalledWith("waiting");
         expect(queue.queuedIds).toEqual([]);
      });

      it("does not drain when queue is empty after markFinished", () => {
         const start = vi.fn();
         const queue = new ConcurrencyQueue(() => 1, start);
         queue.markStarted();
         queue.markFinished();
         expect(start).not.toHaveBeenCalled();
      });
   });

   describe("clear()", () => {
      it("empties the queue without starting agents", () => {
         const start = vi.fn();
         const queue = new ConcurrencyQueue(() => 4, start);
         queue.enqueue("a");
         queue.enqueue("b");
         queue.clear();
         expect(queue.queuedIds).toEqual([]);
         expect(start).not.toHaveBeenCalled();
      });
   });

   describe("queuedIds", () => {
      it("returns an empty array when nothing is queued", () => {
         const queue = new ConcurrencyQueue(() => 4, vi.fn());
         expect(queue.queuedIds).toEqual([]);
      });

      it("returns current queue snapshot", () => {
         const queue = new ConcurrencyQueue(() => 4, vi.fn());
         queue.enqueue("x");
         queue.enqueue("y");
         expect(queue.queuedIds).toEqual(["x", "y"]);
      });
   });
});
