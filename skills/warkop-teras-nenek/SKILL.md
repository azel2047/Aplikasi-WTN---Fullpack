---
name: warkop-teras-nenek
description: Build and maintain the Warkop Teras Nenek QR ordering, cashier POS, inventory, finance, and owner dashboard system according to its PRD and architecture.
---

# Warkop Teras Nenek — Project Skill

## Mission

Implement the product as a coherent web system. Follow root `AGENT.md` and `ARCHITECTURE.md`. This project skill complements, and does not replace, general security, accessibility, and framework guidance.

## Required Skill Discovery

Before substantial UI or implementation work:

1. Inspect the agent's installed skill catalog and repository skill directories.
2. Search for exact or closest available skills:
   - `Anti-Slop` / `antislop`
   - `Caveman` / `caveman`
   - `Modern Web Guidance` / `modern-web-guidance`
3. Read the actual instruction files before claiming to use them.
4. Apply relevant guidance to planning, implementation, and review.
5. If unavailable, state that it was not found. Never fabricate its contents.
6. If rules conflict, prioritize safety, explicit project requirements, and framework correctness.

Check environment-specific locations such as `.agents/skills/`, `.claude/skills/`, `.cursor/skills/`, `.codex/skills/`, and user-level installed skill catalogs. Do not assume one agent's path or command works in another.

## Anti-Slop Quality Bar

Apply the actual Anti-Slop skill if installed. Baseline:
- No generic template-like dashboard composition.
- No random gradients, neon, glow, glassmorphism, floating blobs, or decorative noise.
- No arbitrary icon usage or emoji replacing meaningful UI.
- No fake testimonials, ratings, analytics, or business records.
- No meaningless labels, placeholder copy, or lorem ipsum in finished screens.
- No excessive cards, dividers, badges, or oversized headings.
- Every visible control has a real action or is disabled with a clear reason.
- Avoid unnecessary abstraction and speculative features.

## Caveman Implementation Discipline

Apply the actual Caveman skill if installed. Baseline:
- Prefer the simplest implementation that satisfies the requirement.
- Read existing code before changing it.
- Reuse good existing components and patterns.
- Avoid needless wrappers, factories, generic frameworks, and premature abstractions.
- Keep functions and components focused.
- Do not create multiple sources of truth.
- Do not add dependencies for problems already solved by the stack.
- Do not refactor unrelated areas.
- Explain tradeoffs briefly when choosing complexity.

## Modern Web Guidance

Apply the actual Modern Web Guidance skill if installed. Baseline:
- Use semantic HTML and accessible interaction patterns.
- Build customer experience mobile-first.
- Handle loading, empty, error, success, disabled, and offline states.
- Use proper form labels, validation messages, focus states, and keyboard support.
- Optimize images and avoid layout shifts.
- Avoid unnecessary client-side JavaScript.
- Use server rendering/server components where appropriate for the actual Next.js version.
- Keep secrets and privileged logic on the server.
- Respect reduced-motion preferences.
- Test narrow mobile and desktop widths.

## Product Invariants

1. Exactly 9 initial tables.
2. Each table has a unique, opaque, revocable QR token.
3. Customer orders on the customer website without mandatory login.
4. Notes are per order item, max 250 characters.
5. QR and manual POS orders enter one cashier queue.
6. Cash and QRIS are supported.
7. Static QRIS proof upload does not mean payment success.
8. Inventory is ingredient-based and recipe-driven.
9. Products without validated recipes do not automatically deduct stock.
10. Normal order flow must not make stock negative.
11. Employee login is shared; select employee identity per shift and audit actions.
12. Rating is overall, 1–5 stars, one per completed order.
13. Employee report is daily.
14. Owner analytics use actual recorded data and disclose insufficient history.
15. Payments are per order in this version; do not invent shared table settlement.

## Workflow for Every Task

### Before coding
- Read `AGENT.md`, `ARCHITECTURE.md`, and relevant PRD sections.
- Inspect current repository conventions.
- Locate relevant routes, components, API endpoints, migrations, models, and tests.
- Identify which skills and dependencies actually exist.
- For multi-file/business-critical changes, write a short plan and acceptance criteria.

### During coding
- Implement the smallest complete vertical slice.
- Keep UI, API, and database contracts aligned.
- Put business rules in backend services/domain layer, not frontend-only logic.
- Validate all user-controlled input on backend.
- Use transactions for financial and inventory mutations.
- Make retryable operations idempotent.
- Preserve order-time snapshots.
- Add tests for business rules and failure paths.
- Do not replace working files wholesale without inspection.

### After coding
- Run relevant tests, lint, type checks, and build.
- Fix errors introduced by the change.
- Inspect diff for unrelated changes, debug code, secrets, and dead UI.
- Report exactly what changed, what was tested, and what remains incomplete.
- Never claim a test passed if it was not run.

## UI Craft Rules

Brand palette:
- Espresso Brown `#3B2922`
- Dark Walnut `#5A4032`
- Warm Cream `#F6F0E6`
- Sand Beige `#D9C5AA`
- Terracotta `#B76E4B`
- Olive `#69735A`
- Charcoal `#292724`

Customer:
- One-handed mobile use.
- Show table context clearly, e.g. “Meja 04”.
- Make product selection, customization, and cart actions obvious.
- Preserve item notes in cart and cashier detail.
- Show total and payment method before submission.
- Provide order code and status after submission.
- Do not force registration.

Cashier:
- Optimize for speed under real service conditions.
- Prioritize new orders and actionable statuses.
- Show item notes prominently.
- Make payment verification explicit.
- Confirm destructive/financial actions.
- Show connection state if realtime updates fail.

Owner:
- Prioritize meaningful business information over decorative charts.
- Label date ranges and units.
- Explain empty or insufficient data.
- Distinguish sales, stock purchases, COGS, expenses, and cash balance.

## Data and Security

- Backend recalculates money values.
- Never trust browser-submitted prices or totals.
- Protect public order lookup with unguessable codes/tokens.
- Authorize every internal API operation.
- Keep payment evidence and report attachments private.
- Validate file types and sizes.
- Never log passwords, tokens, payment secrets, or sensitive file URLs.
- Use database constraints and transactions for inventory/payment integrity.
- Audit refunds, cancellations, stock adjustments, recipe changes, expense edits, and cash closing overrides.

## Definition of Done

A task is complete only when acceptance criteria pass, the feature works with real API behavior or is explicitly labeled prototype, backend validation/authorization exist, edge cases are handled, responsive/accessibility checks are done, relevant tests have run, and no fake data is represented as real.
