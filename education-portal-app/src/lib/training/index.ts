import trainingData from "@/data/training.json";

/** Channels permitted in the training dataset. */
export const ALLOWED_CHANNELS = ["Anthropic", "Claude"] as const;
export type AllowedChannel = (typeof ALLOWED_CHANNELS)[number];

export function isChannelAllowed(channel: string): boolean {
  return (ALLOWED_CHANNELS as readonly string[]).includes(channel);
}

export type Video = {
  id: string;
  title: string;
  channel: string;
  url: string;
  provider?: "youtube" | "vimeo";
  reason: string;
  level: "Beginner" | "Regular" | "Advanced";
  duration: string;
  views: string;
  published_date: string;
  top_pick: boolean;
  official?: boolean;
  quiz?: VideoQuiz;
};

export type QuizQuestion = {
  id: string;
  question: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
};

export type VideoQuiz = {
  questions: QuizQuestion[];
};

export type Topic = {
  id: string;
  title: string;
  description: string;
  videos: Video[];
};

export type Resource = {
  id: string;
  title: string;
  url: string;
  provider: string;
  category: "Article" | "Course" | "Channel" | "Policy";
  description: string;
};

export type Step = {
  id: string;
  title: string;
  summary: string;
  time_estimate: string;
  objectives: string[];
  checklist: string[];
  topics: Topic[];
  resources?: Resource[];
};

export type TrainingData = {
  portal: {
    title: string;
    subtitle: string;
    audience: string;
  };
  steps: Step[];
};

export const training = trainingData as TrainingData;

export const getStepById = (id: string) =>
  training.steps.find((step) => step.id === id);

export type VideoWithContext = Video & {
  stepId: string;
  stepTitle: string;
  topicId: string;
  topicTitle: string;
};

export const getAllVideos = (): VideoWithContext[] => {
  return training.steps.flatMap((step) =>
    step.topics.flatMap((topic) =>
      topic.videos.map((video) => ({
        ...video,
        stepId: step.id,
        stepTitle: step.title,
        topicId: topic.id,
        topicTitle: topic.title
      }))
    )
  );
};

export const getOfficialVideos = (): VideoWithContext[] =>
  getAllVideos().filter((video) => Boolean(video.official));

/**
 * Validate all videos in the training data against the allowed channel list.
 * Returns an array of violation messages (empty = all valid).
 */
export const validateChannels = (): string[] => {
  const errors: string[] = [];
  training.steps.forEach((step) => {
    step.topics.forEach((topic) => {
      topic.videos.forEach((video) => {
        if (!isChannelAllowed(video.channel)) {
          errors.push(
            `Video "${video.id}" in step "${step.id}" has disallowed channel: "${video.channel}"`
          );
        }
      });
    });
  });
  return errors;
};
