import type { HandLandmarks, Point, PortalCorners, PortalGeometry } from "./types";

/**
 * Checks whether a 21-landmark hand representation matches an L-shape gesture:
 * - Thumb extended outwards
 * - Index finger extended upwards/forwards
 * - Middle, ring, and pinky curled inward toward palm
 */
export function isLShapeGesture(landmarks: HandLandmarks): {
  isLShape: boolean;
  cornerPoint?: Point;
  confidence: number;
} {
  if (!landmarks || landmarks.length < 21) {
    return { isLShape: false, confidence: 0 };
  }

  const wrist = landmarks[0];
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const indexMcp = landmarks[5];
  const middleTip = landmarks[12];
  const middleMcp = landmarks[9];
  const ringTip = landmarks[16];
  const ringMcp = landmarks[13];
  const pinkyTip = landmarks[20];
  const pinkyMcp = landmarks[17];

  // Distances
  const dist = (p1: Point, p2: Point) =>
    Math.hypot(p1.x - p2.x, p1.y - p2.y);

  // Index extended: indexTip distance to wrist significantly greater than indexMcp to wrist
  const indexExtended = dist(indexTip, wrist) > dist(indexMcp, wrist) * 1.3;

  // Middle, ring, pinky curled: tips closer to wrist than their respective MCPs
  const middleCurled = dist(middleTip, wrist) <= dist(middleMcp, wrist) * 1.15;
  const ringCurled = dist(ringTip, wrist) <= dist(ringMcp, wrist) * 1.15;
  const pinkyCurled = dist(pinkyTip, wrist) <= dist(pinkyMcp, wrist) * 1.15;

  // Thumb extended away from index MCP
  const thumbExtended = dist(thumbTip, indexMcp) > dist(wrist, indexMcp) * 0.7;

  if (indexExtended && middleCurled && ringCurled && pinkyCurled && thumbExtended) {
    // The vertex / corner of the L shape is approximately at the intersection or index MCP
    return {
      isLShape: true,
      cornerPoint: { x: indexMcp.x, y: indexMcp.y },
      confidence: 0.88,
    };
  }

  return { isLShape: false, confidence: 0.1 };
}

/**
 * Smooths portal quad corners across consecutive video frames using Exponential Moving Average.
 */
export function smoothCorners(
  prevCorners: PortalCorners,
  newCorners: PortalCorners,
  alpha = 0.35,
): PortalCorners {
  const clampAlpha = Math.max(0.01, Math.min(1.0, alpha));
  return [
    {
      x: prevCorners[0].x * (1 - clampAlpha) + newCorners[0].x * clampAlpha,
      y: prevCorners[0].y * (1 - clampAlpha) + newCorners[0].y * clampAlpha,
    },
    {
      x: prevCorners[1].x * (1 - clampAlpha) + newCorners[1].x * clampAlpha,
      y: prevCorners[1].y * (1 - clampAlpha) + newCorners[1].y * clampAlpha,
    },
    {
      x: prevCorners[2].x * (1 - clampAlpha) + newCorners[2].x * clampAlpha,
      y: prevCorners[2].y * (1 - clampAlpha) + newCorners[2].y * clampAlpha,
    },
    {
      x: prevCorners[3].x * (1 - clampAlpha) + newCorners[3].x * clampAlpha,
      y: prevCorners[3].y * (1 - clampAlpha) + newCorners[3].y * clampAlpha,
    },
  ];
}

/**
 * Derives a smooth 4-corner portal geometry from two tracked hand L-shapes.
 */
export function computePortalGeometry(
  hand1?: HandLandmarks,
  hand2?: HandLandmarks,
  imageWidth = 1280,
  imageHeight = 720,
): PortalGeometry | null {
  if (!hand1 || !hand2) return null;

  const g1 = isLShapeGesture(hand1);
  const g2 = isLShapeGesture(hand2);

  if (!g1.isLShape || !g2.isLShape || !g1.cornerPoint || !g2.cornerPoint) {
    return null;
  }

  const p1 = { x: g1.cornerPoint.x * imageWidth, y: g1.cornerPoint.y * imageHeight };
  const p2 = { x: g2.cornerPoint.x * imageWidth, y: g2.cornerPoint.y * imageHeight };

  // Determine top-left and bottom-right based on spatial coordinates
  const minX = Math.min(p1.x, p2.x);
  const maxX = Math.max(p1.x, p2.x);
  const minY = Math.min(p1.y, p2.y);
  const maxY = Math.max(p1.y, p2.y);

  const width = Math.max(20, maxX - minX);
  const height = Math.max(20, maxY - minY);

  const corners: PortalCorners = [
    { x: minX, y: minY }, // TL
    { x: maxX, y: minY }, // TR
    { x: maxX, y: maxY }, // BR
    { x: minX, y: maxY }, // BL
  ];

  const center: Point = {
    x: minX + width / 2,
    y: minY + height / 2,
  };

  const confidence = (g1.confidence + g2.confidence) / 2;

  return {
    corners,
    center,
    width,
    height,
    rotationDeg: 0,
    aspectRatio: width / height,
    isActive: true,
    confidence,
  };
}

/**
 * Standard ray-casting test for point in polygon.
 */
export function pointInsidePolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Computes soft feathered blending opacity in [0.0, 1.0].
 * 1.0 = deep inside portal (100% styled AI).
 * 0.0 = outside portal (100% raw camera feed).
 * Linear or smooth-step gradient along the boundary defined by featherPx.
 */
export function calculateFeatheredOpacity(
  point: Point,
  corners: PortalCorners,
  featherPx = 20,
): number {
  const minX = corners[0].x;
  const maxX = corners[1].x;
  const minY = corners[0].y;
  const maxY = corners[2].y;

  // Signed distance to the rectangular boundary (negative inside, positive outside)
  const dx = Math.max(minX - point.x, point.x - maxX);
  const dy = Math.max(minY - point.y, point.y - maxY);
  const distOutside = Math.max(dx, dy);

  if (distOutside >= featherPx) {
    return 0.0;
  }
  if (distOutside <= -featherPx) {
    return 1.0;
  }

  // Smooth Hermite interpolation between -featherPx and +featherPx
  const t = (distOutside - (-featherPx)) / (2 * featherPx);
  const clamped = Math.max(0, Math.min(1, t));
  // Invert because inside (t=0) should have opacity 1
  return 1 - clamped * clamped * (3 - 2 * clamped);
}
