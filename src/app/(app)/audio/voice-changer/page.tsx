import { VoiceChangerStudio } from "@/components/audio-suite/voice-changer-studio";
import { getAudioWorkspaceData } from "@/lib/audio/queries";

export default async function VoiceChangerPage() {
  const data = await getAudioWorkspaceData();
  return <VoiceChangerStudio voices={data.voices} setupPending={data.setupPending} providerMessage={data.provider.message} />;
}
