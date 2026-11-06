import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { primaryCta } from "@/data/site";
import { CommandMenuTrigger } from "./CommandMenu";
import { Logo } from "./Logo";
import { MobileNav } from "./MobileNav";
import { NavLinks } from "./NavLinks";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur-md">
      <div className="container-site flex h-(--header-h) items-center">
        <Logo className="mr-4 md:mr-8 lg:mr-10" />
        <nav aria-label="Main" className="hidden md:block">
          <NavLinks className="-ml-3" />
        </nav>
        <div className="ml-auto flex items-center gap-2 md:gap-5">
          <CommandMenuTrigger />
          {/* A concept site has no accounts, so "Sign in" stays plain text. */}
          <span className="hidden cursor-default text-[0.875rem] text-fg-2 select-none md:inline">
            Sign in
          </span>
          <Link href={primaryCta.href} className={buttonVariants({ size: "sm" })}>
            {primaryCta.label}
          </Link>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
