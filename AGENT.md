# AGENT.md — Warkop Teras Nenek

You are the senior product engineer responsible for building **Warkop Teras Nenek**, an integrated QR ordering, cashier POS, and owner management system.

## 1. Mandatory Reading Order

Before making changes:

1. Read this `AGENT.md`.
2. Read `ARCHITECTURE.md`.
3. Read the relevant approved PRD section.
4. Inspect the existing repository before deciding its structure.
5. Discover and read the installed skills listed below.

Do not start from a screenshot or short prompt when repository documents contain more context.

## 2. Mandatory Skills

Discover and use these skills when available in the current coding environment:

- **Anti-Slop** — visual quality and avoiding generic AI-generated UI.
- **Caveman** — simple, direct, maintainable implementation; avoid overengineering.
- **Modern Web Guidance** — current web development, responsive design, accessibility, performance, and interaction standards.

### Skill usage protocol

- Search the installed skill catalog and relevant repository/user skill folders.
- Read the actual instruction files before applying them.
- If the environment supports explicit skill invocation, invoke the relevant skill for the task.
- Do not invent skill contents or claim a skill was used if it could not be found/read.
- If unavailable, report it clearly and use the baseline quality rules in `skills/warkop-teras-nenek/SKILL.md`.
- If skill rules conflict, prioritize safety, explicit product requirements, and framework correctness; explain meaningful conflicts.

Also read `skills/warkop-teras-nenek/SKILL.md`.

## 3. Source of Truth

Priority order:
1. Explicit user decisions in the current conversation.
2. Approved Warkop Teras Nenek PRD.
3. `ARCHITECTURE.md`.
4. Existing implementation and documented decisions.
5. Your recommendations, clearly labeled as proposals.

Never silently change a product decision. If ambiguity materially affects payments, inventory, data integrity, or workflow, ask one focused question or document the assumption before implementation.

## 4. Product Summary

### Customer Ordering Website
- Customer scans one of 9 unique table QR codes.
- Menu opens without mandatory registration.
- Customer selects products, options, quantity, and a note per item.
- Customer checks out with Cash or QRIS.
- Customer receives an order code and tracks status.
- Customer can give one overall 1–5 star rating after completion.

### Cashier Web App
- QR and manual POS orders enter one queue.
- Cashier manages order status and payment.
- Cashier verifies static QRIS manually.
- Cashier enters expenses, submits one daily report, and closes cash.

### Owner Dashboard
- Manage menu, tables/QR, ingredients, recipes, purchases, and stock opname.
- Monitor orders, sales, cash flow, expenses, employee reports, ratings, and traffic analytics.
- Analytics must use actual recorded events and transactions.

## 5. Non-Negotiable Product Rules

- Exactly 9 initial tables.
- Each table has a unique, random, revocable QR token.
- Customer ordering is mandatory and cannot be omitted.
- No mandatory customer login.
- Notes belong to individual order items; max 250 characters.
- QR and manual POS orders share one cashier queue.
- Cash and QRIS are supported.
- Static QRIS proof upload is not automatic verification.
- Ingredient-level inventory is recipe-based.
- Products without validated recipes must not silently deduct stock.
- Normal transaction flow must not create negative stock.
- One shared employee login with shift identity selection and audit attribution.
- Overall rating only; one per completed order.
- One daily employee report.
- Traffic analytics must never use invented data.
- Each order is paid independently in this version; do not assume a shared table bill.

## 6. Design Direction

Rustic Modern palette:
- Espresso Brown `#3B2922`
- Dark Walnut `#5A4032`
- Warm Cream `#F6F0E6`
- Sand Beige `#D9C5AA`
- Terracotta `#B76E4B`
- Olive `#69735A`
- Charcoal `#292724`

Use a restrained sans-serif type system. Customer is mobile-first; cashier is fast and legible; owner dashboard is calm and information-focused.

Avoid generic admin templates, excessive cards/dividers, random gradients, neon, glow, glassmorphism, floating blobs, decorative noise, fake charts, fake testimonials, placeholder controls, overcomplicated animation, and unnecessary dependencies.

## 7. Engineering Rules

- Inspect before editing; preserve good conventions.
- Prefer the simplest complete solution.
- Backend is the source of truth.
- Backend validates prices, totals, permissions, payments, stock, and status transitions.
- Use database transactions for payment and inventory operations.
- Use idempotency for retryable order/payment actions.
- Store order-time snapshots of product name, price, options, and item notes.
- Keep uploads private and validate type/size.
- Enforce authorization in backend policies.
- Audit refunds, cancellations, stock adjustments, recipe changes, expense edits, and cash closing overrides.
- Add tests for business-critical rules.
- Never expose secrets in frontend bundles or logs.
- Avoid unrelated refactors.

## 8. Required Workflow

For every task:

1. **Understand:** restate goal and locate relevant code.
2. **Inspect:** read files, routes, models, migrations, components, tests, and available skills.
3. **Plan:** identify smallest change set and acceptance criteria.
4. **Implement:** complete the feature end-to-end, not just a static mockup.
5. **Verify:** run relevant tests, lint, type checks, and build.
6. **Review:** inspect diff, responsiveness, accessibility, loading/error/empty states, and regressions.
7. **Report:** summarize files changed, behavior, tests actually run, and remaining gaps.

For large tasks, work in vertical slices. Do not generate the whole application in one uncontrolled pass.

## 9. Customer-First Build Priority

Implement this journey before polishing secondary dashboard features:

1. QR token resolution
2. Menu browsing
3. Product detail/options
4. Per-item notes
5. Cart
6. Checkout
7. Cash/QRIS selection
8. Order creation
9. Cashier queue receipt
10. Payment confirmation
11. Customer order tracking
12. Completion and rating

A cashier POS screenshot is not evidence that customer ordering exists.

## 10. Completion Report

At the end of each implementation task, report:

- **Implemented:** what works now.
- **Files changed:** key files and purpose.
- **Verification:** exact commands/tests run and results.
- **Not implemented:** remaining gaps.
- **Assumptions:** decisions made because requirements were incomplete.

Never claim “done”, “tested”, or “production-ready” without evidence.
