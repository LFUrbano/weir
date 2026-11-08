import { expect, test } from "@playwright/test";

// Temporary: widths of the fallback faces on this machine.
test("probe fallback widths", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop");
  await page.goto("/docs/quickstart/");
  const r = await page.evaluate(async () => {
    await document.fonts.ready;
    const st = document.createElement("style");
    st.textContent = `@font-face{font-family:PR;src:local("Roboto"),local("Roboto Regular"),local("Roboto-Regular");font-weight:100 900}`;
    document.head.append(st);
    await document.fonts.load("16px PR");
    await document.fonts.load("600 16px PR");
    const s = document.createElement("span");
    s.style.cssText = "position:absolute;white-space:pre;font-size:100px";
    document.body.append(s);
    const t = "In the dashboard, open API keys, choose Create key and name it after the app 0123456789";
    const out: Record<string, number> = {};
    for (const fam of ["Funnel Sans", "PR", "Funnel Sans Fallback", "Funnel Sans Fallback Arial", "Azeret Mono", "Azeret Mono Fallback"]) {
      for (const w of [400, 600]) {
        s.style.fontFamily = `"${fam}"`;
        s.style.fontWeight = String(w);
        s.textContent = t;
        out[`${fam} ${w}`] = Math.round(s.getBoundingClientRect().width * 10) / 10;
      }
    }
    const faces = [...document.fonts].filter((f) => /Fallback|PR/.test(f.family)).map((f) => `${f.family}:${f.status}`);
    return { out, faces, dpr: devicePixelRatio };
  });
  expect(JSON.stringify(r)).toBe("");
});
