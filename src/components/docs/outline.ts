/**
 * The steps of the quickstart, once. The page's steps, the table of contents
 * and the anchors all read this list, so a title or an id changes in one place.
 */
export const quickstartOutline = [
  { id: "create-a-key", title: "Create a key" },
  { id: "install-the-sdk", title: "Install the SDK" },
  { id: "make-your-first-call", title: "Make your first call" },
  { id: "stream-the-response", title: "Stream the response" },
  { id: "next-steps", title: "Next steps" },
] as const;

export type StepId = (typeof quickstartOutline)[number]["id"];

/** "Override the base URL" → "override-the-base-url". */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * The anchor id for a sub-heading. A heading whose text slugs to nothing, or
 * to a step's id, would make a broken or duplicate anchor, so the build stops
 * with a message instead. Pass an explicit `id` to the heading to override.
 */
export function headingId(text: string): string {
  const id = slugify(text);
  if (!id) {
    throw new Error(`Docs heading "${text}" has no letters or digits to make an anchor id from.`);
  }
  if (quickstartOutline.some((s) => s.id === id)) {
    throw new Error(`Docs heading "${text}" would reuse the anchor id "${id}" of a step.`);
  }
  return id;
}
