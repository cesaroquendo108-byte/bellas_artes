import { describe, expect, it } from "vitest";
import { PromptContextMemory } from "./context-memory";

describe("PromptContextMemory Engine (GOAT'd Architecture)", () => {
  it("initializes a new context session with default limits", () => {
    const memory = new PromptContextMemory();
    const session = memory.getOrCreateSession("sess_001");
    expect(session.sessionId).toBe("sess_001");
    expect(session.turns).toHaveLength(0);
    expect(session.maxTurns).toBe(10);
  });

  it("records turns and preserves persistent subjects", () => {
    const memory = new PromptContextMemory();
    const turn = memory.recordTurn("sess_002", {
      userInstruction: "Un plano medio de César presentando la bolsa",
      targetModel: "minimax-h3",
      generatedPrompt: "Plano cinematografico en 4k con iluminacion calida",
      subjects: {
        "Subject 1": "Cesar Oquendo con traje oscuro",
      },
    });

    expect(turn.id).toBeDefined();
    expect(turn.estimatedTokens).toBeGreaterThan(0);

    const summary = memory.buildContextSummary("sess_002");
    expect(summary).toContain("Cesar Oquendo con traje oscuro");
    expect(summary).toContain("Turnos: 1");
  });

  it("prunes turns sliding window when exceeding maxTurns limit", () => {
    const memory = new PromptContextMemory();
    const session = memory.getOrCreateSession("sess_003", { maxTurns: 3 });

    for (let i = 1; i <= 5; i++) {
      memory.recordTurn("sess_003", {
        userInstruction: `Peticion turno ${i}`,
        targetModel: "flux-schnell",
        generatedPrompt: `Prompt generado turno ${i}`,
      });
    }

    expect(session.turns).toHaveLength(3);
    expect(session.turns[0].userInstruction).toBe("Peticion turno 3");
    expect(session.turns[2].userInstruction).toBe("Peticion turno 5");
  });

  it("formats MiniMax H3 prompt with canonical REF2VA syntax", () => {
    const memory = new PromptContextMemory();
    const formatted = memory.formatWithModelGuide(
      "minimax-h3",
      "César camina por la sala de operaciones bancarias con paso seguro.",
      {
        dialogue: "Los fundamentales financieros nunca mienten.",
        subjects: {
          "Subject 1": "Cesar Oquendo",
          "Subject 2": "Terminal de Bloomberg",
        },
      },
    );

    expect(formatted).toContain("subject_definitions:");
    expect(formatted).toContain("<Subject 1> is Cesar Oquendo");
    expect(formatted).toContain("<Subject 2> is Terminal de Bloomberg");
    expect(formatted).toContain("Los fundamentales financieros nunca mienten.");
    expect(formatted).toContain("overall_soundscape:");
    expect(formatted).toContain("non_diegetic_music:\nN/A. No music.");
  });
});
