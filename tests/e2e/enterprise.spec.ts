import { expect, test, type Page, type Request } from "@playwright/test";
import {
  company,
  complianceLine,
  dataRetention,
  identityLine,
  pct,
  slaLine,
  supportLine,
  supportTiers,
} from "../../src/data/company";
import { gpus } from "../../src/data/gpus";
import { contactMessages } from "../../src/lib/contact-schema";
import { collectErrors } from "./errors";

const SUCCESS = "Thanks — your request is in.";
/** A success text must not promise that a person will answer. */
const HUMAN_PROMISE =
  /engineer will|we will|we['’]ll|get back to you|reach out|be in touch|contact you|email you|call you|within \d+/i;

const form = (page: Page) => page.getByTestId("contact-form");
const email = (page: Page) => page.getByRole("textbox", { name: "Work email" });
const companyField = (page: Page) => page.getByRole("textbox", { name: "Company" });
const caseField = (page: Page) => page.getByRole("combobox", { name: "Use case" });
const message = (page: Page) => page.getByRole("textbox", { name: /^Message/ });
const submit = (page: Page) => page.getByRole("button", { name: /^(Send request|Sending)/ });
const success = (page: Page) => page.getByTestId("contact-success");

async function fillValid(page: Page) {
  await email(page).fill("ana@acme.example");
  await companyField(page).fill("Acme");
  await page.getByRole("radio", { name: "10–100B" }).check();
  await caseField(page).click();
  await page.getByRole("option", { name: /^Agents/ }).click();
  await expect(caseField(page)).toContainText("Agents");
  await message(page).fill("Moving a support agent off a closed model.");
}

/** The error text linked to a control through aria-describedby. */
async function describedErrors(page: Page, control: ReturnType<Page["getByRole"]>) {
  const ids = ((await control.getAttribute("aria-describedby")) ?? "").split(/\s+/).filter(Boolean);
  const texts: string[] = [];
  for (const id of ids) {
    const el = page.locator(`[id="${id}"][data-slot="form-message"]`);
    if ((await el.count()) > 0) texts.push((await el.textContent()) ?? "");
  }
  return texts;
}

/** Every request that is not a plain read: a send would show up here. */
function recordWrites(page: Page): Request[] {
  const writes: Request[] = [];
  page.on("request", (r) => {
    if (r.method() !== "GET" && r.method() !== "HEAD") writes.push(r);
  });
  return writes;
}

test.describe("enterprise page", () => {
  test("answers the procurement checklist in tables", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/enterprise/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Dedicated capacity: one row per GPU, at the data file's rate, region by region.
    const capacity = page.getByTestId("capacity-table");
    await expect(capacity.locator("tbody tr")).toHaveCount(gpus.length);
    for (const g of gpus) {
      const row = capacity.locator(`tr[data-gpu="${g.id}"]`);
      await expect(row).toContainText(g.name.replace(/^NVIDIA /, ""));
      await expect(row).toContainText(`$${g.hourly.toFixed(2)}/hr`);
      for (const r of company.regions) {
        await expect(row.locator(`[data-region="${r}"]`)).toHaveAttribute(
          "data-available",
          String(g.regions.includes(r)),
        );
      }
    }

    const security = page.getByTestId("security-table");
    for (const text of [
      ...company.certifications,
      ...company.sso.protocols,
      ...company.sso.idps,
      dataRetention.headline,
      dataRetention.detail,
    ]) {
      await expect(security).toContainText(text);
    }

    const slaSection = page.locator("#sla");
    await expect(slaSection).toContainText(pct(company.slaDedicatedPct));
    await expect(slaSection).toContainText("21.9 min");

    const support = page.getByTestId("support-table");
    await expect(support.locator("tbody tr")).toHaveCount(supportTiers.length);
    for (const t of supportTiers) await expect(support).toContainText(t.name);

    await expect(page.getByRole("main")).not.toContainText(/NaN|Infinity|undefined/);
    expect(errors).toEqual([]);
  });

  test("states shared facts in the same words as the home and pricing pages", async ({ page }) => {
    const shared = [complianceLine, slaLine, identityLine, supportLine, dataRetention.headline];
    for (const path of ["/enterprise/", "/pricing/", "/"]) {
      await page.goto(path);
      const main = page.getByRole("main");
      // The pricing FAQ answer is in the HTML but collapsed; textContent still has it.
      const text = (await main.textContent()) ?? "";
      for (const line of shared) {
        expect(text, `${path}: ${line}`).toContain(line);
      }
    }
  });

  test("the hero leads to the form", async ({ page }) => {
    await page.goto("/enterprise/");
    const cta = page.getByTestId("enterprise-hero").getByRole("link", { name: "Talk to an engineer" });
    await expect(cta).toHaveAttribute("href", "#contact");
    await cta.click();
    await expect(page).toHaveURL(/#contact$/);
    await expect(page.locator("#contact")).toBeInViewport();
  });
});

test.describe("contact form", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/enterprise/");
    await form(page).scrollIntoViewIfNeeded();
  });

  test("labels stay visible, and the controls are big enough to tap", async ({ page }) => {
    for (const label of ["Work email", "Company", "Monthly volume", "Use case", "Message"]) {
      await expect(form(page).getByText(label, { exact: true })).toBeVisible();
    }
    for (const control of [email(page), companyField(page), caseField(page), submit(page)]) {
      const box = await control.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
    const radio = page.locator('label:has(input[type="radio"])').first();
    expect((await radio.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
  });

  test("empty submit: one message per field, linked to it, and focus on the first", async ({
    page,
  }) => {
    await submit(page).click();

    await expect(email(page)).toBeFocused();
    await expect(form(page).locator('[data-slot="form-message"]')).toHaveCount(4);

    expect(await describedErrors(page, email(page))).toEqual([contactMessages.email.required]);
    expect(await describedErrors(page, companyField(page))).toEqual([
      contactMessages.company.required,
    ]);
    expect(await describedErrors(page, caseField(page))).toEqual([contactMessages.useCase]);
    expect(
      await describedErrors(page, page.getByRole("radio", { name: "<1B" })),
    ).toEqual([contactMessages.volume]);
    await expect(message(page)).toHaveAttribute("aria-invalid", "false");
    await expect(page.getByRole("radiogroup", { name: "Monthly volume" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );

    for (const control of [email(page), companyField(page), caseField(page)]) {
      await expect(control).toHaveAttribute("aria-invalid", "true");
    }
    await expect(success(page)).toHaveCount(0);
  });

  test("Review Focus 5: spaces only count as empty", async ({ page }) => {
    await fillValid(page);
    await email(page).fill("   ");
    await companyField(page).fill("  \t ");
    await submit(page).click();
    await expect(email(page)).toBeFocused();
    expect(await describedErrors(page, email(page))).toEqual([contactMessages.email.required]);
    expect(await describedErrors(page, companyField(page))).toEqual([
      contactMessages.company.required,
    ]);
    await expect(success(page)).toHaveCount(0);
  });

  test("focus goes to the first invalid field, and a fixed field clears its error", async ({
    page,
  }) => {
    await fillValid(page);
    await email(page).fill("ana@");
    await companyField(page).fill("");
    await submit(page).click();
    await expect(email(page)).toBeFocused();
    expect(await describedErrors(page, email(page))).toEqual([contactMessages.email.invalid]);

    await email(page).fill("ana@acme.example");
    await expect(email(page)).toHaveAttribute("aria-invalid", "false");
    expect(await describedErrors(page, email(page))).toEqual([]);

    await submit(page).click();
    await expect(companyField(page)).toBeFocused();
  });

  test("a message over 2,000 characters says so, with a live count", async ({ page }) => {
    await fillValid(page);
    await message(page).fill("a".repeat(2001));
    await expect(form(page).getByTestId("message-count")).toHaveText("2,001 / 2,000");
    await submit(page).click();
    await expect(message(page)).toBeFocused();
    expect(await describedErrors(page, message(page))).toEqual([contactMessages.message.tooLong]);
  });

  test("valid request: sending, then the success state, with nothing sent", async ({ page }) => {
    const errors = collectErrors(page);
    const writes = recordWrites(page);
    await fillValid(page);
    await submit(page).click();

    await expect(submit(page)).toBeDisabled();
    await expect(submit(page)).toHaveText(/Sending/);

    await expect(success(page)).toBeVisible();
    await expect(success(page)).toContainText(SUCCESS);
    await expect(success(page).getByRole("heading", { name: SUCCESS })).toBeFocused();
    await expect(success(page)).not.toContainText(HUMAN_PROMISE);
    // What they sent, read back.
    await expect(success(page)).toContainText("Acme");
    await expect(success(page)).toContainText("10–100B");
    await expect(form(page)).toHaveCount(0);

    expect(writes.map((r) => `${r.method()} ${r.url()}`)).toEqual([]);
    expect(errors).toEqual([]);
  });

  test("Review Focus 5: two clicks in a row make one success state", async ({ page }) => {
    const writes = recordWrites(page);
    await fillValid(page);
    const button = submit(page);
    await button.click();
    // The second click lands while the first send is still running.
    await button.click({ force: true });
    await expect(button).toBeDisabled();
    await expect(success(page)).toHaveCount(1);
    await expect(page.getByRole("heading", { name: SUCCESS })).toHaveCount(1);
    expect(writes).toEqual([]);
  });

  test("Review Focus 5: a filled honeypot shows the same success and sends nothing", async ({
    page,
  }) => {
    const writes = recordWrites(page);
    await fillValid(page);
    const trap = page.locator('input[name="website"]');
    await expect(trap).toHaveAttribute("tabindex", "-1");
    await trap.fill("https://spam.example");
    await submit(page).click();
    await expect(success(page)).toContainText(SUCCESS);
    await expect(success(page).getByRole("heading", { name: SUCCESS })).toBeFocused();
    expect(writes).toEqual([]);
  });

  test("works from the keyboard alone", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "keyboard flow is a desktop concern");
    await email(page).focus();
    await page.keyboard.type("ana@acme.example");
    await page.keyboard.press("Tab");
    await page.keyboard.type("Acme");
    await page.keyboard.press("Tab");
    // Radio group: one tab stop, arrows pick.
    await page.keyboard.press("Space");
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("radio", { name: "1–10B" })).toBeChecked();
    await page.keyboard.press("Tab");
    await expect(caseField(page)).toBeFocused();
    await page.keyboard.press("Enter");
    await page.getByRole("option", { name: /^Batch/ }).press("Enter");
    await expect(caseField(page)).toContainText("Batch");
    await page.keyboard.press("Tab");
    await expect(message(page)).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(submit(page)).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(success(page)).toContainText(SUCCESS);
  });

  test("no horizontal scroll, with errors showing", async ({ page }, testInfo) => {
    const widths = testInfo.project.name === "mobile" ? [360, 412] : [1280, 1440];
    for (const width of widths) {
      await page.setViewportSize({ width, height: testInfo.project.name === "mobile" ? 800 : 720 });
      await page.goto("/enterprise/");
      await submit(page).click();
      await expect(form(page).locator('[data-slot="form-message"]')).toHaveCount(4);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${width}px`).toBeLessThanOrEqual(0);
    }
  });
});
