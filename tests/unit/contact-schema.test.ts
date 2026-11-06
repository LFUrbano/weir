import { describe, expect, it } from "vitest";
import {
  CONTACT_MESSAGE_MAX,
  USE_CASES,
  VOLUMES,
  contactMessages,
  contactSchema,
  type ContactInput,
} from "@/lib/contact-schema";

const valid: ContactInput = {
  email: "ana@acme.example",
  company: "Acme",
  volume: "10–100B",
  useCase: "agents",
  message: "",
  website: "",
};

/** Field name → every message zod reported for it. */
function errorsOf(input: unknown): Record<string, string[]> {
  const result = contactSchema.safeParse(input);
  if (result.success) return {};
  const out: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0]);
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

describe("contactSchema", () => {
  it("accepts a complete request", () => {
    const result = contactSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("offers exactly the agreed volume ranges and use cases", () => {
    expect(VOLUMES).toEqual(["<1B", "1–10B", "10–100B", "100B+"]);
    expect(USE_CASES).toEqual(["chat", "agents", "search", "batch", "other"]);
  });

  it("rejects an invalid email with one message on email", () => {
    for (const email of ["ana", "ana@", "@acme.example", "ana @acme.example"]) {
      expect(errorsOf({ ...valid, email })).toEqual({ email: [contactMessages.email.invalid] });
    }
  });

  it("counts whitespace-only as empty: '   ' is required, not invalid", () => {
    expect(errorsOf({ ...valid, company: "   " })).toEqual({
      company: [contactMessages.company.required],
    });
    expect(errorsOf({ ...valid, company: "" })).toEqual({
      company: [contactMessages.company.required],
    });
    expect(errorsOf({ ...valid, email: " \t " })).toEqual({
      email: [contactMessages.email.required],
    });
  });

  it("trims what it keeps", () => {
    const result = contactSchema.parse({ ...valid, email: "  ana@acme.example ", company: " Acme  " });
    expect(result.email).toBe("ana@acme.example");
    expect(result.company).toBe("Acme");
  });

  it(`allows a message of up to ${CONTACT_MESSAGE_MAX} characters`, () => {
    expect(CONTACT_MESSAGE_MAX).toBe(2000);
    expect(contactSchema.safeParse({ ...valid, message: "a".repeat(2000) }).success).toBe(true);
    expect(errorsOf({ ...valid, message: "a".repeat(2001) })).toEqual({
      message: [contactMessages.message.tooLong],
    });
  });

  it("keeps the message optional", () => {
    expect(contactSchema.safeParse({ ...valid, message: "   " }).success).toBe(true);
  });

  it("rejects a volume or use case outside the lists", () => {
    expect(errorsOf({ ...valid, volume: "1-10B" })).toEqual({ volume: [contactMessages.volume] });
    expect(errorsOf({ ...valid, useCase: "chatbot" })).toEqual({
      useCase: [contactMessages.useCase],
    });
  });

  it("reports one message per field when everything is empty", () => {
    const errors = errorsOf({ email: "", company: "", message: "", website: "" });
    expect(errors).toEqual({
      email: [contactMessages.email.required],
      company: [contactMessages.company.required],
      volume: [contactMessages.volume],
      useCase: [contactMessages.useCase],
    });
  });

  it("lets a filled honeypot through: the form, not the schema, handles it", () => {
    expect(contactSchema.safeParse({ ...valid, website: "https://spam.example" }).success).toBe(true);
    expect(contactSchema.safeParse({ ...valid, website: undefined }).success).toBe(true);
  });

  it("writes every message as an instruction", () => {
    const all = [
      contactMessages.email.required,
      contactMessages.email.invalid,
      contactMessages.company.required,
      contactMessages.volume,
      contactMessages.useCase,
      contactMessages.message.tooLong,
    ];
    for (const m of all) {
      expect(m).toMatch(/^(Enter|Pick|Keep)\b/);
      expect(m.endsWith(".")).toBe(true);
    }
  });
});
