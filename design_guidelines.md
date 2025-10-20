# Design Guidelines: Transnistrian Ruble Exchange Rate Dashboard

## Design Approach: Utility-First Data Dashboard

**Selected Approach:** Design System - shadcn/ui with Tailwind CSS
**Justification:** This is a data-intensive financial tool where clarity, readability, and usability are paramount. Users need quick access to exchange rates and historical trends. The design should support efficient data consumption rather than emotional engagement.

**Key Design Principles:**
- Data visibility first - minimize visual noise
- Clear information hierarchy
- Professional, trustworthy appearance appropriate for financial data
- Responsive design optimized for both desktop analysis and mobile quick-checks

## Core Design Elements

### A. Color Palette

**Light Mode:**
- Background: 0 0% 100% (pure white)
- Card/Surface: 0 0% 98% (subtle off-white)
- Primary: 222 47% 11% (dark slate for text and primary actions)
- Muted: 210 40% 96% (light gray for secondary surfaces)
- Border: 214 32% 91% (subtle borders)
- Accent: 217 91% 60% (professional blue for interactive elements)

**Dark Mode:**
- Background: 222 47% 11% (deep slate)
- Card/Surface: 217 33% 17% (elevated dark surface)
- Primary: 210 40% 98% (light text)
- Muted: 217 33% 25% (muted dark surface)
- Border: 217 33% 25% (subtle dark borders)
- Accent: 217 91% 60% (same professional blue)

**Chart Colors (Multi-Currency):**
- EUR: 142 76% 36% (emerald green)
- USD: 221 83% 53% (royal blue)
- RUB: 0 84% 60% (vibrant red)
- Additional currencies: 45 93% 47% (amber), 280 81% 48% (purple), 168 76% 42% (teal)

### B. Typography

**Font Families:**
- Primary: Inter (via Google Fonts) - excellent for data and UI
- Monospace: JetBrains Mono - for numerical data and rates

**Type Scale:**
- Hero/Title: text-4xl font-bold (36px) - Page title
- Section Headers: text-2xl font-semibold (24px)
- Card Titles: text-lg font-medium (18px)
- Body: text-base (16px)
- Table Data: text-sm font-mono (14px monospace)
- Captions: text-xs text-muted-foreground (12px)

### C. Layout System

**Spacing Scale:** Use Tailwind units of 4, 6, 8, 12, 16 for consistent rhythm
- Component padding: p-6 (24px)
- Section spacing: space-y-8 (32px between sections)
- Card gaps: gap-4 (16px)
- Dense data areas: gap-2 (8px)

**Container:**
- Max width: max-w-7xl mx-auto
- Page padding: px-4 md:px-6 lg:px-8
- Vertical spacing: py-8 md:py-12

**Grid System:**
- Exchange rate boxes: 2-column grid on desktop (grid-cols-1 md:grid-cols-2 gap-4)
- All content stacks to single column on mobile

### D. Component Library

**1. Exchange Rate Cards (Hero Elements):**
- Large, prominent cards with subtle shadow
- Display: Currency pair (PMR → EUR/USD) as title
- Large rate number in monospace font (text-5xl font-mono font-bold)
- Small trend indicator if applicable (% change)
- Update timestamp in muted text
- Background: card color with border
- Padding: p-8

**2. Data Table:**
- Library: TanStack Table or similar React table library
- Styling: Clean rows with hover states, zebra striping optional
- Headers: Sticky on scroll, font-semibold, border-b-2
- Cells: Align numbers right, text left, consistent padding (px-4 py-3)
- Monospace font for all numerical values
- Responsive: Horizontal scroll on mobile with sticky first column

**3. Chart Component:**
- Library: Recharts (React-friendly, clean aesthetics)
- Chart type: Multi-line chart with smooth curves
- Grid: Subtle horizontal gridlines only
- Legend: Top-right with colored dots matching line colors
- Tooltips: Show exact values on hover with date and all selected currencies
- Axes: Clean labels, no excessive tick marks
- Responsive height: h-[400px] md:h-[500px]

**4. Date Range Selector:**
- Two date inputs side by side on desktop, stacked on mobile
- Clear labels: "From Date" and "To Date"
- Modern date picker UI (shadcn/ui date picker)
- Default values displayed clearly

**5. Currency Multi-Select:**
- Checkboxes or multi-select dropdown
- Each currency with its assigned color indicator
- Minimum 1 selection enforced
- Clear visual feedback for selected currencies

**6. Page Header:**
- Title: "Transnistrian Ruble Exchange Rates"
- Dynamic date display: "Data for [Month Day, Year]"
- Brief description: "Live PMR exchange rates and historical trends"
- Clean typography with subtle bottom border or spacing

### E. Interaction & Motion

**Minimal Animations:**
- Chart line drawing: Subtle 300ms ease-in animation on load
- Hover states: Background color transitions (150ms)
- Loading states: Simple spinner, no skeleton screens needed
- No page transitions or scroll animations

## Layout Structure

**Page Organization (Top to Bottom):**
1. **Header Section** (py-8): Title, date, description
2. **Exchange Rate Cards** (2-column grid): EUR and USD rates, prominent display
3. **Today's Full Data Table**: All currencies in tabular format with sorting
4. **Historical Chart Section**: Date selectors + currency selector + line chart
5. **Footer** (py-6): Simple, minimal - source attribution if needed

**Visual Hierarchy:**
- Exchange rate cards are the primary focus - largest, most prominent
- Table provides comprehensive current data - secondary importance
- Chart enables historical analysis - tertiary, requires user interaction

## Images

**No hero image needed** - This is a data dashboard where information density and clarity take priority over visual storytelling. The exchange rate cards serve as the visual anchor.

## Accessibility & Quality

- All form controls properly labeled
- Chart data accessible via table alternative
- Color combinations meet WCAG AA contrast ratios
- Focus indicators visible on all interactive elements
- Consistent dark mode throughout including inputs and tables