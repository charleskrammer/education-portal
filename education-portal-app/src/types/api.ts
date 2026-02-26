export type AssistantResponse = {
  is_claude_usage: boolean;
  title: string;
  summary: string;
  steps: string[];
  example_prompt?: string;
  safety_checks?: string[];
  suggested_video_id?: string;
  suggested_video_reason?: string;
};

export type MemberRow = {
  member: { id: string; name: string; role: string };
  currentScore: number;
  scoreDelta: number;
  logins7d: number;
  workWeekDays: boolean[];
  quizzesCompleted: number;
  accuracy: number;
  videosCompleted: number;
  completionPct: number;
};

export type MetricsResponse = {
  rows: MemberRow[];
  teamId: string;
};
