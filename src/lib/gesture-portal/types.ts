export interface Point {
  x: number;
  y: number;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface HandKeypoint {
  x: number;
  y: number;
  z?: number;
}

export type HandLandmarks = HandKeypoint[];

export type PortalCorners = [Point, Point, Point, Point]; // TL, TR, BR, BL

export interface PortalGeometry {
  corners: PortalCorners;
  center: Point;
  width: number;
  height: number;
  rotationDeg: number;
  aspectRatio: number;
  isActive: boolean;
  confidence: number;
}

export type PortalStyleId =
  | "anime"
  | "doodle"
  | "painted_3d"
  | "noir_thriller"
  | "claymation"
  | "paper_cutout"
  | "halftone_press"
  | "cyberpunk"
  | "fiduciary_anchor";

export interface PortalStyleConfig {
  id: PortalStyleId;
  name: string;
  description: string;
  positivePrompt: string;
  negativePrompt: string;
  cfgScale: number;
  denoiseStrength: number;
  steps: number;
}

export interface AsyncQueueMetrics {
  inFlight: boolean;
  hasPending: boolean;
  droppedFrames: number;
  processedFrames: number;
  averageLatencyMs: number;
  effectiveFps: number;
}

export interface FramePayload {
  id: string;
  timestampMs: number;
  dataBase64?: string;
  geometry?: PortalGeometry;
}
