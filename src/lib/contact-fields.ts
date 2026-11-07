/**
 * The contact form's choices, limits and messages, without zod: the form
 * renders from these on load and only fetches the schema (contact-schema.ts)
 * when it first validates.
 */

/** Monthly token volume, as ranges: a buyer knows the order of magnitude, not the number. */
export const VOLUMES = ["<1B", "1–10B", "10–100B", "100B+"] as const;
export type Volume = (typeof VOLUMES)[number];

export const USE_CASES = ["chat", "agents", "search", "batch", "other"] as const;
export type UseCase = (typeof USE_CASES)[number];

export const useCaseLabels: Record<UseCase, string> = {
  chat: "Chat and assistants",
  agents: "Agents and tool calls",
  search: "Search and RAG",
  batch: "Batch jobs",
  other: "Something else",
};

export const CONTACT_MESSAGE_MAX = 2000;

/** Every message says how to fix the field, so the person never has to guess. */
export const contactMessages = {
  email: {
    required: "Enter your work email.",
    invalid: "Enter an email like name@company.com.",
  },
  company: {
    required: "Enter your company name.",
    tooLong: "Keep the company name to 200 characters or fewer.",
  },
  volume: "Pick a monthly volume. A rough range is fine.",
  useCase: "Pick the use case closest to yours.",
  message: { tooLong: "Keep the message to 2,000 characters or fewer." },
  /** The checks themselves failed to download (offline, a flaky network). */
  load: "Couldn't load the form. Check your connection and try again.",
} as const;
