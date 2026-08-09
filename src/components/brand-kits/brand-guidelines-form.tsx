import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
export function BrandGuidelinesForm({
  guidelines,
  negativePrompt,
  onGuidelinesChange,
  onNegativePromptChange,
}: {
  guidelines: string;
  negativePrompt: string;
  onGuidelinesChange: (value: string) => void;
  onNegativePromptChange: (value: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <Label>Guías de marca</Label>
        <Textarea
          value={guidelines}
          onChange={(event) => onGuidelinesChange(event.target.value)}
          placeholder="Contraste alto, composición editorial, evitar colores pastel…"
          className="mt-2 min-h-40 bg-[#18181b]"
        />
      </div>
      <div>
        <Label>Descripción negativa global</Label>
        <Textarea
          value={negativePrompt}
          onChange={(event) => onNegativePromptChange(event.target.value)}
          placeholder="Elementos que nunca deben aparecer…"
          className="mt-2 min-h-28 bg-[#18181b]"
        />
      </div>
    </div>
  );
}
