import { z } from "zod";

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
} as const;

/**
 * The "Talk to an engineer" form. Text is trimmed before it is checked, so a
 * field holding only spaces counts as empty. `website` is a honeypot: the
 * schema lets any value through and the form decides what a filled one means.
 */
export const contactSchema = z.object({
  // pipe() runs the format check only when the field is not empty: one message per field.
  email: z
    .string()
    .trim()
    .min(1, contactMessages.email.required)
    .pipe(z.email(contactMessages.email.invalid).max(254, contactMessages.email.invalid)),
  company: z
    .string()
    .trim()
    .min(1, contactMessages.company.required)
    .max(200, contactMessages.company.tooLong),
  volume: z.enum(VOLUMES, { error: contactMessages.volume }),
  useCase: z.enum(USE_CASES, { error: contactMessages.useCase }),
  message: z.string().trim().max(CONTACT_MESSAGE_MAX, contactMessages.message.tooLong),
  website: z.string().optional(),
});

export type ContactInput = z.infer<typeof contactSchema>;
