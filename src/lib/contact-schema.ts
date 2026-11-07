import { z } from "zod";
import { CONTACT_MESSAGE_MAX, USE_CASES, VOLUMES, contactMessages } from "./contact-fields";

export {
  CONTACT_MESSAGE_MAX,
  USE_CASES,
  VOLUMES,
  contactMessages,
  useCaseLabels,
  type UseCase,
  type Volume,
} from "./contact-fields";

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
