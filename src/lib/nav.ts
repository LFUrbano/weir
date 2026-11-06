/** "/models" for "/models/"; "/" stays "/". */
function stripTrailingSlash(path: string): string {
  return path.replace(/\/+$/, "") || "/";
}

/**
 * Whether a nav link points at the section the reader is in. Links end in "/"
 * (trailingSlash) while `usePathname()` may not, so both sides are normalized.
 * A link matches its whole first segment: "/docs/quickstart/" is active
 * anywhere under "/docs".
 */
export function isActivePath(pathname: string, href: string): boolean {
  const path = stripTrailingSlash(pathname);
  const section = `/${href.split("/")[1] ?? ""}`;
  if (section === "/") return path === "/";
  return path === section || path.startsWith(`${section}/`);
}
