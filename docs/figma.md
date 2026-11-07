# Figma

The design system and the screens live in one Figma file:

**https://www.figma.com/design/kOGHETj4K8DtaJiyTHReaz**

Last updated 2026-11-07. The code is the source of truth: when a token changes in
`src/app/globals.css`, change the Figma variable or style of the same name.

## Pages

| Page            | What it holds                                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Foundations** | The token sheet (frame `Foundations`, node `3:9`): colors, radii, spacing and the type scale.                             |
| **Components**  | The board `Weir / Components` (node `10:23`) with every component below, each next to the source file it mirrors.         |
| **Screens**     | The frame `Screens` (node `10:22`): the six pages captured from the static build at 1440 px, and the home page at 390 px. |

### Components

All fills, strokes and radii are bound to the variables below, and every text layer uses
a text style. Everything is built with auto layout. No shadows, same as the site.

| Component  | Node                          | Variants                                                                                                  | Mirrors                                                  |
| ---------- | ----------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Button     | `10:53`                       | Variant (Primary, Outline, Ghost) × Size (Default, Small) × State (Default, Hover); `Label` text property | `src/components/ui/button.tsx`                           |
| Status dot | `10:63`                       | State (ok, live, error)                                                                                   | `src/components/site/StatusDot.tsx`                      |
| Badge      | `10:73`                       | Type (Task, Status); `Label` text property                                                                | `src/components/ui/badge.tsx`                            |
| Code panel | `10:77`                       | — (curl tab active, highlighted chat request)                                                             | `src/components/code/CodePanel.tsx`, `CodeTabs.tsx`      |
| Stat       | `10:102`                      | Size (Compact, Large)                                                                                     | `HeroTerminal.tsx` readouts, `MetricsChart.tsx` median   |
| Table row  | `10:158`                      | Type (Header, Default, Hover)                                                                             | `src/components/models/CatalogTable.tsx`, `ui/table.tsx` |
| Logo       | `10:162`                      | —                                                                                                         | `src/components/site/Logo.tsx`                           |
| Nav link   | in `Section / Nav` (`10:159`) | State (Default, Hover, Current); `Label` text property                                                    | `src/components/site/NavLinks.tsx`                       |
| Nav        | `10:175`                      | — (1440 px header built from Logo, Nav link and Button instances)                                         | `src/components/site/Header.tsx`                         |

Two values are fixed instead of bound, because they are `color-mix()` in CSS and have no
token: the Primary button's hover fill and the Outline button's hover border.

### Screens

Captured with Figma's `generate_figma_design` from `out/` served locally, with
`prefers-reduced-motion: reduce` so the hero terminal shows its finished reply. They are
flat reference frames (not built from the components) and do not update when the site
changes; capture again after a visual change.

`/`, `/models/`, `/models/llama-3-3-70b/`, `/pricing/`, `/enterprise/`,
`/docs/quickstart/` at 1440 px, and `/` at 390 px.

## Variables and the CSS tokens

### `Weir / Color` (12 variables)

Each `color/<name>` is the CSS custom property `--color-<name>` in `@theme`:

| Figma               | CSS                   | Value     |
| ------------------- | --------------------- | --------- |
| `color/canvas`      | `--color-canvas`      | `#0c0e0d` |
| `color/surface`     | `--color-surface`     | `#121513` |
| `color/surface-2`   | `--color-surface-2`   | `#171a18` |
| `color/line`        | `--color-line`        | `#232825` |
| `color/line-strong` | `--color-line-strong` | `#333a36` |
| `color/fg`          | `--color-fg`          | `#e6ebe7` |
| `color/fg-2`        | `--color-fg-2`        | `#a7b0aa` |
| `color/fg-3`        | `--color-fg-3`        | `#6d7770` |
| `color/amber`       | `--color-amber`       | `#ffb547` |
| `color/amber-ink`   | `--color-amber-ink`   | `#1a1204` |
| `color/ok`          | `--color-ok`          | `#5fbf8a` |
| `color/err`         | `--color-err`         | `#e5675a` |

`--color-syntax-string` (`#8fd1a8`, strings in code panels) has no variable; the Code
panel uses the literal value.

### `Weir / Tokens` (12 variables)

| Figma                   | CSS                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------- |
| `radius/control` (6)    | `--radius-sm`, `--radius-md`, `--radius-lg` (`rounded-sm/md/lg`): buttons, fields, badges               |
| `radius/panel` (10)     | `--radius-panel` and `--radius-xl` and up (`rounded-panel`): panels                                     |
| `space/4` … `space/128` | Tailwind's spacing scale, where one step is 4 px: `space/4` = `1`, `space/16` = `4`, `space/128` = `32` |

### Text styles

| Figma                                                                                                                                                                                             | CSS                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Weir/Display`, `Weir/H2`, `Weir/H3`, `Weir/Body`, `Weir/Small`, `Weir/Label`, `Weir/Code`                                                                                                        | `--text-display`, `--text-h2`, `--text-h3`, `--text-body`, `--text-small`, `--text-label`, `--text-code`, with their line height and tracking                                                                                                                                                             |
| `Size/<step>` (18 styles: `micro`, `caption`, `meta`, `ui`, `lede`, `h4`, `logo`, `figure-xs`, `stat`, `price`, `figure-sm`, `figure`, `figure-lg`, `menu`, `h2-sm`, `title-sm`, `title`, `hero`) | `--text-<step>`, size only. Line height is Auto and tracking 0, as in CSS, where they come from the element. The family is the one the step is usually set in: Azeret Mono for the small mono steps and the figures, Funnel Sans for `ui` and `lede`, Funnel Display for the headings, `logo` and `menu`. |
