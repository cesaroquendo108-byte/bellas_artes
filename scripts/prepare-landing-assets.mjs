import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const sourcePath = process.argv[2];
if (!sourcePath) {
  throw new Error("Usage: node scripts/prepare-landing-assets.mjs <reference-markdown>");
}

const selections = [
  ["image_-EQsdk0u", "hero-director"],
  ["image_X3b0ngBP", "template-music-video"],
  ["image_CM1nXcB", "template-product-ad"],
  ["image_66bog3Yc", "template-ad-remake"],
  ["image_PsMBXGu1", "template-social"],
  ["image_FxcHHMQ", "template-ugc"],
  ["image_u6LhAbd2", "template-micro-drama"],
  ["image_xLx6Fatx", "template-brand-film"],
  ["image_MsxVHXIc", "template-explainer"],
  ["image_oSSe714A", "template-trailer"],
  ["image_GfcFA9_m", "capability-image"],
  ["image_xipRGNqK", "capability-video"],
  ["image_TF9nhVdU", "capability-audio"],
  ["image_Y3N965sJ", "capability-character"],
];

const markdown = await readFile(sourcePath, "utf8");
const urls = markdown.match(/https:\/\/[^\s)`]+/g) ?? [];
const outputDir = path.resolve("public/landing");
await mkdir(outputDir, { recursive: true });

const manifest = [];
for (const [sourceKey, outputKey] of selections) {
  const url = urls.find((candidate) => candidate.includes(sourceKey));
  if (!url) throw new Error(`Missing source asset: ${sourceKey}`);

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Asset download failed (${response.status}): ${sourceKey}`);
  const input = Buffer.from(await response.arrayBuffer());
  const pipeline = sharp(input).rotate().resize({ width: 1200, height: 900, fit: "inside", withoutEnlargement: true });
  const metadata = await pipeline.metadata();
  const filename = `${outputKey}.webp`;
  const destination = path.join(outputDir, filename);
  await pipeline.webp({ quality: 78, effort: 5 }).toFile(destination);

  manifest.push({
    key: outputKey,
    path: `/landing/${filename}`,
    width: metadata.width,
    height: metadata.height,
    sourceKey,
    provenance: "reference-pack:user-confirmed",
  });
}

await writeFile(
  path.join(outputDir, "manifest.json"),
  `${JSON.stringify({ version: 1, assets: manifest }, null, 2)}\n`,
  "utf8",
);
