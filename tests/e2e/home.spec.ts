import { expect, test, type Page } from "@playwright/test";
import { demoCost, heroDemo } from "../../src/components/home/hero-demo";
import {
  billingTerms,
  company,
  complianceLine,
  dataRetention,
  freeCreditLabel,
  listAnd,
  pct,
  trustNotes,
} from "../../src/data/company";
import { customers } from "../../src/data/customers";
import { gpus } from "../../src/data/gpus";
import { getModel, isTokenModel, models, type TokenModel } from "../../src/data/models";
import { formatLatency, formatUsd } from "../../src/lib/format";
import { blendedPrice } from "../../src/lib/pricing";

function tokenModel(slug: string): TokenModel {
  const m = getModel(slug);
  if (!m || !isTokenModel(m)) throw new Error(`missing token model ${slug}`);
  return m;
}

const llama = tokenModel("llama-3-3-70b");

/** Records every value the terminal's data-state takes, from the first paint on. */
async function recordTerminalStates(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __terminalStates: string[] };
    w.__terminalStates = [];
    const watch = () => {
      const el = document.querySelector('[data-testid="hero-terminal"]');
      if (!el) return false;
      const push = () => {
        const s = el.getAttribute("data-state") ?? "";
        if (w.__terminalStates.at(-1) !== s) w.__terminalStates.push(s);
      };
      push();
      new MutationObserver(push).observe(el, { attributes: true, attributeFilter: ["data-state"] });
      return true;
    };
    if (!watch()) {
      const boot = new MutationObserver(() => {
        if (watch()) boot.disconnect();
      });
      boot.observe(document, { childList: true, subtree: true });
    }
  });
}

const terminalStates = (page: Page) =>
  page.evaluate(() => (window as unknown as { __terminalStates: string[] }).__terminalStates);

async function expectFinalTerminal(page: Page, timeout: number) {
  const terminal = page.getByTestId("hero-terminal");
  await expect(terminal).toHaveAttribute("data-state", "done", { timeout });
  await expect(terminal.getByTestId("hero-response")).toHaveText(heroDemo.response);
  const stat = (label: string) => terminal.locator(`dt:text-is("${label}") + dd`);
  await expect(stat("Time to first token")).toHaveText(formatLatency(llama.p50Ms));
  await expect(stat("Time to first token")).toHaveText("212 ms");
  await expect(stat("Throughput")).toHaveText(`${llama.tokensPerSec} tok/s`);
  await expect(stat("Cost")).toHaveText(formatUsd(demoCost(llama)));
}

test.describe("home", () => {
  test("hero: headline and the two calls to action", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Open models in production",
    );
    const hero = page.getByTestId("hero");
    await expect(hero.getByRole("link", { name: "Get an API key" })).toHaveAttribute(
      "href",
      "/docs/quickstart/",
    );
    await expect(hero.getByRole("link", { name: "Talk to an engineer" })).toHaveAttribute(
      "href",
      "/enterprise/#contact",
    );
  });

  test("Talk to an engineer lands on the Enterprise form, in view", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("hero").getByRole("link", { name: "Talk to an engineer" }).click();
    await expect(page).toHaveURL(/\/enterprise\/#contact$/);
    await expect(page.getByTestId("contact-form")).toBeInViewport();
    await expect(page.getByRole("textbox", { name: "Work email" })).toBeInViewport();
  });

  test("hero terminal streams the reply and ends on the Llama 3.3 70B numbers", async ({
    page,
  }) => {
    await recordTerminalStates(page);
    await page.goto("/");
    // The reply starts when it is on screen (already true on desktop; on a phone, scroll to it).
    await page.getByTestId("hero-response").scrollIntoViewIfNeeded();
    await expectFinalTerminal(page, 6000);
    // It really streamed: waiting for the first token, then tokens, then done.
    const states = await terminalStates(page);
    expect(states).toContain("waiting");
    expect(states).toContain("streaming");
    expect(states.at(-1)).toBe("done");
  });

  test("logo strip shows the invented customers", async ({ page }) => {
    await page.goto("/");
    const strip = page.getByTestId("logo-strip");
    for (const c of customers) {
      // Phones show six marks in two columns; the seventh joins from the sm breakpoint.
      await expect(
        strip.getByRole("img", { name: c.name, exact: true, includeHidden: true }),
      ).toHaveAttribute("src", c.logo);
    }
    expect(await strip.getByRole("img").count()).toBeGreaterThanOrEqual(6);
  });

  test("catalog preview: six token models, each linking to its page", async ({ page }) => {
    await page.goto("/");
    const rows = page.getByTestId("catalog-preview").locator("tbody tr");
    await expect(rows).toHaveCount(6);
    for (let i = 0; i < 6; i++) {
      const link = rows.nth(i).getByRole("link");
      const href = (await link.getAttribute("href")) ?? "";
      const slug = href.match(/^\/models\/([a-z0-9-]+)\/$/)?.[1];
      expect(slug, href).toBeTruthy();
      const m = tokenModel(slug!);
      expect(m.tasks.some((t) => t === "chat" || t === "reasoning" || t === "code")).toBe(true);
      expect(m.tasks).not.toContain("embeddings");
      await expect(link).toHaveText(m.name);
      // Price and latency come from the data file through the formatters.
      await expect(rows.nth(i)).toContainText(formatUsd(m.pricing.input));
      await expect(rows.nth(i)).toContainText(formatUsd(m.pricing.output));
      await expect(rows.nth(i)).toContainText(formatLatency(m.p50Ms));
    }
    await expect(
      page.getByTestId("catalog-preview").getByRole("link", { name: /all \d+ models/i }),
    ).toHaveAttribute("href", "/models/");
    expect(models.length).toBeGreaterThan(6);
  });

  test("request diagram: four steps, one sentence each, lit as you scroll", async ({ page }) => {
    await page.goto("/");
    const diagram = page.getByTestId("request-diagram");
    const steps = diagram.getByTestId("diagram-step");
    await expect(steps).toHaveCount(4);
    const names = ["App", "Edge", "Router", "GPUs"];
    for (let i = 0; i < 4; i++) {
      await expect(steps.nth(i).getByRole("heading")).toHaveText(names[i]);
      const sentence = (await steps.nth(i).locator("p").first().textContent()) ?? "";
      expect(sentence.trim().split(/\s+/).length).toBeGreaterThan(6);
      expect(sentence.trim()).toMatch(/\.$/);
    }

    // Far above the diagram, the path has not lit up yet.
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(steps.nth(3)).toHaveAttribute("data-lit", "false");

    // Scrolling through it lights every step in order.
    await diagram.scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 1600);
    for (let i = 0; i < 4; i++) await expect(steps.nth(i)).toHaveAttribute("data-lit", "true");
  });

  test("request shape is claimed per endpoint, never for every model", async ({ page }) => {
    await page.goto("/");
    const preview = page.locator("#models");
    await expect(preview).not.toContainText(/one request format/i);
    await expect(preview).not.toContainText(/Every price is per million tokens/i);
    const app = page.getByTestId("diagram-step").first();
    await expect(app).toContainText("POST /v1/chat/completions");
    await expect(app).not.toContainText(new RegExp(`all ${models.length} models`));
    await expect(page.getByRole("main")).not.toContainText(
      new RegExp(`same shape for all ${models.length}`),
    );
  });

  test("the DPA is available on every plan, not sent under NDA", async ({ page }) => {
    await page.goto("/");
    const trust = page.locator("#trust");
    await expect(trust).not.toContainText(/DPA go(es)? out under NDA|Reports and the DPA/);
    await expect(trust).toContainText(trustNotes.reports);
    await expect(trust).toContainText(billingTerms.dpa);
  });

  test("two paths: build alone or run at scale", async ({ page }) => {
    await page.goto("/");
    const paths = page.getByTestId("two-paths");
    await expect(paths.getByRole("heading", { name: "Start building" })).toBeVisible();
    await expect(paths.getByRole("heading", { name: "Run it at scale" })).toBeVisible();
    await expect(paths.locator('a[href="/docs/quickstart/"]')).toHaveCount(1);
    await expect(paths.locator('a[href="/enterprise/#contact"]')).toHaveCount(1);
    for (const word of ["credit", "SDK", "Dedicated", "SLA", "SSO", "SOC 2"]) {
      await expect(paths).toContainText(word);
    }
  });

  test("price line: 1M tokens on Llama 3.3 70B, computed from the data", async ({ page }) => {
    const price = formatUsd(blendedPrice(llama, 0.5));
    expect(price).toBe("$0.63");
    await page.goto("/");
    const line = page.getByTestId("price-line");
    await expect(line).toContainText("Llama 3.3 70B");
    await expect(line).toContainText(price);
    await expect(page.getByTestId("price-section").locator('a[href="/pricing/"]')).toHaveCount(1);
  });

  test("trust band lists certifications, SLA, regions and status", async ({ page }) => {
    await page.goto("/");
    const trust = page.locator("#trust");
    for (const text of [
      "SOC 2 Type II",
      "ISO 27001",
      "GDPR",
      "SSO",
      "SAML",
      "99.95%",
      "us-east",
      "us-west",
      "eu-west",
      "All systems normal",
    ]) {
      await expect(trust).toContainText(text);
    }
    // Footer status leads to it.
    await expect(
      page.getByRole("contentinfo").getByRole("link", { name: /All systems normal/ }),
    ).toHaveAttribute("href", "/#trust");
  });

  test("company facts on the home come from src/data/company.ts", async ({ page }) => {
    await page.goto("/");
    const credit = `${freeCreditLabel} in credit`;
    await expect(page.getByTestId("hero")).toContainText(credit);
    await expect(page.getByTestId("hero")).toContainText(
      `${models.length} models live in ${company.regions.join(", ")}`,
    );
    await expect(page.getByTestId("closing-cta")).toContainText(credit);

    const paths = page.getByTestId("two-paths");
    await expect(paths).toContainText(`${freeCreditLabel} to start`);
    await expect(paths).toContainText(`${company.rateLimitRpm} requests a minute`);
    await expect(paths).toContainText(listAnd(company.sdks));
    await expect(paths).toContainText(listAnd(gpus.map((g) => g.name.replace("NVIDIA ", ""))));
    await expect(paths).toContainText(pct(company.slaDedicatedPct));
    await expect(paths).toContainText(listAnd(company.sso.protocols));
    // Certifications and the DPA are separate things, not one "GDPR DPA".
    await expect(paths).toContainText(complianceLine);

    const trust = page.locator("#trust");
    for (const c of company.certifications) await expect(trust).toContainText(c);
    for (const p of company.sso.protocols) await expect(trust).toContainText(p);
    await expect(trust).toContainText(listAnd(company.sso.idps));
    await expect(trust).toContainText(`${pct(company.slaDedicatedPct)} SLA`);
    await expect(trust).toContainText(`${pct(company.uptime90dPct)} API uptime`);
    await expect(trust).toContainText(company.regions.join(" · "));

    await expect(page.getByTestId("price-section")).toContainText(
      `billed ${company.dedicatedBilling}`,
    );
  });

  test("trust states one retention policy, without contradiction", async ({ page }) => {
    await page.goto("/");
    const trust = page.locator("#trust");
    await expect(trust).toContainText(dataRetention.headline);
    await expect(trust).toContainText(dataRetention.detail);
    await expect(trust).not.toContainText("are not stored");
  });

  test("the router step respects a pinned region", async ({ page }) => {
    await page.goto("/");
    const router = page.getByTestId("diagram-step").nth(2);
    await expect(router).toContainText("Router");
    await expect(router.locator("p").first()).toContainText("region you pinned");
  });

  test("Replay keeps keyboard focus and plays the reply again", async ({ page }) => {
    await page.goto("/");
    const terminal = page.getByTestId("hero-terminal");
    await page.getByTestId("hero-response").scrollIntoViewIfNeeded();
    await expect(terminal).toHaveAttribute("data-state", "done", { timeout: 6000 });
    const replay = terminal.getByRole("button", { name: "Replay response" });
    await replay.focus();
    await page.keyboard.press("Enter");
    // It played again...
    await expect(terminal).not.toHaveAttribute("data-state", "done");
    // ...and focus stayed on the button, not on <body>.
    expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe("BODY");
    await expect(replay).toBeFocused();
    await expect(replay).toHaveAttribute("aria-disabled", "true");
    await expect(terminal).toHaveAttribute("data-state", "done", { timeout: 6000 });
    await expect(replay).toBeFocused();
    await expect(replay).toHaveAttribute("aria-disabled", "false");
  });

  test("closing section repeats both calls to action", async ({ page }) => {
    await page.goto("/");
    const closing = page.getByTestId("closing-cta");
    await expect(closing.getByRole("link", { name: "Get an API key" })).toHaveAttribute(
      "href",
      "/docs/quickstart/",
    );
    await expect(closing.getByRole("link", { name: "Talk to an engineer" })).toHaveAttribute(
      "href",
      "/enterprise/#contact",
    );
  });

  test("no sideways scroll at 360 px", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto("/");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe("home with reduced motion (Review Focus 4)", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  test("terminal shows the full reply and the final numbers on load", async ({ page }) => {
    await recordTerminalStates(page);
    await page.goto("/");
    await expectFinalTerminal(page, 1500);
    // Never animated: from the server-rendered "idle" it went straight to "done".
    const states = await terminalStates(page);
    expect(states.filter((s) => s !== "idle")).toEqual(["done"]);
    await expect(page.getByRole("button", { name: "Replay response" })).toHaveCount(0);
  });

  test("every diagram step is lit without scrolling through it", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const steps = page.getByTestId("request-diagram").getByTestId("diagram-step");
    await expect(steps).toHaveCount(4);
    // Still at the top of the page.
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    for (let i = 0; i < 4; i++) {
      await expect(steps.nth(i)).toHaveAttribute("data-lit", "true");
      await expect(steps.nth(i)).toHaveCSS("opacity", "1");
    }
    await expect(page.getByTestId("diagram-progress")).toHaveAttribute("data-progress", "1");
  });
});
