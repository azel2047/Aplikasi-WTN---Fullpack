---
name: Warkop Teras Nenek
colors:
  surface: '#fef8f3'
  surface-dim: '#ded9d4'
  surface-bright: '#fef8f3'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f8f3ed'
  surface-container: '#f3ede8'
  surface-container-high: '#ede7e2'
  surface-container-highest: '#e7e1dd'
  on-surface: '#1d1b18'
  on-surface-variant: '#54433d'
  inverse-surface: '#32302d'
  inverse-on-surface: '#f6f0eb'
  outline: '#87736c'
  outline-variant: '#d9c2b9'
  surface-tint: '#914b2d'
  primary: '#854225'
  on-primary: '#ffffff'
  primary-container: '#a3593a'
  on-primary-container: '#ffece6'
  inverse-primary: '#ffb598'
  secondary: '#755849'
  on-secondary: '#ffffff'
  secondary-container: '#ffd8c4'
  on-secondary-container: '#795c4d'
  tertiary: '#4d5841'
  on-tertiary: '#ffffff'
  tertiary-container: '#667158'
  on-tertiary-container: '#e8f5d6'
  error: '#B3402E'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbce'
  primary-fixed-dim: '#ffb598'
  on-primary-fixed: '#370e00'
  on-primary-fixed-variant: '#743418'
  secondary-fixed: '#ffdbca'
  secondary-fixed-dim: '#e4bfac'
  on-secondary-fixed: '#2b170b'
  on-secondary-fixed-variant: '#5b4133'
  tertiary-fixed: '#dbe7c8'
  tertiary-fixed-dim: '#bfcbad'
  on-tertiary-fixed: '#151e0b'
  on-tertiary-fixed-variant: '#404a34'
  background: '#fef8f3'
  on-background: '#1d1b18'
  surface-variant: '#EFE6D8'
  nav-espresso: '#3B2922'
  canvas-cream: '#F6F0E6'
  surface-cream: '#FFFCF7'
  accent-terracotta: '#B76E4B'
  border-sand: '#D9C5AA'
  border-strong: '#9C8570'
  primary-subtle: '#F3DDD0'
  on-primary-subtle: '#7A3F27'
  success-subtle: '#E4E8DA'
  warning: '#7A5A0A'
  warning-subtle: '#F6E7BF'
  error-subtle: '#F5DAD3'
  text-muted: '#7A6757'
typography:
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  caption:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-tablet: 1.25rem
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

The design system embodies **Rustic Modern with Soft UI lightness**—anchored in warmth, natural hospitality, and operational speed. It rejects sterile, generic SaaS dashboards and overly slick tech metaphors in favor of an organic, communal warkop atmosphere. The aesthetic feels like sitting on an Indonesian terrace drinking kopi tubruk: earth-toned, human, grounded, yet exceptionally sharp and practical for active cashier shifts and self-service QR ordering.

The interface serves baristas, busy cashiers handling tablet terminals with flour- or water-dusted hands, and warkop patrons ordering directly from mobile browsers. Clarity under fast-paced service conditions takes absolute priority. Visual elements balance warm tactile surfaces (warm cream backdrops, soft terracotta accents, and deep espresso navigational containers) with clear hierarchy, large hit targets, and distinct operational states.

## Colors

The color palette is built on earthy, organic pigments with strict functional discipline:

- **Primary (`#A3593A`)**: A calibrated deep terracotta used strictly for the single primary call to action per viewport (e.g., "Bayar", "Tandai Lunas", "Kirim Pesanan"). It guarantees WCAG AA contrast (≥ 4.5:1) against `#FFFCF7`.
- **Secondary (`#5A4032`)**: Dark walnut brown used for structural metadata, secondary controls, and strong structural boundaries.
- **Tertiary (`#556048`)**: A muted deep olive green reserved for positive order statuses ("Siap Disajikan", "Selesai"), success states, and fulfillment confirmation.
- **Neutral (`#292724`)**: Deep charcoal earth tint. Pure black (`#000000`) and pure cold white (`#FFFFFF`) are strictly forbidden across backgrounds, text, and surfaces.
- **Navigation & Surfaces**: Navigation rails and sidebar bars use dark espresso (`#3B2922`), the app canvas sits on warm cream (`#F6F0E6`), and elevated cards occupy soft warm white (`#FFFCF7`).
- **Status Hygiene**: Status indicators must never rely on color alone; every state change combines a container tint, an explicit icon, and a localized text badge.

## Typography

Typography relies on **Plus Jakarta Sans** across all levels, tuned specifically for dense transactional speed, legible menu item names, and clear cashier auditing.

- **Currency & Numerics**: All price displays, bill totals, order codes, and queue counters must activate tabular figures (`font-variant-numeric: tabular-nums`) with standardized Indonesian Rupiah formatting (e.g., `Rp 18.000`, `Rp 145.500`).
- **Hierarchy Rules**: Line heights are snapped strictly to multiples of 4px. Captions and labels never drop below 12px to guarantee immediate readability under varied tablet lighting and angled perspectives.
- **Copywriting**: All system text is rendered in direct, natural Bahasa Indonesia without corporate jargon or placeholder text.

## Layout & Spacing

The spatial engine utilizes an uncompromising **4px base grid** optimized for point-of-sale efficiency and mobile-first self-ordering.

- **Tablet POS Landscape (1280×800 primary)**:
  - Persistent vertical navigation rail: fixed `88px` width.
  - Dynamic catalog & order-management canvas: flexible fluid column layout.
  - Active ticket & checkout sidebar: fixed `360px` or `400px` right sheet.
- **Mobile QR Ordering (Single Column)**:
  - Sticky summary bottom bar with 48px touch controls.
  - Fluid product listing with single- or two-column responsive reflow.
- **Touch Target Rule**: Primary operational triggers (numpad buttons, quantity steppers, cart items, payment method selectors) require a strict minimum touch boundary of **44px × 44px**, with the default POS input and action height set to **48px**.

## Elevation & Depth

This system avoids heavy shadows, glassmorphism, blur effects, or bright saturated glows. It creates soft spatial depth through layered organic surfaces and subtle boundary definitions:

- **Surface Tiers**: Base app canvas sits on Warm Cream (`#F6F0E6`). Interactive modules, item cards, and bill listings live on Soft Cream Surface (`#FFFCF7`), creating organic contrast without harsh elevation changes.
- **Borders as Structure**: Cards and panels rely on a 1px solid border in Sand Beige (`#D9C5AA`). Active, highlighted, or selected states elevate to Dark Walnut or Terracotta outlines (`#9C8570` / `#A3593A`).
- **Ambient Soft Shadow**: For floating checkout bars, drawer panels, and interactive cards, depth is rendered exclusively via dual low-opacity warm-tinted shadows:
  - `0 1px 2px rgba(59, 41, 34, 0.05), 0 8px 20px rgba(59, 41, 34, 0.06)`
- **Flat Discipline**: Avoid nesting cards inside cards. Organize item rows within a single surface card using structural dividers or alternating background strips (`#EFE6D8`).

## Shapes

The design uses a balanced rounded geometry (level 2) to maintain a warm, approachable artisanal feel while keeping the efficiency of a POS terminal.

- **Components**: Standard buttons, input fields, dropdown triggers, and numeric POS keypads use `12px` (`rounded-md`).
- **Structural Containers**: Product cards, receipt panels, and modal containers use `16px` to `20px` (`rounded-lg`).
- **Nested Corner Rule**: To maintain harmonious nested curves, inner elements conform to $R_{inner} = R_{outer} - Padding$. For a card with `rounded-lg` (20px) and `12px` padding, inner product thumbnails use `8px` corner radius.
- **Pill Elements**: Stepper buttons, category filter chips, search pills, customer counter tags, and status badges use full rounded pill treatment (`rounded-full` / 9999px).

## Components

### Buttons
- **Primary**: Terracotta (`#A3593A`) background, `#FFFCF7` text, 48px height, 12px corner radius. Reserved for the single decisive forward step on screen (e.g., "Bayar Rp 45.000", "Kirim ke Bar"). On hover: `#8F4C31`. Active press: scale 0.98.
- **Secondary**: Surface cream (`#FFFCF7`) background with 1px border (`#D9C5AA`) and dark walnut text (`#292724`). 48px height.
- **Ghost / Tertiary**: Transparent background with text-secondary (`#5A4032`), used for secondary dismissals or table swaps.
- **Touch Target**: Any icon-only button must enforce a minimum hit area of 44px × 44px.

### Category Chips & Filters
- **Default**: Background `#EFE6D8`, text `#5A4032`, full pill radius, height 40px, horizontal padding 16px.
- **Selected**: Background Espresso `#3B2922`, text `#F6F0E6`, font weight 600.

### Product Card (Catalog)
- Warm surface (`#FFFCF7`), 1px border `#D9C5AA`, 16px corner radius.
- 4:3 product image ratio with warm, natural lighting.
- Title in `title-md`, price in `label-lg` with `font-variant-numeric: tabular-nums`.
- Bottom right quick-add action: 44px circular trigger with `+` glyph.
- **Out-of-Stock State**: Image opacity reduced to 45%, 1px grayscale filter, prominent "Stok Habis" badge in neutral charcoal, add button disabled.

### Stepper (Quantity Modifier)
- Circular plus and minus buttons (44px × 44px) with 1.5px border in `#A3593A`, containing bold primary icons. Center numeric display uses 16px bold tabular figures with a minimum width of 32px.

### Input Fields & Keypad
- Height 48px, background `#FFFCF7`, border 1.5px `#D9C5AA`, text `#292724`. Focused state uses border `#A3593A` with a 2px soft ring tint. Labels sit cleanly above inputs in `label-md`.

### Status Badges
- Pill-shaped badge containing both an icon and capitalized Indonesian copy:
  - *Menunggu*: Background `#F6E7BF`, Text `#7A5A0A`, Clock icon.
  - *Diproses*: Background `#F3DDD0`, Text `#7A3F27`, Flame/Brew icon.
  - *Siap Disajikan*: Background `#E4E8DA`, Text `#556048`, Bell icon.
  - *Lunas*: Background `#E4E8DA`, Text `#556048`, Checkmark icon.
  - *Dibatalkan*: Background `#F5DAD3`, Text `#B3402E`, Cross icon.

### Sensitive Cashier Modals
- Actions concerning item cancellation, order refunds, price overrides, or till closing require a PIN entry sheet accompanied by a mandatory reason selector and timestamped operator attribution.