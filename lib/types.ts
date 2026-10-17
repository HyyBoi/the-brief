import type { Section } from "./sections";

export type TopicStats = Record<string, { a: number; b: number }>;

export type Profile = {
  user_id: string;
  display_name: string | null;
  dinner_answer: string | null;
  taste_summary: string | null;
  interest_vector: number[] | null;
  topic_stats: TopicStats;
  time_budget: number;
  onboarded: boolean;
  updated_at: string;
};

export type Article = {
  id: string;
  url: string;
  source: string;
  region: string;
  title: string;
  summary: string | null;
  snippet: string | null;
  section: Section | string | null;
  topics: string[];
  published_at: string;
  embedding: number[] | null;
  image_url?: string | null;
};

export type StorySize = "lead" | "major" | "standard" | "brief";

export type Story = {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  section: string;
  published_at: string;
  reason: string;
  explore: boolean;
  coverage: number;
  size: StorySize;
  image?: string | null;
};

export type QuizItem = { q: string; options: string[]; answer: number; ref: string };

export type EditionPayload = {
  date: string;
  number: number;
  reader: string;
  budget: number;
  note: string;
  bench: { motion: string; proposition: string; opposition: string } | null;
  quiz: QuizItem[];
  memo: string[];
  stories: Story[];
  stats: { candidates: number; sources: number; aiCalls: number; ms: number };
};
