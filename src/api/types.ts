export type Episode = {
  url: string;
  title: string;
  date: string;
  categories: string[];
  image: string;
  file_name: string;
  body: string;
  show_notes: string;
  audio_url: string;
  time_labels: TimeLabel[];
  show_num: number;
};

export type Article = {
  title: string;
  content: string;
  snippet: string;
  pic: string;
  link: string;
  author: string;
  ts: string;
  ats: string;
  active: boolean;
  activets: string;
  geek: boolean;
  votes: number;
  del: boolean;
  archived: boolean;
  slug: string;
  feed: string;
  domain: string;
  comments: number;
  likes: number;
  show_num: number;
};

export type ShowStart = {
  started: string;
}

export type ShowLive = {
  started: Date;
  isLive: boolean;
  differenceInMinutes: number;
}

export type TimeLabel = {
  topic: string;
  time: string;
  duration: number;
};
