import type { AsyncQueueMetrics, FramePayload } from "./types";

/**
 * Decoupled real-time video buffer for async diffusion backends.
 * Keeps at most 1 frame in flight and 1 pending frame, dropping stale frames
 * to prevent pipeline latency buildup.
 */
export class AsyncInferenceQueue {
  private inFlight = false;
  private pendingFrame: FramePayload | null = null;
  private droppedFrames = 0;
  private processedFrames = 0;
  private latenciesMs: number[] = [];
  private lastProcessedTime = 0;
  private maxLatencyHistory = 50;

  /**
   * Pushes a freshly captured camera frame into the pipeline.
   * If a frame is already waiting, it is replaced and marked as dropped.
   */
  public pushFrame(frame: FramePayload): { scheduledNow: boolean; wasDropped: boolean } {
    if (!this.inFlight) {
      this.inFlight = true;
      return { scheduledNow: true, wasDropped: false };
    }

    const wasDropped = this.pendingFrame !== null;
    if (wasDropped) {
      this.droppedFrames++;
    }
    this.pendingFrame = frame;
    return { scheduledNow: false, wasDropped };
  }

  /**
   * Called when an inference job completes.
   * Returns the next pending frame to process, or null if queue is clear.
   */
  public onInferenceComplete(durationMs: number): FramePayload | null {
    this.processedFrames++;
    this.latenciesMs.push(durationMs);
    if (this.latenciesMs.length > this.maxLatencyHistory) {
      this.latenciesMs.shift();
    }
    this.lastProcessedTime = Date.now();

    if (this.pendingFrame) {
      const next = this.pendingFrame;
      this.pendingFrame = null;
      this.inFlight = true;
      return next;
    }

    this.inFlight = false;
    return null;
  }

  public getMetrics(): AsyncQueueMetrics {
    const avgLatency =
      this.latenciesMs.length > 0
        ? this.latenciesMs.reduce((a, b) => a + b, 0) / this.latenciesMs.length
        : 0;

    const effectiveFps = avgLatency > 0 ? 1000 / avgLatency : 0;

    return {
      inFlight: this.inFlight,
      hasPending: this.pendingFrame !== null,
      droppedFrames: this.droppedFrames,
      processedFrames: this.processedFrames,
      averageLatencyMs: Math.round(avgLatency),
      effectiveFps: Math.round(effectiveFps * 10) / 10,
    };
  }

  public reset(): void {
    this.inFlight = false;
    this.pendingFrame = null;
    this.droppedFrames = 0;
    this.processedFrames = 0;
    this.latenciesMs = [];
    this.lastProcessedTime = 0;
  }
}
