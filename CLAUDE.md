# CLAUDE.md — GXP Super Admin Dashboard (Frontend)

Internal platform dashboard (Next.js) where GXP staff manage hotels, plans, subscriptions, and notifications. Epic markdown files are the source of truth for features; this file is the standing law between them.

## Stack & conventions

- Next.js App Router. Brand tokens: navy `#0E2A47` (primary), gold `#C8A24A` (accent — sparingly; never gold text on white, it fails contrast).
- Permission-gated everything: nav items, pages, and actions render only if the admin holds the permission (`plans.read`, `hotels.create`, ...). Follow the existing gating pattern — never ship an ungated admin surface.
- Established UI decisions (keep consistent): onboarding wizard lives at `/hotels/new` (dedicated page, stepper keeps state across validation errors); notification detail opens as a **wide modal** from the log table; one-time secrets (setup links) show once with a copy button and an explicit "won't be shown again" warning.

## i18n & RTL (Epic 07 rules)

- Full UI bilingual AR/EN via the i18n setup (namespaced locale files). **No hardcoded user-facing strings — ever.** New keys go in both locales; the completeness check must pass.
- Language preference: cookie pre-login, admin profile `preferred_language` after login (profile wins).
- RTL: logical properties / direction-aware utilities only (`ms-`/`me-`/`ps-`/`pe-`), no hardcoded left/right. Directional icons mirror; non-directional don't.
- Bidi isolation (`<bdi>` / `unicode-bidi: isolate`) around LTR values inside Arabic text: emails, slugs, URLs, permission keys. Permission keys always render as LTR code style, untranslated; their descriptions are translated.
- Latin digits (0-9) in both languages. Arabic plurals via ICU (6 forms) — never hand-rolled `count === 1` logic. Arabic copy register: professional فصحى مبسطة.
- API errors map from **stable error codes** to translated strings — raw backend messages must never leak into the UI.

## Data & display rules

- Bilingual data fields (`name_en`/`name_ar`) always both shown in forms, Arabic inputs `dir="rtl"` — independent of UI language.
- Derived values come from the API, not client math (e.g., hotel room counts, usage vs. limits). Usage indicators turn amber at >80% of any plan limit.
- Trial/status badges follow established styles (gold trial badge, muted archived with restore action).
- Destructive-red styling only for genuinely irreversible/blocking actions; reversible ones (archive, suspend, disable) don't use it.

## Quality bar

- Confirmation dialogs for consequential actions state impact counts ("affects N hotels") — established pattern, keep it.
- 409 guard responses render their details (violating items, counts) — never a generic "something went wrong".
- Component/unit tests for new logic; i18n key parity check passes; TypeScript build clean — always.

## Specs

Feature specs live in the backend repo (`hotello-backend`) under `/specs`. Before
planning or implementing any feature, read its epic file fully — it is the source of
truth. Durable decisions made during Q&A go back into the epic file.

## Workflow (pre-production convention — revisit at launch)

- All work happens directly on `master`. No feature branches, no stacked epic
  branches, no worktrees.
- Small, clear commits per task; push to origin after each verified green
  state — `origin/master` always holds the latest work.
- Quality gates never relax: `npm test` + `npm run build` (includes the i18n
  completeness check) must be green before every push. Never push red.
- Changes spanning repos land backend-first, then the frontends.
