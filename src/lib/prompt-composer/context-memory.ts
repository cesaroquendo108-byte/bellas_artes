/**
 * Prompt Context Memory Engine.
 *
 * Inspirado en la arquitectura de memoria contextual de GOAT'd Text Generator
 * (ninjaGurung/ComfyUI-GOATd-Universal-Text-Generator).
 *
 * Permite preservar el contexto conversacional, los sujetos recurrentes y las
 * restricciones de estilo a lo largo de multiples iteraciones de generacion sin
 * perder la identidad del reparto ni sufrir desbordamiento de ventana de contexto.
 */

export type ModelTarget = "minimax-h3" | "qwen-2.1" | "wan-2.1" | "flux-dev" | "flux-schnell";

export interface ContextTurn {
  id: string;
  timestamp: number;
  userInstruction: string;
  targetModel: ModelTarget;
  generatedPrompt: string;
  negativePrompt?: string;
  estimatedTokens: number;
  persistentSubjects?: string[];
}

export interface ContextSessionOptions {
  maxTurns?: number;
  maxTokens?: number;
  systemGuidelines?: string;
}

export interface ContextSession {
  sessionId: string;
  createdAt: number;
  lastActiveAt: number;
  maxTurns: number;
  maxTokens: number;
  systemGuidelines: string;
  turns: ContextTurn[];
  activeSubjects: Map<string, string>; // e.g. "Subject 1" -> "Cesar Oquendo"
}

export class PromptContextMemory {
  private sessions: Map<string, ContextSession> = new Map();

  /**
   * Obtiene o inicializa una sesion con ventana deslizante de memoria.
   */
  public getOrCreateSession(
    sessionId: string,
    options?: ContextSessionOptions,
  ): ContextSession {
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = {
        sessionId,
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        maxTurns: options?.maxTurns ?? 10,
        maxTokens: options?.maxTokens ?? 4096,
        systemGuidelines:
          options?.systemGuidelines ??
          "Mantener fidelidad fiduciaria, consistencia de iluminacion cinematografica y CERO emojis.",
        turns: [],
        activeSubjects: new Map(),
      };
      this.sessions.set(sessionId, session);
    }
    return session;
  }

  /**
   * Estima de forma rapida el recuento de tokens (regla fiduciaria 1 token ~= 4 caracteres).
   */
  public estimateTokens(text: string): number {
    return Math.ceil(text.trim().length / 4);
  }

  /**
   * Registra un nuevo turno en la memoria y aplica poda por ventana de tokens.
   */
  public recordTurn(
    sessionId: string,
    input: {
      userInstruction: string;
      targetModel: ModelTarget;
      generatedPrompt: string;
      negativePrompt?: string;
      subjects?: Record<string, string>;
    },
  ): ContextTurn {
    const session = this.getOrCreateSession(sessionId);
    session.lastActiveAt = Date.now();

    if (input.subjects) {
      for (const [key, value] of Object.entries(input.subjects)) {
        session.activeSubjects.set(key, value);
      }
    }

    const tokenCount =
      this.estimateTokens(input.userInstruction) +
      this.estimateTokens(input.generatedPrompt) +
      (input.negativePrompt ? this.estimateTokens(input.negativePrompt) : 0);

    const turn: ContextTurn = {
      id: `turn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      userInstruction: input.userInstruction,
      targetModel: input.targetModel,
      generatedPrompt: input.generatedPrompt,
      negativePrompt: input.negativePrompt,
      estimatedTokens: tokenCount,
      persistentSubjects: input.subjects ? Object.keys(input.subjects) : undefined,
    };

    session.turns.push(turn);
    this.pruneSession(session);
    return turn;
  }

  /**
   * Poda turnos antiguos cuando se sobrepasa el maximo de turnos o de tokens.
   */
  private pruneSession(session: ContextSession): void {
    // 1. Limite de turnos
    while (session.turns.length > session.maxTurns) {
      session.turns.shift();
    }

    // 2. Limite de tokens acumulados
    let totalTokens = session.turns.reduce((acc, t) => acc + t.estimatedTokens, 0);
    while (totalTokens > session.maxTokens && session.turns.length > 1) {
      const removed = session.turns.shift();
      if (removed) {
        totalTokens -= removed.estimatedTokens;
      }
    }
  }

  /**
   * Genera el resumen contextual estructurado para guiar al modelo LLM.
   */
  public buildContextSummary(sessionId: string): string {
    const session = this.sessions.get(sessionId);
    if (!session || session.turns.length === 0) {
      return "Sin contexto previo registrado.";
    }

    const lines: string[] = [
      `Contexto Activo (Sesion: ${session.sessionId}, Turnos: ${session.turns.length}):`,
    ];

    if (session.activeSubjects.size > 0) {
      lines.push("Sujetos Fiduciarios Preservados:");
      for (const [subj, desc] of session.activeSubjects.entries()) {
        lines.push(`- <${subj}>: ${desc}`);
      }
      lines.push("");
    }

    lines.push("Historial Reciente:");
    for (let i = 0; i < session.turns.length; i++) {
      const t = session.turns[i];
      lines.push(
        `[Paso ${i + 1} - ${t.targetModel}] Peticion: "${t.userInstruction}" -> Resumen: ${t.generatedPrompt.slice(0, 120)}...`,
      );
    }

    return lines.join("\n");
  }

  /**
   * Formatea un prompt final inyectando las guias de sintaxis del modelo objetivo.
   */
  public formatWithModelGuide(
    modelTarget: ModelTarget,
    basePrompt: string,
    options?: {
      dialogue?: string;
      soundscape?: string;
      subjects?: Record<string, string>;
    },
  ): string {
    switch (modelTarget) {
      case "minimax-h3": {
        const lines: string[] = ["subject_definitions:"];
        if (options?.subjects && Object.keys(options.subjects).length > 0) {
          let idx = 1;
          for (const [, desc] of Object.entries(options.subjects)) {
            lines.push(`<Subject ${idx}> is ${desc}`);
            idx++;
          }
        } else {
          lines.push("<Subject 1> is the principal character from Picture 1.");
        }
        lines.push("");
        lines.push("summary:");
        lines.push(`[reference generation] ${basePrompt.slice(0, 200)}`);
        lines.push("");
        lines.push("retention_analysis:");
        lines.push("<Subject 1> appears throughout: preserve facial identity and proportions.");
        lines.push("");
        lines.push("detailed_description:");
        lines.push(basePrompt);
        if (options?.dialogue) {
          lines.push(`Diálogo: <d>[Spanish] ${options.dialogue}</d>`);
        }
        lines.push("");
        lines.push("overall_soundscape:");
        lines.push(options?.soundscape ?? "Quiet ambient room tone and realistic foley.");
        lines.push("");
        lines.push("non_diegetic_music:");
        lines.push("N/A. No music.");
        return lines.join("\n");
      }

      case "qwen-2.1":
      case "flux-dev":
      case "flux-schnell":
      case "wan-2.1":
      default:
        return basePrompt.trim();
    }
  }

  /**
   * Limpia o reinicia una sesion.
   */
  public clearSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }
}

// Instancia singleton compartida
export const globalPromptContextMemory = new PromptContextMemory();
