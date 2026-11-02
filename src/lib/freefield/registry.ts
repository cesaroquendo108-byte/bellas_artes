import fs from "node:fs";
import path from "node:path";
import type {
  FreefieldApp,
  FreefieldAppManifest,
  FreefieldInput,
  FreefieldSection,
  FreefieldWorkflowGraph,
} from "./types";

let cachedManifests: FreefieldAppManifest[] | null = null;
const cachedGraphs = new Map<string, FreefieldWorkflowGraph>();

export function getFreefieldAppsDir(): string {
  const directPath = path.join(process.cwd(), "workflows/freefield/apps");
  if (fs.existsSync(directPath)) return directPath;
  const fallbackPath = path.resolve(__dirname, "../../../workflows/freefield/apps");
  if (fs.existsSync(fallbackPath)) return fallbackPath;
  return directPath;
}

export function listFreefieldApps(): FreefieldAppManifest[] {
  if (cachedManifests) return cachedManifests;
  const appsDir = getFreefieldAppsDir();
  if (!fs.existsSync(appsDir)) return [];

  const entries = fs.readdirSync(appsDir, { withFileTypes: true });
  const manifests: FreefieldAppManifest[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(appsDir, entry.name, "app.json");
    if (!fs.existsSync(manifestPath)) continue;

    try {
      const content = fs.readFileSync(manifestPath, "utf-8");
      const manifest = JSON.parse(content) as FreefieldAppManifest;
      manifests.push(manifest);
    } catch {
      // Ignorar manifiestos con errores de sintaxis
    }
  }

  manifests.sort((a, b) => a.name.localeCompare(b.name));
  cachedManifests = manifests;
  return manifests;
}

export function getFreefieldApp(id: string): FreefieldApp | null {
  const manifests = listFreefieldApps();
  const manifest = manifests.find((item) => item.id === id);
  if (!manifest) return null;

  const appDir = path.join(getFreefieldAppsDir(), id);
  const workflowPath = path.join(appDir, manifest.workflow ?? "workflow.api.json");

  let graph: FreefieldWorkflowGraph | undefined;
  if (cachedGraphs.has(id)) {
    graph = structuredClone(cachedGraphs.get(id));
  } else if (fs.existsSync(workflowPath)) {
    try {
      const content = fs.readFileSync(workflowPath, "utf-8");
      const parsed = JSON.parse(content) as FreefieldWorkflowGraph;
      cachedGraphs.set(id, parsed);
      graph = structuredClone(parsed);
    } catch {
      // Error al leer grafo
    }
  }

  return {
    ...manifest,
    dir: appDir,
    graph,
  };
}

export function searchFreefieldApps(options?: {
  query?: string;
  section?: FreefieldSection;
  pack?: string;
}): FreefieldAppManifest[] {
  const apps = listFreefieldApps();
  const query = options?.query?.trim().toLowerCase();
  const section = options?.section;
  const pack = options?.pack;

  return apps.filter((app) => {
    if (section && app.section !== section) return false;
    if (pack && app.pack !== pack) return false;
    if (!query) return true;

    return (
      app.id.toLowerCase().includes(query) ||
      app.name.toLowerCase().includes(query) ||
      (app.summary && app.summary.toLowerCase().includes(query)) ||
      (app.higgsfield_feature && app.higgsfield_feature.toLowerCase().includes(query)) ||
      app.pack.toLowerCase().includes(query)
    );
  });
}

export function applyTemplate(
  template: string,
  values: Record<string, unknown>,
  selfValue: unknown,
): string {
  return template.replace(/\{([a-z][a-z0-9_]*)\}/gi, (_, key: string) => {
    if (key.toLowerCase() === "value") {
      return selfValue !== undefined && selfValue !== null ? String(selfValue) : "";
    }
    const val = values[key];
    return val !== undefined && val !== null ? String(val) : "";
  });
}

export function coerceInputValue(input: FreefieldInput, raw: unknown): unknown {
  if (raw === undefined || raw === null || raw === "") {
    if (input.default !== undefined) return input.default;
    if (input.type === "seed") return Math.floor(Math.random() * 2 ** 48);
    return undefined;
  }

  switch (input.type) {
    case "number":
    case "slider":
    case "seed": {
      const n = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(n)) {
        throw new Error(`El campo ${input.id} debe ser un número válido.`);
      }
      if (input.min !== undefined && n < input.min) {
        throw new Error(`El campo ${input.id} debe ser mayor o igual a ${input.min}.`);
      }
      if (input.max !== undefined && n > input.max) {
        throw new Error(`El campo ${input.id} debe ser menor o igual a ${input.max}.`);
      }
      return input.type === "seed" ? Math.trunc(n) : n;
    }
    case "toggle":
      return raw === true || raw === "true" || raw === "1" || raw === 1 || raw === "on";
    case "select": {
      if (input.options && input.options.length > 0) {
        const hit = input.options.find((o) => o.value === raw || String(o.value) === String(raw));
        if (!hit && input.required) {
          throw new Error(`El valor "${String(raw)}" no es una opción válida para ${input.id}.`);
        }
        return hit ? hit.value : raw;
      }
      return raw;
    }
    default:
      return raw;
  }
}

export function buildFreefieldWorkflow(
  appId: string,
  userValues: Record<string, unknown>,
): {
  app: FreefieldApp;
  prompt: FreefieldWorkflowGraph;
  resolvedValues: Record<string, unknown>;
} {
  const app = getFreefieldApp(appId);
  if (!app) {
    throw new Error(`La aplicación Freefield "${appId}" no existe en el catálogo.`);
  }
  if (!app.graph) {
    throw new Error(`La aplicación Freefield "${appId}" no tiene un grafo de ComfyUI disponible.`);
  }

  const prompt: FreefieldWorkflowGraph = structuredClone(app.graph);
  const resolvedValues: Record<string, unknown> = {};

  for (const input of app.inputs) {
    const raw = userValues[input.id];
    const coerced = coerceInputValue(input, raw);

    if (coerced === undefined) {
      if (input.required) {
        throw new Error(`El campo "${input.label || input.id}" es requerido.`);
      }
      continue;
    }

    resolvedValues[input.id] = coerced;

    if (input.options) {
      const selectedOption = input.options.find(
        (o) => o.value === coerced || String(o.value) === String(coerced),
      );
      if (selectedOption?.sets) {
        for (const setField of selectedOption.sets) {
          const targetNode = prompt[setField.node];
          if (targetNode) {
            targetNode.inputs[setField.field] = setField.value;
          }
        }
      }
    }

    if (input.bind && input.bind.length > 0) {
      for (const binding of input.bind) {
        const targetNode = prompt[binding.node];
        if (!targetNode) continue;

        let finalValue = coerced;
        if (binding.template) {
          finalValue = applyTemplate(binding.template, userValues, coerced);
        }

        targetNode.inputs[binding.field] = finalValue;
      }
    }
  }

  return {
    app,
    prompt,
    resolvedValues,
  };
}
