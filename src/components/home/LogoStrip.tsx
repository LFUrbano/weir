import Image from "next/image";
import type { CSSProperties } from "react";
import { customers } from "@/data/customers";

/** Customer wordmarks in one gray. Sizes come from each SVG's viewBox, scaled together. */
export function LogoStrip() {
  return (
    <section aria-labelledby="customers-title" className="border-t border-line py-12 md:py-14">
      <div className="container-site">
        <div className="grid grid-cols-12 items-center gap-x-6 gap-y-8">
          <h2 id="customers-title" className="label-mono col-span-12 font-mono font-[450] text-fg-2 lg:col-span-2">
            In production at
          </h2>
          <ul
            data-testid="logo-strip"
            className="col-span-12 grid grid-cols-2 items-center gap-x-6 gap-y-8 sm:grid-cols-4 lg:col-span-10 lg:flex lg:justify-between lg:gap-x-8"
          >
            {customers.map((c) => (
              <li key={c.name} className="flex items-center">
                <Image
                  src={c.logo}
                  alt={c.name}
                  width={c.width}
                  height={c.height}
                  style={{ "--w": c.width } as CSSProperties}
                  className="h-auto w-[calc(var(--w)*0.62px)] max-w-full md:w-[calc(var(--w)*0.7px)] xl:w-[calc(var(--w)*0.76px)]"
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
