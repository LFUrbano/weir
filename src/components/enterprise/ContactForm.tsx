"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useForm, useWatch, type Control, type ControllerRenderProps, type Resolver } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CONTACT_MESSAGE_MAX, USE_CASES, VOLUMES, contactMessages, useCaseLabels } from "@/lib/contact-fields";
import type { ContactInput } from "@/lib/contact-schema";
import { formatCount } from "@/lib/format";
import { useHydrated } from "@/lib/use-location-search";
import { cn } from "@/lib/utils";

/**
 * How long "sending" lasts. Weir is a static export with no endpoint, so the
 * pause stands in for the network: nothing leaves the browser and nothing is
 * stored.
 */
export const SEND_MS = 600;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** 16 px text on phones, so iOS does not zoom into the field; 44 px tall to tap. */
const field = "h-11 text-base md:text-small";

/**
 * Monthly volume as a segmented radio group: four ordered ranges, one tap, and
 * arrow keys between them. Native radios keep the group semantics; the error
 * and the hint are linked from each one.
 */
function VolumeChoice({ field: f }: { field: ControllerRenderProps<ContactInput, "volume"> }) {
  const { error, formItemId, formMessageId, formDescriptionId } = useFormField();
  const describedBy = [error && formMessageId, formDescriptionId].filter(Boolean).join(" ");
  return (
    <fieldset
      role="radiogroup"
      aria-required="true"
      aria-invalid={!!error}
      aria-describedby={describedBy}
    >
      <legend className="text-small leading-none font-medium text-fg data-[error=true]:text-err" data-error={!!error}>
        Monthly volume
      </legend>
      <FormDescription className="mt-2">Input plus output tokens, across all models.</FormDescription>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {VOLUMES.map((v, i) => {
          const id = `${formItemId}-${i}`;
          return (
            <label
              key={v}
              htmlFor={id}
              className={cn(
                "relative flex h-11 cursor-pointer items-center justify-center rounded-md border border-line-strong bg-surface font-mono text-small text-fg-2 transition-colors duration-150",
                "hover:border-[color-mix(in_oklab,var(--color-line-strong),white_10%)] hover:text-fg",
                "has-checked:border-amber has-checked:bg-surface-2 has-checked:text-fg",
                "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-amber",
                error && "border-err",
              )}
            >
              {/* The input covers its label, so a tap anywhere on the segment hits it. */}
              <input
                id={id}
                type="radio"
                name={f.name}
                value={v}
                checked={f.value === v}
                onChange={() => f.onChange(v)}
                onBlur={f.onBlur}
                ref={i === 0 ? f.ref : undefined}
                className="absolute inset-0 cursor-pointer appearance-none rounded-md opacity-0"
              />
              {v}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Counts what the schema counts (trimmed), and only re-renders itself as the person types. */
function MessageCount({ control }: { control: Control<ContactInput> }) {
  const length = (useWatch({ control, name: "message" }) ?? "").trim().length;
  const over = length > CONTACT_MESSAGE_MAX;
  return (
    <span data-testid="message-count" className={cn("font-mono text-caption", over ? "text-err" : "text-fg-2")}>
      {formatCount(length)} / {formatCount(CONTACT_MESSAGE_MAX)}
    </span>
  );
}

function Success({ data }: { data: ContactInput }) {
  const heading = useRef<HTMLHeadingElement>(null);
  // Move focus to the result, so a screen reader hears it and the keyboard starts from here.
  useEffect(() => heading.current?.focus(), []);

  const rows = [
    { label: "Company", value: data.company },
    { label: "Volume", value: `${data.volume} tokens a month` },
    { label: "Use case", value: useCaseLabels[data.useCase] },
  ];

  return (
    <div data-testid="contact-success">
      <p className="label-mono flex items-center gap-2.5 text-ok">
        <span aria-hidden="true" className="inline-flex size-2 rounded-full bg-ok" />
        Request received
      </p>
      <h3 ref={heading} tabIndex={-1} className="mt-5 text-h3 text-fg">
        Thanks — your request is in.
      </h3>
      <p className="mt-3 max-w-[32rem] text-fg-2">
        Here is what you entered. These three answers are what a first replica is sized from.
      </p>
      <dl className="mt-8 border-t border-line">
        {rows.map((r) => (
          <div key={r.label} className="grid grid-cols-[6.5rem_1fr] gap-4 border-b border-line py-3">
            <dt className="label-mono pt-[0.2rem] text-fg-2">{r.label}</dt>
            <dd className="min-w-0 text-small break-words text-fg">{r.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-8 text-small text-fg-2">
        Next, the numbers behind a first replica: the{" "}
        <Link
          href="/pricing/#calculator"
          className="text-fg underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-fg"
        >
          calculator
        </Link>{" "}
        shows where dedicated costs less than serverless at your volume, and the{" "}
        <Link
          href="/models/"
          className="text-fg underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-fg"
        >
          catalog
        </Link>{" "}
        lists which models already have a ready replica.
      </p>
    </div>
  );
}

/**
 * zod and the resolver (~50 KB gzipped) are not needed until the form first
 * validates, far below the fold: fetch them then (or when the form gets
 * focus) instead of on every load of the page.
 */
let zodResolverPromise: Promise<Resolver<ContactInput>> | null = null;

function loadResolver(): Promise<Resolver<ContactInput>> {
  zodResolverPromise ??= Promise.all([import("@hookform/resolvers/zod"), import("@/lib/contact-schema")])
    .then(([{ zodResolver }, { contactSchema }]) => zodResolver(contactSchema) as Resolver<ContactInput>)
    .catch((error: unknown) => {
      // A failed download (offline, a flaky network) must not stick: the
      // next validation tries again.
      zodResolverPromise = null;
      throw error;
    });
  return zodResolverPromise;
}

/**
 * Validates with zod. onSubmit makes sure it has loaded before handing over to
 * React Hook Form (and re-validation only runs after a submit), so by the time
 * this runs the download has succeeded. It can't report a load failure
 * itself: handleSubmit drops errors.root and would treat the form as valid.
 */
const lazyZodResolver: Resolver<ContactInput> = async (values, context, options) =>
  (await loadResolver())(values, context, options);

/**
 * "Talk to an engineer". Validates in the browser with the same zod schema the
 * unit tests check, focuses the first invalid field on submit, and ignores a
 * second submit while the first is "sending". A filled honeypot gets the same
 * wait and the same success as a person, and nothing else happens.
 */
export function ContactForm({ aside }: { aside?: ReactNode }) {
  const form = useForm<ContactInput>({
    resolver: lazyZodResolver,
    defaultValues: { email: "", company: "", message: "", website: "" },
    shouldFocusError: true,
  });
  const [sending, setSending] = useState(false);
  // The checks could not be downloaded: say so instead of doing nothing.
  const [loadFailed, setLoadFailed] = useState(false);
  const [sent, setSent] = useState<ContactInput | null>(null);
  // Before hydration (or with JavaScript off) a native submit would GET this
  // page with every field in the query string, so the address bar, history and
  // the host's logs would hold the visitor's details. The button stays disabled
  // until the handlers are attached, which also blocks submit by Enter.
  const hydrated = useHydrated();
  // State updates land a render later; the ref stops a double click in between.
  const busy = useRef(false);

  async function onValid(data: ContactInput) {
    if (busy.current) return;
    busy.current = true;
    setSending(true);
    // Honeypot or not, the visitor sees the same pause and the same result.
    // There is no endpoint to skip: a static site has nowhere to send it.
    await wait(SEND_MS);
    setSent(data);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy.current) return;
    try {
      await loadResolver();
    } catch {
      setLoadFailed(true);
      return;
    }
    setLoadFailed(false);
    await form.handleSubmit(onValid)();
  }

  const formBody = (
    <Form {...form}>
      <form
        data-testid="contact-form"
        noValidate
        // Defense in depth: if a native submit ever happens, nothing goes in the URL.
        method="post"
        onSubmit={(e) => void onSubmit(e)}
        // Warm-up only: a failure here is reported when the form validates.
        onFocus={() => void loadResolver().catch(() => {})}
        className="relative grid gap-7"
      >
        <div className="grid gap-7 sm:grid-cols-2 sm:gap-5">
          <FormField
            control={form.control}
            name="email"
            render={({ field: f }) => (
              <FormItem className="gap-2.5">
                <FormLabel>Work email</FormLabel>
                <FormControl>
                  <Input
                    {...f}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    aria-required="true"
                    className={field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="company"
            render={({ field: f }) => (
              <FormItem className="gap-2.5">
                <FormLabel>Company</FormLabel>
                <FormControl>
                  <Input {...f} autoComplete="organization" aria-required="true" className={field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="volume"
          render={({ field: f }) => (
            <FormItem className="gap-2.5">
              <VolumeChoice field={f} />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="useCase"
          render={({ field: f }) => (
            <FormItem className="gap-2.5">
              <FormLabel>Use case</FormLabel>
              <Select value={f.value ?? ""} onValueChange={f.onChange} name={f.name}>
                <FormControl>
                  <SelectTrigger
                    ref={f.ref}
                    onBlur={f.onBlur}
                    aria-required="true"
                    className={cn(field, "w-full data-[size=default]:h-11")}
                  >
                    <SelectValue placeholder="Choose the closest one" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent position="popper" align="start">
                  {USE_CASES.map((u) => (
                    <SelectItem key={u} value={u} className="py-2.5">
                      {useCaseLabels[u]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="message"
          render={({ field: f }) => (
            <FormItem className="gap-2.5">
              <div className="flex items-baseline justify-between gap-4">
                <FormLabel>Message</FormLabel>
                <span className="text-small text-fg-2">Optional</span>
              </div>
              <FormControl>
                <Textarea
                  {...f}
                  rows={4}
                  placeholder="Models you run today, latency targets, regions, a deadline."
                  className="max-h-72 text-base md:text-small"
                />
              </FormControl>
              <div className="flex items-start justify-between gap-4">
                <FormMessage />
                <FormDescription className="ml-auto shrink-0">
                  <MessageCount control={form.control} />
                  <span className="sr-only"> characters</span>
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        {/* Honeypot: off screen and out of the tab order. People never fill it; form bots do. */}
        <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
          <label htmlFor="contact-website">Leave this field empty</label>
          <input
            id="contact-website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            {...form.register("website")}
          />
        </div>

        <div className="flex border-t border-line pt-7 sm:justify-end">
          <Button
            type="submit"
            size="lg"
            disabled={!hydrated}
            data-hydrated={hydrated}
            aria-disabled={sending}
            className={cn(
              "w-full aria-disabled:cursor-progress aria-disabled:opacity-60 sm:w-auto sm:min-w-44",
              // Hydration is usually too quick to notice: keep the button at full
              // strength meanwhile instead of flashing it from dim to bright.
              !hydrated && "disabled:opacity-100",
            )}
          >
            {sending ? "Sending…" : "Send request"}
          </Button>
        </div>
        <noscript>
          <p className="-mt-3 text-small text-fg-2 sm:text-right">Sending this form needs JavaScript.</p>
        </noscript>
        {loadFailed && (
          <p data-testid="form-error" role="alert" className="-mt-3 text-small text-err sm:text-right">
            {contactMessages.load}
          </p>
        )}
      </form>
    </Form>
  );

  // The aside talks about the first call; once the request is in, it steps away so
  // nothing on screen reads as a promise that someone will be in touch.
  return (
    <div className="grid grid-cols-12 gap-x-6 gap-y-12">
      <div className="col-span-12 rounded-panel border border-line bg-surface p-5 sm:p-8 lg:col-span-7">
        {sent ? <Success data={sent} /> : formBody}
      </div>
      {!sent && aside}
    </div>
  );
}
