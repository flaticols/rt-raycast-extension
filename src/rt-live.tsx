import { showHUD } from "@raycast/api";
import fetch from "node-fetch";
import { streamLive } from "./utils";

const NEWS_BASE_URL = "https://news.radio-t.com/api/v1";

interface ShowStart {
  started: string;
}


export default async function Command() {
  try {
    const response = await fetch(`${NEWS_BASE_URL}/show/start`);
    const data: ShowStart = await response.json();

    const now = new Date();
    const startDate = new Date(data.started);
    const isLive = now >= startDate && now < new Date(startDate.getTime() + 3 * 60 * 60 * 1000); // Assume show lasts 3 hours

    if (!isLive) {
      await showHUD("Live: Saturday at 22:00 UTC");
      return;
    }

    const streamId = await streamLive();
    if (streamId) {
      await showHUD("Now streaming Radio-T live");
    } else {
      await showHUD("Failed to start live stream");
    }
  } catch (error) {
    console.error("Error in command:", error);
    await showHUD("Error: Failed to check show status or start live stream");
  }
}