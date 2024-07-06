import { environment, LaunchType, LocalStorage, showToast } from "@raycast/api";
import { pause, play, RT_IS_PLAYING_KEY, RT_STREAM_ID_KEY } from "./utils";

export default async function Command() {
  const trackID = await LocalStorage.getItem(RT_STREAM_ID_KEY);
  const isPLaying = await LocalStorage.getItem(RT_IS_PLAYING_KEY);

  if (isPLaying) {
    await pause();
  } else {
    await play();
  }


  if (trackID && trackID != "") {
    if (environment.launchType == LaunchType.UserInitiated) {
      await showToast({ title: isPLaying ? "Playback paused" : "Playback resumed" });
    }
  }
}