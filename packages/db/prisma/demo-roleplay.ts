// Mock identity facts for local role-play only. Do not send codes in case reads,
// voice prompts, transcripts, or logs. They are not real customer credentials.
export const DEMO_ROLEPLAY = {
  maria: { authorizedName: "Maria Ellis", code: "412768" },
  theo: { authorizedName: "Theo Ramirez", code: "739251" },
  keisha: { authorizedName: "Keisha Patel", code: "581934" },
  jordan: { authorizedName: "Jordan Kim", code: "265417" },
  northside: { authorizedName: "Avery Morgan", code: "864203" },
  cedar: { authorizedName: "Elena Brooks", code: "347890" },
} as const;
