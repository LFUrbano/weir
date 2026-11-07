import type { Metadata } from "next";
import Link from "next/link";
import { StatusDot } from "@/components/site/StatusDot";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <div className="container-site flex flex-1 items-center py-24 md:py-32">
      <div className="grid w-full grid-cols-12 items-center gap-x-6 gap-y-14">
        <div className="col-span-12 lg:col-span-6">
          <p className="label-mono flex items-center gap-2.5 text-fg-2">
            <StatusDot state="error" />
            HTTP 404
          </p>
          <h1 className="mt-6 text-title-sm leading-[1.02] tracking-[-0.03em] text-fg md:text-display">
            Page not found
          </h1>
          <p className="mt-6 max-w-[30rem] text-lede leading-relaxed text-fg-2">
            Nothing lives at this address. The page may have moved, or the link has a typo.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/" className={buttonVariants({ variant: "secondary", size: "lg" })}>
              Back to home
            </Link>
            <Link href="/models/" className={buttonVariants({ variant: "outline", size: "lg" })}>
              Browse models
            </Link>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 lg:col-start-8" aria-hidden="true">
          <div className="overflow-hidden rounded-panel border border-line bg-surface">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="label-mono text-fg-2">Response</span>
              <span className="label-mono text-fg-2">api.weir.example</span>
            </div>
            <pre className="overflow-x-auto px-4 py-5 font-mono text-code text-fg-2">
              <span className="text-fg">HTTP/2 </span>
              <span className="text-err">404</span>
              {"\ncontent-type: application/json\n\n"}
              {"{\n  \"error\": {\n    \"type\": \"not_found\",\n    \"message\": \"Unknown path\"\n  }\n}"}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
