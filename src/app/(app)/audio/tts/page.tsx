import { TtsStudio } from "@/components/audio-suite/tts-studio";
import { getAudioWorkspaceData } from "@/lib/audio/queries";

export default async function TtsPage() {
  const data = await getAudioWorkspaceData();
  return <TtsStudio voices={data.voices} jobs={data.jobs.filter((job) => job.kind === "tts")} setupPending={data.setupPending} providerMessage={data.provider.message} />;
}
