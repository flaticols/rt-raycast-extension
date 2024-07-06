import { Action, ActionPanel, List, LocalStorage, launchCommand, LaunchType } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Episode, TimeLabel } from "./api/types";
import { streamEpisode } from "./utils";
import { useCallback, useState, useEffect } from "react";
import { BASE_URL } from "./api/client";
import { RT_PLAYING_TYPE_KEY, RT_PLAYING_EPISODE_KEY, RT_EPISODE_KEY } from "./utils";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

function formatTimeOffset(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return [hours, minutes, remainingSeconds]
    .map(val => val.toString().padStart(2, "0"))
    .join(":");
}

function calculateTopicStartTimes(timeLabels: TimeLabel[]): string[] {
  let cumulativeDuration = 0;
  return timeLabels.map(label => {
    const startTime = formatTimeOffset(cumulativeDuration);
    cumulativeDuration += label.duration;
    return startTime;
  });
}

function trimTopicTitle(title: string, maxLength: number = 45): string {
  if (title.length <= maxLength) {
    return title;
  }
  return title.substring(0, maxLength - 3) + "...";
}

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric"
});

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return dateFormatter.format(date).replace(/\//g, ".");
}


export default function Command() {
  const [searchText, setSearchText] = useState("");
  const debouncedSearchText = useDebounce(searchText, 300);

  const { data: episodes, isLoading } = useFetch<Episode[]>(
    `${BASE_URL}/search?q=${encodeURIComponent(debouncedSearchText)}&limit=9`,
    {
      keepPreviousData: true,
      execute: debouncedSearchText.length > 0
    }
  );

  const { data: latestEpisodes, isLoading: isLoadingLatest } = useFetch<Episode[]>(
    `${BASE_URL}/last/9`,
    {
      keepPreviousData: true,
      execute: debouncedSearchText.length === 0
    }
  );

  const search = useCallback((query: string) => {
    setSearchText(query);
  }, []);

  const handleEpisodeSelection = async (episode: Episode) => {
    await streamEpisode(episode);
    await LocalStorage.setItem(RT_PLAYING_TYPE_KEY, RT_PLAYING_EPISODE_KEY);
    await LocalStorage.setItem(RT_EPISODE_KEY, JSON.stringify(episode));
  };

  const displayedEpisodes = debouncedSearchText.length > 0 ? episodes : latestEpisodes;

  return (
    <List
      isLoading={isLoading || isLoadingLatest}
      onSearchTextChange={search}
      searchBarPlaceholder="Search episodes..."
      throttle
      isShowingDetail
    >
      {(displayedEpisodes ?? []).map((episode) => renderEpisodeRow(episode, handleEpisodeSelection))}
    </List>
  );
}

function renderEpisodeRow(e: Episode, onSelect: (episode: Episode) => void) {
  const accessories: List.Item.Accessory[] = [];

  accessories.push({
    text: { value: formatDate(e.date) }
  });

  const topicStartTimes = calculateTopicStartTimes(e.time_labels);

  return (
    <List.Item
      key={e.file_name}
      id={e.url}
      title={e.title}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Topics" />
              <List.Item.Detail.Metadata.Separator />

              {e.time_labels.map((label, index) => (
                <List.Item.Detail.Metadata.Label
                  key={`${label.topic}-${index}`}
                  title={trimTopicTitle(label.topic)}
                  text={topicStartTimes[index]}
                />
              ))}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action
            title="Play"
            onAction={() => onSelect(e)}
          />

          <Action.OpenInBrowser
            title="Open in Browser"
            url={e.url}
          />
        </ActionPanel>
      }
      accessories={accessories}
    />
  );
}