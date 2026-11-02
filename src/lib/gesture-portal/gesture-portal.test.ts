import { describe, expect, it } from "vitest";
import {
  isLShapeGesture,
  computePortalGeometry,
  smoothCorners,
  pointInsidePolygon,
  calculateFeatheredOpacity,
  AsyncInferenceQueue,
  listPortalStyles,
  getPortalStyle,
} from "./index";
import type { HandLandmarks, PortalCorners } from "./types";

function createMockHand(isL: boolean): HandLandmarks {
  const landmarks: HandLandmarks = [];
  for (let i = 0; i < 21; i++) {
    landmarks.push({ x: 0.5, y: 0.5, z: 0 });
  }

  landmarks[0] = { x: 0.5, y: 0.9, z: 0 }; // Wrist

  if (isL) {
    // Index extended straight up
    landmarks[5] = { x: 0.5, y: 0.7, z: 0 }; // index MCP
    landmarks[8] = { x: 0.5, y: 0.3, z: 0 }; // index tip (distance 0.6)

    // Thumb extended out to the right
    landmarks[4] = { x: 0.8, y: 0.7, z: 0 }; // thumb tip

    // Other fingers curled close to wrist
    landmarks[9] = { x: 0.55, y: 0.7, z: 0 };
    landmarks[12] = { x: 0.55, y: 0.75, z: 0 };
    landmarks[13] = { x: 0.6, y: 0.7, z: 0 };
    landmarks[16] = { x: 0.6, y: 0.75, z: 0 };
    landmarks[17] = { x: 0.65, y: 0.7, z: 0 };
    landmarks[20] = { x: 0.65, y: 0.75, z: 0 };
  } else {
    // Flipped/flat hand (all fingers extended)
    landmarks[5] = { x: 0.5, y: 0.7, z: 0 };
    landmarks[8] = { x: 0.5, y: 0.3, z: 0 };
    landmarks[9] = { x: 0.55, y: 0.7, z: 0 };
    landmarks[12] = { x: 0.55, y: 0.28, z: 0 };
    landmarks[13] = { x: 0.6, y: 0.7, z: 0 };
    landmarks[16] = { x: 0.6, y: 0.3, z: 0 };
    landmarks[17] = { x: 0.65, y: 0.7, z: 0 };
    landmarks[20] = { x: 0.65, y: 0.35, z: 0 };
  }

  return landmarks;
}

describe("GesturePortal Engine", () => {
  it("detects L-shape hand gesture accurately", () => {
    const lHand = createMockHand(true);
    const nonLHand = createMockHand(false);

    const res1 = isLShapeGesture(lHand);
    expect(res1.isLShape).toBe(true);
    expect(res1.cornerPoint).toBeDefined();

    const res2 = isLShapeGesture(nonLHand);
    expect(res2.isLShape).toBe(false);
  });

  it("computes portal quad geometry when both hands make L-shape", () => {
    const hand1 = createMockHand(true);
    // Translate hand2 so it sits in another region of the frame while preserving L-shape geometry
    const hand2 = createMockHand(true).map((p) => ({
      x: p.x + 0.15,
      y: p.y - 0.15,
      z: p.z,
    }));

    const geom = computePortalGeometry(hand1, hand2, 1000, 1000);
    expect(geom).not.toBeNull();
    expect(geom?.isActive).toBe(true);
    expect(geom?.corners.length).toBe(4);
    expect(geom?.width).toBeGreaterThan(0);
    expect(geom?.height).toBeGreaterThan(0);
  });

  it("smooths corners using EMA", () => {
    const prev: PortalCorners = [
      { x: 100, y: 100 },
      { x: 200, y: 100 },
      { x: 200, y: 200 },
      { x: 100, y: 200 },
    ];
    const next: PortalCorners = [
      { x: 120, y: 120 },
      { x: 220, y: 120 },
      { x: 220, y: 220 },
      { x: 120, y: 220 },
    ];

    const smoothed = smoothCorners(prev, next, 0.5);
    expect(smoothed[0].x).toBe(110);
    expect(smoothed[0].y).toBe(110);
  });

  it("evaluates point inside polygon correctly", () => {
    const poly = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];

    expect(pointInsidePolygon({ x: 50, y: 50 }, poly)).toBe(true);
    expect(pointInsidePolygon({ x: 150, y: 50 }, poly)).toBe(false);
  });

  it("calculates feathered opacity smoothly along edge", () => {
    const corners: PortalCorners = [
      { x: 100, y: 100 },
      { x: 300, y: 100 },
      { x: 300, y: 300 },
      { x: 100, y: 300 },
    ];

    // Deep inside -> 1.0
    expect(calculateFeatheredOpacity({ x: 200, y: 200 }, corners, 20)).toBe(1.0);

    // Far outside -> 0.0
    expect(calculateFeatheredOpacity({ x: 50, y: 200 }, corners, 20)).toBe(0.0);

    // Right on the boundary edge -> ~0.5
    const edgeOpacity = calculateFeatheredOpacity({ x: 100, y: 200 }, corners, 20);
    expect(edgeOpacity).toBeGreaterThan(0.4);
    expect(edgeOpacity).toBeLessThan(0.6);
  });

  it("manages async decoupled frame queue dropping stale frames", () => {
    const queue = new AsyncInferenceQueue();

    // 1st frame schedules immediately
    const f1 = queue.pushFrame({ id: "1", timestampMs: 1000 });
    expect(f1.scheduledNow).toBe(true);
    expect(f1.wasDropped).toBe(false);

    // 2nd frame is pending
    const f2 = queue.pushFrame({ id: "2", timestampMs: 1033 });
    expect(f2.scheduledNow).toBe(false);
    expect(f2.wasDropped).toBe(false);

    // 3rd frame replaces 2nd frame (drops frame 2)
    const f3 = queue.pushFrame({ id: "3", timestampMs: 1066 });
    expect(f3.scheduledNow).toBe(false);
    expect(f3.wasDropped).toBe(true);

    const metricsBefore = queue.getMetrics();
    expect(metricsBefore.droppedFrames).toBe(1);
    expect(metricsBefore.inFlight).toBe(true);
    expect(metricsBefore.hasPending).toBe(true);

    // Worker finishes 1st frame (took 250ms)
    const next = queue.onInferenceComplete(250);
    expect(next?.id).toBe("3"); // Dispatches frame 3, skipping dropped frame 2!

    const metricsAfter = queue.getMetrics();
    expect(metricsAfter.processedFrames).toBe(1);
    expect(metricsAfter.averageLatencyMs).toBe(250);
    expect(metricsAfter.effectiveFps).toBe(4.0); // 1000 / 250 = 4 FPS
  });

  it("lists all 9 visual portal styles", () => {
    const styles = listPortalStyles();
    expect(styles.length).toBe(9);
    expect(styles.some((s) => s.id === "anime")).toBe(true);
    expect(styles.some((s) => s.id === "doodle")).toBe(true);
    expect(styles.some((s) => s.id === "halftone_press")).toBe(true);
    expect(styles.some((s) => s.id === "fiduciary_anchor")).toBe(true);

    const anime = getPortalStyle("anime");
    expect(anime?.name).toBe("Anime Shinkai Sky");
    expect(anime?.steps).toBe(4);
  });
});
