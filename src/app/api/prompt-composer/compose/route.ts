import { NextResponse } from "next/server";
import {
  composePrompt,
  composeFromPreset,
  buildComfyPromptComposerNodeInput,
} from "@/lib/prompt-composer/composer";
import type { ComposeOptions, PromptSection } from "@/lib/prompt-composer/types";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      sections?: PromptSection[];
      presetId?: string;
      options?: ComposeOptions;
      asComfyNode?: boolean;
    };

    if (!body.presetId && (!body.sections || !Array.isArray(body.sections))) {
      return NextResponse.json(
        {
          success: false,
          error: "Debe proporcionar una lista de secciones o un presetId válido.",
        },
        { status: 400 },
      );
    }

    const options: ComposeOptions = body.options || {};
    let result;

    if (body.presetId) {
      result = composeFromPreset(body.presetId, options);
    } else if (body.sections) {
      result = composePrompt(body.sections, options);
    } else {
      return NextResponse.json(
        { success: false, error: "Solicitud inválida" },
        { status: 400 },
      );
    }

    let comfyInput;
    if (body.asComfyNode && body.sections) {
      comfyInput = buildComfyPromptComposerNodeInput(
        body.sections,
        options.basePrompt || "",
        result.seedUsed,
      );
    }

    return NextResponse.json({
      success: true,
      result,
      comfyInput,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido al componer el prompt";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
