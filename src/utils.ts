import { LaunchType, environment, showHUD, showToast, Toast, launchCommand, LocalStorage } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { Episode } from "./api/types";

function getLocale() {
  return "en-NL";
}

export const timeFormatter = new Intl.DateTimeFormat(getLocale(), {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  timeZone: "UTC"
});

export const dateFormatter = new Intl.DateTimeFormat(getLocale(), {
  dateStyle: "short"
});

export const RT_IS_PLAYING_KEY = "rt-playing:playing";
export const RT_PLAYING_TYPE_KEY = "rt-playing";
export const RT_PLAYING_EPISODE_KEY = "rt-playing:episode";
export const RT_PLAYING_LIVE_KEY = "rt-playing:live";
export const RT_PLAYING_NOTHING_KEY = "rt-playing:nothing";

export const RT_STREAM_ID_KEY = "rt-episode-name";
export const RT_EPISODE_KEY = "rt-episode";

/**
 * Streams a specific episode.
 * @param {Episode} e - The episode to stream.
 * @returns {Promise<string | undefined>} A promise that resolves to the stream ID or undefined if streaming fails.
 */
export async function streamEpisode(e: Episode) {
  try {
    const streamID = await stream(e.audio_url);

    if (streamID === undefined) {
      console.error("streamID is undefined");
      await showToast({ title: "Failed to stream episode", style: Toast.Style.Failure });
      return;
    }

    await LocalStorage.setItem(RT_IS_PLAYING_KEY, true);
    await LocalStorage.setItem(RT_PLAYING_TYPE_KEY, RT_PLAYING_EPISODE_KEY);
    await LocalStorage.setItem(RT_STREAM_ID_KEY, streamID);
    await LocalStorage.setItem(RT_EPISODE_KEY, JSON.stringify(e));

    return streamID;
  } catch (error) {
    console.error("Error in streamEpisode:", error);
    await showToast({ title: "Error: Failed to stream episode", style: Toast.Style.Failure });
  }
}

/**
 * Streams live content.
 * @returns {Promise<string | undefined>} A promise that resolves to the stream ID or undefined if streaming fails.
 */
export async function streamLive() {
  const streamID = await stream("https://stream.radio-t.com");

  if (streamID == undefined) {
    await showToast({ title: "Failed to stream live", style: Toast.Style.Failure });
    return;
  }

  await LocalStorage.setItem(RT_IS_PLAYING_KEY, true);
  await LocalStorage.setItem(RT_PLAYING_TYPE_KEY, RT_PLAYING_LIVE_KEY);
  await LocalStorage.setItem(RT_STREAM_ID_KEY, streamID);
  await LocalStorage.removeItem(RT_EPISODE_KEY);

  return streamID;
}

/**
 * Streams audio from a given URL using the Music app.
 * @param {string} audioUrl - The URL of the audio to stream.
 * @returns {Promise<string | undefined>} A promise that resolves to the stream ID or undefined if streaming fails.
 */
export async function stream(audioUrl: string): Promise<string | undefined> {
  try {
    await stop();

    const result = await runAppleScript(`try
        tell application "Music"
          launch
          tell application "System Events"
            repeat while "Music" is not in (name of every process whose background only is false)
              delay 0.5
            end repeat
          end tell

          try
            set trackIDs to get id of URL tracks
            open location "${audioUrl}"
            repeat with newID in (get id of URL tracks)
                if newID is not in trackIDs then
                    set theStream to track id newID
                    set name of theStream to "Radio-T: ${audioUrl}"
                    return contents of newID
                end if
            end repeat
          on error
            open location "${audioUrl}"
            delay 0.5
            try
              set name of URL track 1 to "Radio-T: ${audioUrl}"
              return id of URL track 1
            on error
              return ""
            end try
          end try
        end tell
      on error
        return "err:noapp"
      end try`, {
      parseOutput: (output) => {
        if (output.exitCode !== 0) {
          throw new Error(`AppleScript exited with code ${output.exitCode}: ${output.stderr}`);
        }
        return output.stdout.trim();
      }
    });

    console.log("result", result);

    if (result.startsWith("err:")) {
      if (result === "err:noapp") {
        const errorMessage = "Error: Music Application Not Found!";
        await showHUD(errorMessage);
      } else {
        await showToast({ title: `Error: ${result.substring(4)}`, style: Toast.Style.Failure });
      }
      return undefined;
    }

    return result;
  } catch (error) {
    console.error("AppleScript execution error:", error);
    await showToast({ title: "Error: Failed to start streaming", style: Toast.Style.Failure });
    return undefined;
  }
}

/**
 * Plays the currently loaded track in the Music app.
 * @returns {Promise<void>}
 */
export async function play() {
  const trackID = await LocalStorage.getItem(RT_STREAM_ID_KEY);
  await LocalStorage.setItem(RT_IS_PLAYING_KEY, true);

  try {
    await runAppleScript(`tell application "Music"
        try
          play (first track whose id is "${trackID}")
        on error errMsg
          return "err:" & errMsg
        end try
      end tell`);
  } catch (error) {
    console.error("Failed to play track:", error);
    await showToast({ title: "Error: Failed to play track", style: Toast.Style.Failure });
  }
}

/**
 * Pauses the currently playing track in the Music app.
 * @returns {Promise<void>}
 */
export async function pause() {
  await LocalStorage.setItem(RT_IS_PLAYING_KEY, false);
  await runAppleScript(`tell application "Music"
        pause
      end tell`);
}

/**
 * Stops playback and removes the current track from the Music app.
 * @returns {Promise<void>}
 */
export async function stop() {
  const trackID = await LocalStorage.getItem(RT_STREAM_ID_KEY);
  await LocalStorage.setItem(RT_IS_PLAYING_KEY, false);
  await LocalStorage.setItem(RT_PLAYING_TYPE_KEY, RT_PLAYING_NOTHING_KEY);

  try {
    await runAppleScript(`
      tell application "Music"
        try
          set trackToDelete to (first track whose id is "${trackID}")
          delete trackToDelete
        on error
          -- Ignore error if track doesn't exist
        end try
        stop
      end tell
    `, {
      parseOutput: (output) => {
        if (output.exitCode !== 0) {
          throw new Error(`Failed to stop: ${output.stderr}`);
        }
      }
    });
  } catch (error) {
    console.error("Failed to stop playback:", error);
    await showToast({ title: "Error: Failed to stop playback", style: Toast.Style.Failure });
  }
}