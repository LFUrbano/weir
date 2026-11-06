import Link from "next/link";
import type { ReactNode } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  billingTerms,
  company,
  complianceLine,
  dataRetention,
  freeCreditLabel,
  listAnd,
  lowerFirst,
  noCardRequired,
  pct,
  slaCoverage,
} from "@/data/company";
import { contactHref } from "@/data/site";

const link =
  "text-fg underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-fg";

interface Question {
  id: string;
  q: string;
  a: ReactNode;
}

/** Five questions a buyer asks before a first invoice. Facts come from company.ts. */
const questions: Question[] = [
  {
    id: "billing",
    q: "How does billing work?",
    a: (
      <>
        <p>
          Serverless is billed per token. Input and output are priced separately per 1M tokens, and
          image models per image. {billingTerms.serverlessBilling} New accounts start with{" "}
          {freeCreditLabel} of credit, {lowerFirst(noCardRequired)}
        </p>
        <p>
          Dedicated replicas are billed {company.dedicatedBilling} at the hourly rates above, from
          the moment a replica starts until you release it.
        </p>
      </>
    ),
  },
  {
    id: "limits",
    q: "What are the rate limits?",
    a: (
      <p>
        A new key starts at {company.rateLimitRpm} requests a minute on serverless, and the limit
        rises as your account spends. {billingTerms.dedicatedLimits} Each replica&rsquo;s peak is
        listed in the table above.
      </p>
    ),
  },
  {
    id: "dedicated",
    q: "When should I move to dedicated, and what changes in my code?",
    a: (
      <p>
        Move when steady volume passes the break-even point for your model (the{" "}
        <a href="#calculator" className={link}>
          calculator
        </a>{" "}
        works it out from your own input and output mix), or when you need reserved throughput and
        the {pct(company.slaDedicatedPct)} monthly uptime SLA. Your code does not change: the model
        ID, the request format and the SDKs stay the same, and the router sends your requests to
        replicas reserved for you instead of the shared pool. You can keep low-volume models on
        serverless and move only the busy ones.
      </p>
    ),
  },
  {
    id: "data",
    q: "Do you keep my prompts or train on my data?",
    a: (
      <>
        <p>
          <span className="text-fg">{dataRetention.headline}.</span> <span>{dataRetention.detail}</span>
        </p>
        <p>
          Compliance: {complianceLine}. {billingTerms.dpa}
        </p>
      </>
    ),
  },
  {
    id: "contract",
    q: "Do I need a contract?",
    a: (
      <p>
        No. Serverless and dedicated are self-serve, with no minimum term: release a replica and its
        billing stops. The {pct(company.slaDedicatedPct)} SLA comes with dedicated either way:{" "}
        {lowerFirst(slaCoverage)} A contract adds {lowerFirst(billingTerms.contractPricing)}, billing{" "}
        {lowerFirst(billingTerms.contractBilling)}, SSO with {listAnd(company.sso.protocols)}, and a
        security review with our reports under NDA.{" "}
        <Link href={contactHref} className={link}>
          Talk to an engineer
        </Link>{" "}
        to start one.
      </p>
    ),
  },
];

export function Faq() {
  return (
    <Accordion data-testid="faq" type="multiple" className="border-t border-line-strong">
      {questions.map((item) => (
        <AccordionItem key={item.id} value={item.id}>
          <AccordionTrigger>{item.q}</AccordionTrigger>
          <AccordionContent className="max-w-[44rem] space-y-3 leading-relaxed">{item.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
