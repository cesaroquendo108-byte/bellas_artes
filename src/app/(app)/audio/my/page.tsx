import { AudioLibrary } from "@/components/audio-suite/audio-library";
import { getAudioWorkspaceData } from "@/lib/audio/queries";

export default async function AudioLibraryPage() {
  const data = await getAudioWorkspaceData();
  return <AudioLibrary jobs={data.jobs} assets={data.assets} setupPending={data.setupPending} providerMessage={data.provider.message} />;
}
