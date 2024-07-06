import { useFetch } from "@raycast/utils";
import { Article, Episode, ShowLive, ShowStart } from "./types";
import "node-fetch";
import { useState } from "react";

export const BASE_URL = "https://radio-t.com/site-api";
export const NEWS_BASE_URL = "https://news.radio-t.com/api/v1";

export async function useLastEpisodes(limit: number) {
  return useFetch<Episode[]>(`${BASE_URL}/last/${limit}`, {
    method: "GET"
  });
}

export function useShowStatus() {
  const [isLive, setIsLive] = useState(false);

  const { data: showStartInfo, isLoading: isShowStartInfoLoading } = useFetch<ShowStart, ShowStart, ShowLive>(
    `${NEWS_BASE_URL}/show/start`,
    {
      method: "GET",
      parseResponse: (response): Promise<ShowStart> => response.json(),
      mapResult: (result: ShowStart): { data: ShowLive } => {
        const startTime = new Date(result.started);
        const now = new Date();
        const differenceInMinutes = (now.getTime() - startTime.getTime()) / (60 * 1000);
        const isLive = differenceInMinutes >= 0 && differenceInMinutes <= 300; // 5 hours in minutes
        setIsLive(isLive);
        return {
          data: {
            started: startTime,
            isLive: isLive,
            differenceInMinutes: differenceInMinutes
          }
        };
      }
    }
  );

  const { data: activeNews, isLoading: isActiveNewsLoading } = useFetch<Article>(
    `${NEWS_BASE_URL}/news/active`,
    {
      method: "GET",
      execute: isLive,
      keepPreviousData: true
    }
  );

  const isLoading = isShowStartInfoLoading || (isLive && isActiveNewsLoading);

  return { isLoading, isLive, activeNews, showStartInfo };
}
