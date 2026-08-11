import { TtsStudio } from "@/components/audio-suite/tts-studio";
import { getAudioWorkspaceData } from "@/lib/audio/queries";

export default async function TtsPage({ searchParams }: { searchParams: Promise<{ prompt?: string }> }) {
  const [{ prompt }, data] = await Promise.all([searchParams, getAudioWorkspaceData()]);
  return <TtsStudio voices={data.voices} jobs={data.jobs.filter((job) => job.kind === "tts")} setupPending={data.setupPending} providerMessage={data.provider.message} initialScript={typeof prompt === "string" ? prompt : ""} />;
}
