import { environment, LaunchType, LocalStorage, showToast } from "@raycast/api";
import { stop, RT_STREAM_ID_KEY } from "./utils";

export default async function Command() {
    const trackID = await LocalStorage.getItem(RT_STREAM_ID_KEY);
    
    await stop();
    
    if (trackID && trackID != "") {
        if (environment.launchType == LaunchType.UserInitiated) {
            await showToast({ title: "Stopped Playing" });
        }
    }
}