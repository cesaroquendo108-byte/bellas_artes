#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, globSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import process from "node:process";

const projectRoot = resolve(dirname(new URL(import.meta.url).pathname), "..");
const requirements = readJson(join(projectRoot, "infra/models/model-runtime-requirements.json"));
const installState = readJson(join(projectRoot, "infra/models/model-install-state.json"));
const vaultPlan = readJson(join(projectRoot, "infra/models/model-vault.json"));
const args = new Set(process.argv.slice(2));
const roots = rootsFromArgs(process.argv.slice(2));

const requirementIds = requirements.models.map((model) => model.id);
const plannedIds = vaultPlan.models.map((model) => model.id);
const stateIds = Object.keys(installState.models);
const catalogErrors = [
  ...setDifference(requirementIds, plannedIds).map((id) => `runtime-sin-vault:${id}`),
  ...setDifference(plannedIds, requirementIds).map((id) => `vault-sin-runtime:${id}`),
  ...setDifference(requirementIds, stateIds).map((id) => `runtime-sin-estado:${id}`),
  ...setDifference(stateIds, requirementIds).map((id) => `estado-sin-runtime:${id}`),
];

const models = requirements.models.map((requirement) => auditModel(requirement, roots));
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  roots,
  summary: {
    total: models.length,
    manifestPresent: models.filter((model) => model.manifest.present).length,
    artifactsPresent: models.filter((model) => model.artifacts.ready).length,
    workflowReady: models.filter((model) => model.workflow.ready).length,
    adapterReady: models.filter((model) => model.adapter.ready).length,
    nativeAdapterReady: models.filter((model) => model.engine === "native-api" && model.adapter.ready).length,
    codeReady: models.filter((model) => model.codeReady).length,
    componentArtifactsReady: models.filter((model) => model.engine === "component" && model.artifacts.ready).length,
    commercialEligible: models.filter((model) => ["eligible", "gated", "territory_gated", "consent_gated"].includes(model.commercialPolicy)).length,
    researchOnly: models.filter((model) => model.commercialPolicy === "research_only").length,
    replaced: models.filter((model) => model.commercialPolicy === "replaced").length,
    incompleteCacheFiles: models.reduce((total, model) => total + model.incompleteCacheFiles.length, 0),
    catalogErrors: catalogErrors.length,
  },
  catalogErrors,
  models,
};

if (args.has("--markdown")) process.stdout.write(renderMarkdown(report));
else process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

if (args.has("--strict") && (catalogErrors.length || models.some((model) => model.integrityErrors.length))) {
  process.exitCode = 1;
}

function auditModel(requirement, vaultRoots) {
  const located = locateModel(requirement.id, vaultRoots);
  const manifestPath = vaultRoots
    .map((root) => join(root, "manifests", `${requirement.id}.json`))
    .find(existsSync);
  const manifest = manifestPath ? readJson(manifestPath) : null;
  const missingArtifacts = located
    ? requirement.requiredArtifacts.filter((relativePath) => !artifactExists(join(located.root, requirement.id), relativePath))
    : [...requirement.requiredArtifacts];
  const workflowVersions = requirement.workflowVersions.map((version) => {
    const path = join(projectRoot, "workflows", `${version}.json`);
    return { version, path: relativeToProject(path), validApiGraph: existsSync(path) && isApiGraph(readJson(path)) };
  });
  const incompleteCacheFiles = located ? findIncompleteCacheFiles(join(located.root, requirement.id)) : [];
  const integrityErrors = [];
  if (!manifest) integrityErrors.push("manifest-missing");
  if (manifest && manifest.modelId !== requirement.id) integrityErrors.push("manifest-model-id");
  if (missingArtifacts.length) integrityErrors.push("required-artifacts-missing");
  const workflowReady = requirement.workflowVersions.length > 0 && workflowVersions.every((workflow) => workflow.validApiGraph);
  const adapterReady = requirement.engine === "comfyui-api"
    ? workflowReady
    : requirement.engine === "native-api"
      ? requirement.workflowVersions.length > 0 && existsSync(join(projectRoot, "src/lib/generation/providers/native-http.ts"))
      : requirement.engine === "component" && missingArtifacts.length === 0;
  const executablePolicy = !["research_only", "replaced"].includes(requirement.commercialPolicy);
  return {
    id: requirement.id,
    engine: requirement.engine,
    hardwareProfile: requirement.hardwareProfile,
    commercialPolicy: requirement.commercialPolicy,
    declaredInstallState: installState.models[requirement.id]?.state ?? "missing",
    vaultRoot: located?.root ?? null,
    manifest: manifest ? {
      present: true,
      status: manifest.status ?? null,
      finishedAt: manifest.finishedAt ?? null,
      bytes: manifest.bytes ?? null,
      files: Array.isArray(manifest.files) ? manifest.files.length : 0,
      sha256: sha256(readFileSync(manifestPath)),
    } : { present: false },
    artifacts: { ready: missingArtifacts.length === 0, missing: missingArtifacts },
    workflow: { ready: workflowReady, versions: workflowVersions },
    adapter: { ready: adapterReady, kind: requirement.engine === "native-api" ? "native-http-v1" : requirement.engine },
    incompleteCacheFiles,
    integrityErrors,
    codeReady: integrityErrors.length === 0
      && executablePolicy
      && requirement.engine !== "none"
      && requirement.engine !== "component"
      && workflowReady,
  };
}

function locateModel(id, vaultRoots) {
  for (const root of vaultRoots) {
    if (existsSync(join(root, id))) return { root };
  }
  return null;
}

function artifactExists(modelRoot, artifact) {
  if (!artifact.includes("*")) return existsSync(join(modelRoot, artifact));
  return globSync(artifact, { cwd: modelRoot, nodir: true }).length > 0;
}

function findIncompleteCacheFiles(modelRoot) {
  const weightsRoot = join(modelRoot, "weights");
  if (!existsSync(weightsRoot)) return [];
  const files = [];
  for (const packageEntry of readdirSync(weightsRoot, { withFileTypes: true })) {
    if (!packageEntry.isDirectory()) continue;
    const downloadRoot = join(weightsRoot, packageEntry.name, ".cache", "huggingface", "download");
    if (existsSync(downloadRoot)) walkIncomplete(downloadRoot, modelRoot, files);
  }
  return files.sort();
}

function walkIncomplete(directory, modelRoot, files) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walkIncomplete(path, modelRoot, files);
    else if (entry.name.endsWith(".incomplete") || entry.name.endsWith(".partial")) files.push(relative(modelRoot, path));
  }
}

function rootsFromArgs(argv) {
  const roots = [];
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--root" && argv[index + 1]) roots.push(resolve(argv[index + 1]));
  }
  if (roots.length) return roots;
  return ["/mnt/cesar/BellasArtes_ModelVault", "/mnt/disco_500gb/BellasArtes_ModelVault"].filter(existsSync);
}

function isApiGraph(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const entries = Object.entries(value);
  return entries.length > 0 && entries.every(([nodeId, node]) => nodeId.trim()
    && node && typeof node === "object" && !Array.isArray(node)
    && typeof node.class_type === "string" && node.class_type.trim()
    && node.inputs && typeof node.inputs === "object" && !Array.isArray(node.inputs));
}

function renderMarkdown(reportValue) {
  const lines = [
    "# Auditoría del runtime de modelos",
    "",
    `Generada: ${reportValue.generatedAt}`,
    "",
    `- Paquetes: ${reportValue.summary.total}`,
    `- Manifests presentes: ${reportValue.summary.manifestPresent}`,
    `- Artefactos mínimos presentes: ${reportValue.summary.artifactsPresent}`,
    `- Workflows API completos: ${reportValue.summary.workflowReady}`,
    `- Transportes/adaptadores presentes: ${reportValue.summary.adapterReady}`,
    `- Modelos nativos cubiertos por native-http-v1: ${reportValue.summary.nativeAdapterReady}`,
    `- Paquetes listos en código según artefactos, workflow y política: ${reportValue.summary.codeReady}`,
    `- Archivos de caché incompletos: ${reportValue.summary.incompleteCacheFiles}`,
    "",
    "| Modelo | Motor | GPU | Política | Artefactos | Adaptador | Workflow API | Código listo |",
    "|---|---|---:|---|---|---|---|---|",
  ];
  for (const model of reportValue.models) {
    lines.push(`| ${model.id} | ${model.engine} | ${model.hardwareProfile} | ${model.commercialPolicy} | ${model.artifacts.ready ? "sí" : "no"} | ${model.adapter.ready ? "sí" : "no"} | ${model.workflow.ready ? "sí" : "no"} | ${model.codeReady ? "sí" : "no"} |`);
  }
  if (reportValue.catalogErrors.length) lines.push("", "## Errores de catálogo", "", ...reportValue.catalogErrors.map((error) => `- ${error}`));
  return `${lines.join("\n")}\n`;
}

function setDifference(left, right) {
  const rightSet = new Set(right);
  return [...new Set(left)].filter((value) => !rightSet.has(value));
}

function relativeToProject(path) {
  return path.startsWith(`${projectRoot}/`) ? path.slice(projectRoot.length + 1) : path;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
