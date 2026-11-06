import Link from "next/link";
import { fictionNote, footerColumns } from "@/data/site";
import { Logo } from "./Logo";
import { StatusDot } from "./StatusDot";

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="container-site">
        <div className="grid grid-cols-12 gap-x-6 gap-y-12 py-16 md:py-20">
          <div className="col-span-12 md:col-span-5">
            <Logo />
            <p className="mt-5 max-w-[21rem] text-[0.875rem] leading-relaxed text-fg-2">
              Inference for open models. One API, billed by the token, with dedicated GPUs when
              shared capacity stops being enough.
            </p>
          </div>

          {footerColumns.map((column) => {
            const headingId = `footer-${column.title.toLowerCase()}`;
            return (
              <nav
                key={column.title}
                aria-labelledby={headingId}
                className="col-span-6 md:col-span-2"
              >
                <h2 id={headingId} className="label-mono text-fg">
                  {column.title}
                </h2>
                <ul className="mt-5 flex flex-col gap-3">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="rounded-sm text-[0.875rem] text-fg-2 transition-colors duration-150 hover:text-fg"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            );
          })}

          <div className="col-span-12 md:col-span-3">
            <h2 className="label-mono text-fg">Status</h2>
            {/* No status page in a concept site: the trust section on the home holds it. */}
            <Link
              href="/#trust"
              className="mt-5 inline-flex items-center gap-2.5 rounded-sm font-mono text-[0.8125rem] text-fg underline decoration-transparent underline-offset-4 transition-colors duration-150 hover:decoration-line-strong"
            >
              <StatusDot state="ok" />
              All systems normal
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-line py-6 font-mono text-[0.75rem] text-fg-2 md:flex-row md:items-center md:justify-between">
          <p>© 2026 Weir, Inc. San Francisco, CA</p>
          <p>{fictionNote}</p>
        </div>
      </div>
    </footer>
  );
}
