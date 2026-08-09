import { VideoAudioStudio } from "@/components/audio-suite/video-audio-studio";
import { getAudioWorkspaceData } from "@/lib/audio/queries";

export default async function VideoAudioPage() {
  const data = await getAudioWorkspaceData();
  return <VideoAudioStudio assets={data.assets} projects={data.projects} setupPending={data.setupPending} providerMessage={data.provider.message} />;
}
