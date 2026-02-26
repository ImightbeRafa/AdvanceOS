# AdvanceOS — Complete Codebase Summary

> **Purpose**: This document provides a complete, detailed summary of the AdvanceOS web application codebase — a business management system for "Agencia Ian", a digital marketing agency based in Costa Rica. This summary is intended to be consumed by an AI model for analysis, comparison, and feedback.

---

## 1. PROJECT OVERVIEW

**AdvanceOS** is an internal operations platform for a marketing agency that sells two main services:
- **Advance90**: A 90-day content + ads program for businesses
- **Meta Advance**: A Meta (Facebook/Instagram) advertising management service

The platform manages the complete lifecycle: from sales prospecting (sets → deals) → client onboarding → project delivery → accounting & payroll.

**Language**: All UI text is in **Spanish** (Latin American / Costa Rican dialect).

---

## 2. TECH STACK

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router, Server Components, Server Actions) | 16.1.6 |
| React | React 19 with React Compiler | 19.2.3 |
| Language | TypeScript (strict mode) | ^5 |
| Styling | Tailwind CSS v4 + shadcn/ui (new-york style) | ^4 |
| Database / Auth | Supabase (PostgreSQL, Supabase Auth, RLS) | ^2.97.0 |
| Forms | React Hook Form + Zod validation | ^7.71.2 / ^4.3.6 |
| State (client) | Zustand (currency store) | ^5.0.11 |
| State (server) | TanStack React Query | ^5.90.21 |
| Dates | date-fns with Spanish locale | ^4.1.0 |
| Charts | Recharts (imported but not heavily used yet) | ^3.7.0 |
| Icons | Lucide React | ^0.575.0 |
| Notifications | Sonner (toast notifications) | ^2.0.7 |
| Command palette | cmdk | ^1.1.1 |
| Fonts | Geist Sans + Geist Mono (Google Fonts) |

**Build**: Turbopack (via `next dev` / `next build`)
**React Compiler**: Enabled (`reactCompiler: true` in next.config.ts)

---

## 3. ARCHITECTURE OVERVIEW

```
├── middleware.ts              ← Auth guard (redirects unauthenticated users)
├── src/app/
│   ├── (auth)/                ← Public auth pages (login, register)
│   ├── (dashboard)/           ← Protected dashboard pages
│   │   ├── layout.tsx         ← Fetches profile, notifications → DashboardShell
│   │   ├── page.tsx           ← Role-based home dashboard
│   │   ├── ventas/            ← Sales pipeline
│   │   ├── clientes/          ← Client management
│   │   ├── equipo/            ← Team + payroll management
│   │   ├── contabilidad/      ← Accounting dashboard
│   │   └── ajustes/           ← User settings
│   ├── api/                   ← API routes (exchange rate, daily notifications cron)
│   └── auth/callback/         ← OAuth callback handler
├── src/components/            ← All React components
├── src/lib/
│   ├── actions/               ← Server Actions (7 files)
│   ├── constants/             ← Business logic constants
│   ├── schemas/               ← Zod validation schemas
│   ├── hooks/                 ← Custom React hooks
│   ├── supabase/              ← Supabase client factories
│   ├── providers/             ← React Query provider
│   └── utils/                 ← Currency & date utilities
├── src/types/                 ← TypeScript interfaces
└── supabase/migrations/       ← Database schema (3 SQL files)
```

### Data Flow Pattern
1. **Page components** (Server Components) fetch data from Supabase directly and pass as props
2. **Client components** receive data as props and handle interactivity
3. **Mutations** use Next.js Server Actions (`'use server'`) which call Supabase, then `revalidatePath()` to refresh
4. All pages use `export const dynamic = 'force-dynamic'` (no static caching)

---

## 4. AUTHENTICATION & AUTHORIZATION

### Authentication
- **Supabase Auth** with email/password and Google OAuth
- **Middleware** (`middleware.ts`) runs on every request:
  - Unauthenticated users → redirected to `/login`
  - Authenticated users on auth pages → redirected to `/`
- **Auth callback** (`/auth/callback`) exchanges OAuth code for session
- Login form uses Supabase client-side `signInWithPassword`
- Register form passes `full_name`, `whatsapp`, `bac_account` as `raw_user_meta_data`
- On signup, a PostgreSQL trigger (`handle_new_user`) auto-creates a `profiles` row
  - Users with email `peter@peter.com` or `ralauas@gmail.com` → auto-assigned `admin` role
  - All other users → default `delivery` role

### Authorization (RBAC)
Four roles: `admin`, `setter`, `closer`, `delivery`

**Page access (enforced in each page.tsx):**
| Page | Allowed Roles |
|------|---------------|
| Home (/) | All (renders role-specific dashboard) |
| Ventas | admin, setter, closer |
| Clientes | admin, closer, delivery |
| Equipo | admin only |
| Planilla | admin only |
| Contabilidad | admin only |
| Ajustes | All |

**Database-level enforcement**: Row Level Security (RLS) policies on every table (see Section 6).

**UI-level guards**: Navigation sidebar filters items by role. BAC account info only visible to admins.

---

## 5. DATABASE SCHEMA

### Tables (17 total)

#### `profiles` (extends auth.users)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | References auth.users |
| full_name | text | Required |
| email | text | |
| whatsapp | text | Default '' |
| bac_account_encrypted | text | Nullable, admin-only visible |
| role | text | 'setter' / 'closer' / 'admin' / 'delivery' |
| salary | numeric(12,2) | Nullable |
| salary_notes | text | |
| admin_notes | text | |
| active | boolean | Default true |
| avatar_url | text | |
| created_at | timestamptz | |

#### `sets` (sales pipeline entry)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| prospect_name | text | |
| prospect_whatsapp | text | |
| prospect_ig | text | Instagram handle (cleaned, no @) |
| prospect_web | text | Nullable |
| setter_id | uuid FK→profiles | Who created the set |
| closer_id | uuid FK→profiles | Who will do the call |
| scheduled_at | timestamptz | Call date/time |
| summary | text | Situation summary |
| service_offered | text | 'advance90' / 'meta_advance' |
| status | text | See status machine below |
| is_duplicate | boolean | Auto-detected by IG handle |
| created_at, updated_at | timestamptz | updated_at has auto-trigger |

**Set Status Machine:**
```
agendado → precall_enviado → reagendo ↔ agendado
                          → no_show → reagendo / seguimiento / descalificado
                          → seguimiento → agendado / reagendo / descalificado / closed / closed_pendiente
                          → descalificado (terminal)
                          → closed (terminal)
                          → closed_pendiente → closed
```

#### `set_status_history` (audit trail)
Tracks every status change with `old_status`, `new_status`, `changed_by`, `notes`, `created_at`.

#### `deals` (outcome of a sales call)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| set_id | uuid FK→sets | |
| outcome | text | 'closed' / 'follow_up' / 'descalificado' |
| service_sold | text | Nullable ('advance90' / 'meta_advance' / 'retencion') |
| revenue_total | numeric(12,2) | Total agreed revenue |
| follow_up_date | timestamptz | For follow_up outcome |
| follow_up_notes | text | |
| disqualified_reason | text | |
| phantom_link | text | Recording link |
| closer_notes | text | |

#### `clients` (created from closed deals)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| deal_id | uuid FK→deals | |
| set_id | uuid FK→sets | |
| business_name, contact_name | text | |
| whatsapp, ig, web | text | |
| service | text | 'advance90' / 'meta_advance' / 'retencion' |
| status | text | 'onboarding' / 'activo' / 'pausado' / 'completado' |
| assigned_to | uuid FK→profiles | Nullable |

#### `payments`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| set_id | uuid FK→sets | |
| client_id | uuid FK→clients | Nullable |
| amount_gross | numeric(12,2) | Raw payment amount |
| payment_method | text | 'transferencia' / 'sinpe' / 'tilopay' / 'crypto' / 'otro' |
| tilopay_installment_months | int | 3, 6, or 12 |
| fee_percentage | numeric(5,4) | |
| fee_amount | numeric(12,2) | |
| amount_net | numeric(12,2) | After fees |
| payment_date | date | |
| notes | text | |

#### `commissions`
| Column | Type | Notes |
|--------|------|-------|
| payment_id | uuid FK→payments | |
| team_member_id | uuid FK→profiles | |
| role | text | 'setter' / 'closer' |
| percentage | numeric(5,4) | 0.05 for setter, 0.10 for closer |
| amount | numeric(12,2) | Calculated from net amount |
| is_paid | boolean | |
| paid_date | date | |

#### `onboarding_checklist`
Per-client checklist items. Default template: crear grupo WA, enviar bienvenida, enviar formulario, enviar link kickoff, marcar kickoff como hecho.

#### `client_forms`
| Column | Type | Notes |
|--------|------|-------|
| client_id | uuid FK→clients | |
| business_type | text | 'producto' / 'servicio' / 'restaurante' / 'software' / 'salud' / 'real_estate' |
| form_data | jsonb | Dynamic form data |
| progress_pct | int | 0-100 |
| completed | boolean | |

#### `advance90_phases`
7 phases for the 90-day program: Onboarding (day 0-7), Guiones R1 (7-14), Grabación y Edición R1 (14-25), Publicación + Pauta R1 (25-30), Optimización (31-60), Ronda 2 (61-90), Llamada Final (90).

#### `tasks`
Generic tasks linked to a client and optionally to a phase. Status: pendiente / en_progreso / bloqueado / listo.

#### `client_assets`
Files/links associated with clients. Types: guion, video, diseno, link, otro.

#### `expenses`
General business expenses. Categories: ads, software, oficina, otro. Has recurring flag.

#### `ad_spend`
Advertising spend records with period_start, period_end, amount_usd, platform.

#### `salary_payments`
Biweekly salary payment records per team member. Status: pendiente / pagado.

#### `notifications`
In-app notifications. Fields: user_id, type, title, message, action_url, read.

#### `activity_log`
Comprehensive audit log. Fields: entity_type, entity_id, action, user_id, details (jsonb).

#### `exchange_rates`
Daily USD to CRC exchange rates. Fetched from external API, stored for offline use.

---

## 6. ROW LEVEL SECURITY (RLS) POLICIES

Every table has RLS enabled. Key policies:

- **profiles**: Users see active profiles + their own. Users update own. Admin updates any.
- **sets**: Setter/closer see their own sets. Admin sees all. Setter can create (setter_id = auth.uid). Closer/setter/admin can update.
- **deals**: Visible if user is setter or closer on the parent set, or admin.
- **clients**: Visible to closer, delivery, admin. Insertable by closer/admin. Updatable by closer/delivery/admin.
- **payments**: Visible if setter/closer on parent set, or admin. Insertable by closer/admin.
- **commissions**: Users see their own. Admin sees all. Admin can update (mark as paid).
- **expenses, ad_spend**: Admin only for all operations.
- **salary_payments**: Admin sees all. Users see their own.
- **notifications**: Users see and update their own.
- **activity_log**: All authenticated users can view and insert.
- **exchange_rates**: Anyone can read. Service role or admin can insert.

---

## 7. BUSINESS LOGIC

### 7.1 Sales Pipeline (Sets → Deals)

**Creating a Set:**
1. Setter fills form: prospect name, WhatsApp, Instagram, web, closer assignment, scheduled date, service offered, situation summary
2. System auto-checks for duplicate IG handles and flags `is_duplicate = true`
3. Set starts with status `agendado`
4. Status history entry + activity log created

**Deal Outcomes (from a Set):**
1. **Closed (sold)**:
   - Creates a `deal` record (service_sold, revenue_total, phantom link, notes)
   - Creates a `client` record (copies prospect info from set)
   - Creates onboarding checklist items
   - If service = advance90: creates 7 phases + 20 tasks with calculated dates
   - If first payment provided: creates payment + commissions (setter 5%, closer 10% of net)
   - Sets status to `closed` (fully paid) or `closed_pendiente` (partial payment)
   - Creates notification for closer

2. **Follow-up**:
   - Creates deal with outcome `follow_up`, stores follow_up_date and notes
   - Sets status to `seguimiento`
   - Creates notification for closer

3. **Disqualified**:
   - Creates deal with outcome `descalificado` and reason
   - Sets status to `descalificado`

### 7.2 Payment Processing

**Tilopay Fee Calculation:**
| Installment Months | Fee % |
|-------------------|-------|
| 3 months | 7.5% |
| 6 months | 10% |
| 12 months | 14% |
| No installments | 0% |

On every payment:
1. Calculate fee → `fee_amount = gross × fee%`, `net = gross - fee`
2. Auto-create commissions: setter gets 5% of net, closer gets 10% of net
3. Check if total collected ≥ deal revenue_total → auto-transition set status from `closed_pendiente` to `closed`
4. Log to activity_log

### 7.3 Client Management

**Client Status Flow:** onboarding → activo → pausado → completado

**Onboarding Checklist** (5 items, togglable by closer/delivery/admin):
- Crear grupo WhatsApp
- Enviar bienvenida
- Enviar formulario (según tipo de negocio)
- Enviar link para agendar kickoff
- Marcar kickoff como hecho

**Business Type Forms** (dynamic forms stored as JSONB):
6 business types with different form schemas:
- **Producto**: Business info, products (repeatable, max 5), competition & goals
- **Servicio**: Business info, services (repeatable, max 5), process & goals
- **Restaurante**: Restaurant info, menu items (repeatable, max 5), presence & goals
- **Software**: Product info, features (repeatable, max 5), metrics & goals
- **Salud**: Practice info, medical services (repeatable, max 5), patients & goals
- **Real Estate**: Company info, properties (repeatable, max 3), market & goals

Each has progress tracking (0-100%) with progressive save capability.

**Advance90 Program** (7 phases, 20 tasks auto-generated):
- Phase 1: Onboarding (day 0-7) — 4 tasks
- Phase 2: Guiones R1 (day 7-14) — 3 tasks
- Phase 3: Grabación y Edición R1 (day 14-25) — 2 tasks
- Phase 4: Publicación + Pauta R1 (day 25-30) — 1 task
- Phase 5: Optimización (day 31-60) — 3 tasks
- Phase 6: Ronda 2 Data-driven (day 61-90) — 5 tasks
- Phase 7: Llamada Final (day 90) — 2 tasks

Visual timeline renders as horizontal phase bars on a 90-day ruler with week markers.

**Client Profile Tabs:**
- Overview (contact info, responsible person, cash collected, pending tasks, Advance90 timeline)
- Onboarding (checklist)
- Formulario (dynamic business-type form)
- Tareas (task list with status dropdowns)
- Assets (files/links)
- Ventas & Medición (notes for audit, measurements, learnings, sales)
- Pagos (payment history — admin/closer only)
- Actividad (activity log timeline)

### 7.4 Accounting

**Summary metrics calculated:**
- Revenue (sum of deal revenue_total where outcome = closed)
- Cash Collected (sum of payment amount_gross)
- Cash Net (sum of payment amount_net)
- Bank Fees (sum of payment fee_amount)
- Total Expenses
- Total Commissions (all, and unpaid subset)
- Total Salaries
- Total Ad Spend
- Margin = cashNet - expenses - salaries - commissions
- CAC metrics: cost per client, cost per set, cost per call (deal)

**Displayed on accounting dashboard:**
- 8 metric cards (revenue, cash, margins, fees, expenses, commissions, salaries, ad spend)
- CAC section with cost per client, cost per set, cost per call
- Unpaid commissions list with "Pagar" button
- Recent expenses list
- Buttons to register new expense or ad spend

### 7.5 Team & Payroll

**Team management (admin only):**
- View all team members with role, status, salary
- Edit member: name, WhatsApp, role, salary, salary notes, admin notes
- View member details in drawer: full info, BAC account (admin-only visibility)

**Payroll:**
- Unpaid commissions list with individual "Pagar" button
- Salary payments history
- Generate salary payments for a period (creates entries for all active members with salary > 0)
- Next biweekly payment date calculator (15th and last day of month)
- CSV export for commissions and salary payment lists

### 7.6 Notifications

**In-app notifications:**
- Bell icon in topbar with unread count badge
- Dropdown shows recent 10 notifications
- Mark individual as read (on click) or mark all
- Types: deal_closed, follow_up, follow_up_today, task_due_today

**Daily automated notifications** (`/api/daily-notifications`):
- Designed to be called by external cron job (requires Bearer token auth)
- Creates `follow_up_today` notifications for deals with follow_up_date = today
- Creates `task_due_today` notifications for tasks due today (pendiente/en_progreso)
- Deduplication: won't create duplicate notifications for the same event on the same day

### 7.7 Currency

- All monetary values stored in USD
- USD ↔ CRC toggle in the UI (Zustand store)
- Exchange rate fetched from `exchangerate-api.com` and cached in `exchange_rates` table
- Formatting: USD uses `es-CR` locale formatter, CRC converts at stored rate

---

## 8. UI / UX DETAILS

### Theme
- **Dark-only** design using oklch color space
- 3 surface layers: `surface-1` (0.17), `surface-2` (0.21), `surface-3` (0.25) on `background` (0.13)
- Primary: blue-purple (oklch 0.65 0.15 250)
- Semantic colors: success (green), warning (amber/orange), destructive (red), info (blue)
- Font: Geist Sans + Geist Mono
- Border radius: 0.625rem base

### Layout
- **Sidebar** (left): Collapsible, shows navigation items filtered by role. Logo "AOS" at top. Collapse toggle at bottom. Active item highlighted with primary color.
- **Topbar** (top): Search button (Ctrl+K), quick action dropdown (create set, register payment, view clients), notification bell, user avatar dropdown (profile, logout).
- **Content area**: Scrollable, uses `space-y-6` vertical spacing.

### Shared Components
- **DataTable**: Generic sortable data table with search, filters slot, row actions, row click, pagination, and empty state.
- **QuickViewDrawer**: Sheet component (right side) for detail views.
- **StatusChip**: Colored badge for status display (size sm/md, customizable colors).
- **ActivityTimeline**: Renders activity log entries with user name, action, timestamp.
- **ConfirmModal**: AlertDialog wrapper for destructive actions.
- **CurrencyToggle**: USD/CRC switch button.
- **EmptyState**: Centered empty state with icon, title, description, and optional action.
- **GlobalSearch**: Cmd+K command palette (placeholder, no deep search implementation).

### Role-Specific Dashboards (Home Page)

**Admin Dashboard:**
- 12 metric cards in 3 rows (pipeline, financial, CAC)
- Sets with pending payments table
- Quick access links

**Setter Dashboard:**
- Today's scheduled sets
- Sets created this month
- Total commissions pending
- Recent sets list

**Closer Dashboard:**
- Today's calls list
- Follow-ups due today
- Commissions pending
- Recent tasks

**Delivery Dashboard:**
- Tasks assigned to user
- Tasks by status breakdown
- Active client list

### Form UX
- All required fields marked with red asterisk (`<span className="text-destructive">*</span>`)
- Zod validation with error messages in Spanish
- Loading states on submit buttons ("Cargando...", "Registrando...", etc.)
- Toast notifications for success/error feedback

### Filter System
- **Ventas page**: Status, closer, setter, service, date range filters + saved filter presets
- **Clientes page**: Status, service filters + saved filter presets
- Filter presets stored in localStorage via `useSavedFilters` hook
- Save, load, and delete presets via dropdown menu

---

## 9. API ROUTES

### `GET /api/exchange-rate`
- Fetches latest USD→CRC rate from exchangerate-api.com
- Upserts into `exchange_rates` table
- Returns `{ date, usd_to_crc }`

### `GET /api/daily-notifications`
- Requires Bearer token auth (CRON_SECRET or SUPABASE_SERVICE_ROLE_KEY)
- Creates follow_up_today notifications for deals with follow_up_date = today
- Creates task_due_today notifications for tasks due today
- Returns `{ ok, date, followUpNotifications, taskNotifications }`

### `GET /auth/callback`
- Handles OAuth callback from Google
- Exchanges code for session and redirects to home

---

## 10. SERVER ACTIONS (Full Inventory)

### `sets.ts`
- `checkDuplicateIG(ig)` — Check for duplicate Instagram handles
- `createSet(data)` — Create new set with duplicate detection
- `updateSetStatus(setId, newStatus, notes?)` — Transition set status (validates against state machine)
- `createDealClosed(setId, data)` — Close a deal: creates deal, client, onboarding, phases/tasks, optional payment+commissions
- `createDealFollowUp(setId, data)` — Create follow-up deal
- `createDealDisqualified(setId, data)` — Disqualify deal

### `payments.ts`
- `registerPayment(setId, clientId, data)` — Register payment with fee calculation, auto-commission creation, auto status transition
- `markCommissionPaid(commissionId)` — Mark commission as paid
- `markSalaryPaid(salaryPaymentId)` — Mark salary as paid

### `clients.ts`
- `getClients()` — List all clients with assigned member and tasks
- `getClientById(id)` — Get client with deal, set, assigned member
- `getClientOnboarding(clientId)` — Get onboarding checklist
- `toggleOnboardingItem(itemId, completed)` — Toggle checklist item
- `updateClientStatus(clientId, status)` — Update client status
- `assignClient(clientId, assignedTo)` — Assign team member to client
- `getClientPayments(clientId)` — Get payments with commissions
- `getClientTasks(clientId)` — Get tasks with assigned member
- `updateTaskStatus(taskId, status)` — Update task status
- `getClientAssets(clientId)` — Get client assets
- `getClientPhases(clientId)` — Get Advance90 phases with tasks
- `getClientActivityLog(clientId)` — Get activity log
- `getClientForm(clientId)` — Get latest client form
- `saveClientForm(clientId, businessType, formData, progressPct, completed)` — Save/update client form
- `addClientNote(clientId, noteType, content)` — Add note to activity log

### `accounting.ts`
- `getAccountingSummary(periodStart?, periodEnd?)` — Calculate all financial metrics
- `createExpense(data)` — Create expense
- `createAdSpend(data)` — Create ad spend record
- `getExpenses()` — List expenses
- `getUnpaidCommissions()` — List unpaid commissions with member and payment details
- `getSalaryPayments()` — List salary payments with member details
- `markCommissionPaid(commissionId)` — Mark commission paid (duplicate exists in payments.ts)
- `markSalaryPaid(salaryPaymentId)` — Mark salary paid
- `generateSalaryPayments(periodLabel)` — Auto-generate salary entries for active members
- `getLatestExchangeRate()` — Get most recent exchange rate

### `team.ts`
- `getTeamMembers()` — List all profiles
- `updateTeamMember(id, data)` — Update team member profile
- `getTeamMemberById(id)` — Get single profile

### `profile.ts`
- `updateProfile(data)` — Update own profile (name, WhatsApp)
- `changePassword(newPassword)` — Change password via Supabase Auth

### `notifications.ts`
- `getUnreadNotificationCount()` — Count unread notifications for current user
- `getRecentNotifications()` — Get 10 most recent notifications
- `markNotificationRead(notificationId)` — Mark single notification read
- `markAllNotificationsRead()` — Mark all as read

---

## 11. CUSTOM HOOKS

### `useCurrencyStore` (Zustand)
```typescript
interface CurrencyState {
  currency: 'USD' | 'CRC'
  exchangeRate: number
  toggle: () => void
  setExchangeRate: (rate: number) => void
}
```

### `useSavedFilters(storageKey)`
Persists filter presets in localStorage. Returns `{ presets, savePreset(name, filters), deletePreset(id) }`.

### `useUser()`
Returns `{ user, profile, role, loading }` using Supabase client-side auth listener.

---

## 12. VALIDATION SCHEMAS (Zod)

| Schema | Key Fields | Notes |
|--------|-----------|-------|
| loginSchema | email (email), password (min 6) | |
| registerSchema | full_name (min 2), email, password, whatsapp (min 8), bac_account (optional) | |
| createSetSchema | prospect_name, whatsapp, ig, web (optional url), closer_id (uuid), scheduled_at, summary, service_offered | |
| closeDealSchema | service_sold, revenue_total (positive), amount_collected (optional), payment_method (optional), tilopay_months, phantom_link, notes | |
| followUpSchema | follow_up_notes (required), follow_up_date (required) | |
| disqualifySchema | disqualified_reason (required) | |
| paymentSchema | amount_gross (positive), payment_method, tilopay_months, payment_date, notes | |
| teamMemberSchema | full_name, whatsapp, role, salary (optional), salary_notes, admin_notes | |
| expenseSchema | category, description, amount_usd (positive), date, recurring (bool) | |
| adSpendSchema | period_start, period_end, amount_usd (positive), platform, notes | |
| profileEditSchema | full_name (min 2), whatsapp (min 8) | |
| passwordChangeSchema | new_password (min 6), confirm_password (must match) | Uses .refine() |

---

## 13. KNOWN LIMITATIONS & GAPS

1. **No file upload storage**: Business forms have file input fields but only store filenames as `[FILE] filename` strings — no actual file upload to Supabase Storage or any cloud storage.
2. **No real-time updates**: Uses `revalidatePath()` for data refresh, no Supabase Realtime subscriptions.
3. **GlobalSearch (Cmd+K)**: UI exists but search functionality is placeholder/limited.
4. **Charts/graphs**: Recharts is a dependency but no charts are rendered anywhere in the dashboards.
5. **No period filtering in accounting**: `getAccountingSummary` accepts `periodStart`/`periodEnd` params but they're never used in the function body or passed from the UI.
6. **Duplicate server actions**: `markCommissionPaid` and `markSalaryPaid` exist in both `payments.ts` and `accounting.ts`.
7. **No task creation UI**: Tasks are auto-generated for Advance90 but there's no UI to manually create tasks.
8. **No asset upload UI**: Client assets table exists but no UI to add new assets.
9. **No client assignment UI on client profile**: `assignClient` action exists but the profile page has no dropdown to change assignment.
10. **Exchange rate cron**: The `/api/exchange-rate` endpoint exists but there's no configured cron to call it automatically.
11. **Daily notifications cron**: The endpoint exists but requires external cron setup (e.g., Vercel Cron).
12. **No password reset flow**: No "forgot password" UI exists.
13. **No email verification**: Registration creates account immediately without email confirmation.
14. **No data export beyond CSV**: Only payroll/commissions have CSV export. No general data export.
15. **Mobile responsiveness**: Uses responsive Tailwind classes but sidebar collapse is manual, no mobile-specific menu.

---

## 14. ENVIRONMENT VARIABLES

```
NEXT_PUBLIC_SUPABASE_URL     — Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY — Supabase anon/public key
SUPABASE_SERVICE_ROLE_KEY    — Supabase service role key (server-only)
CRON_SECRET                  — Optional, for daily-notifications auth
```

---

## 15. FILE-BY-FILE COMPONENT INVENTORY

### Layout Components
| File | Description |
|------|-------------|
| `layout/dashboard-shell.tsx` | Main shell with sidebar + topbar + content area |
| `layout/sidebar.tsx` | Collapsible nav sidebar, role-filtered items, Lucide icons |
| `layout/topbar.tsx` | Search, quick actions, notifications dropdown, user menu |

### Dashboard Components
| File | Description |
|------|-------------|
| `dashboards/admin-dashboard.tsx` | 12 metric cards + pending payments + quick access |
| `dashboards/setter-dashboard.tsx` | Today's sets, monthly sets, commissions |
| `dashboards/closer-dashboard.tsx` | Today's calls, follow-ups, tasks, commissions |
| `dashboards/delivery-dashboard.tsx` | Assigned tasks, status breakdown |

### Ventas Components
| File | Description |
|------|-------------|
| `ventas/ventas-dashboard.tsx` | 3-block overview (pending calls, recent sets, recent sales) + DataTable with filters |
| `ventas/create-set-modal.tsx` | Form to create new set, includes IG duplicate check |
| `ventas/deal-modal.tsx` | Tabbed modal: Close deal / Follow-up / Disqualify |
| `ventas/payment-modal.tsx` | Register payment with Tilopay fee preview |
| `ventas/set-detail-drawer.tsx` | Set detail view with actions, pending balance panel |

### Clientes Components
| File | Description |
|------|-------------|
| `clientes/clientes-list.tsx` | Client list with status/service filters, pending payment badge, next task column |
| `clientes/client-profile.tsx` | 8-tab client profile (overview, onboarding, form, tasks, assets, medicion, payments, activity) |
| `clientes/advance90-timeline.tsx` | Visual horizontal timeline for 90-day phases |
| `clientes/business-form.tsx` | Dynamic form with 6 business-type schemas, repeatable sections, progress tracking |

### Equipo Components
| File | Description |
|------|-------------|
| `equipo/team-list.tsx` | Team members DataTable with edit/view actions |
| `equipo/team-member-drawer.tsx` | Member detail drawer (BAC account admin-only) |
| `equipo/edit-team-member-modal.tsx` | Edit member form |
| `equipo/planilla-dashboard.tsx` | Commissions list, salary payments, next payroll date, CSV export |

### Contabilidad Components
| File | Description |
|------|-------------|
| `contabilidad/accounting-dashboard.tsx` | Financial metrics, CAC, unpaid commissions, expenses list |
| `contabilidad/expense-modal.tsx` | Create expense form |
| `contabilidad/adspend-modal.tsx` | Create ad spend form |

### Auth Components
| File | Description |
|------|-------------|
| `auth/login-form.tsx` | Email/password + Google OAuth login |
| `auth/register-form.tsx` | Registration with name, email, password, WhatsApp, BAC account |

### Ajustes Components
| File | Description |
|------|-------------|
| `ajustes/ajustes-form.tsx` | Profile edit + password change forms |

---

## 16. KEY BUSINESS CONSTANTS

```typescript
COMMISSION_RATES = { setter: 0.05, closer: 0.10 }
TILOPAY_FEE_TABLE = { 3: 0.075, 6: 0.10, 12: 0.14 }

ONBOARDING_CHECKLIST = [
  'Crear grupo WhatsApp',
  'Enviar bienvenida',
  'Enviar formulario (según tipo de negocio)',
  'Enviar link para agendar kickoff',
  'Marcar kickoff como hecho',
]

ADVANCE90_PHASES = [
  { name: 'Onboarding', days: 0-7 },
  { name: 'Guiones R1', days: 7-14 },
  { name: 'Grabación y Edición R1', days: 14-25 },
  { name: 'Publicación + Pauta R1', days: 25-30 },
  { name: 'Optimización', days: 31-60 },
  { name: 'Ronda 2 (Data-driven)', days: 61-90 },
  { name: 'Llamada Final', day: 90 },
]

SERVICES = ['advance90', 'meta_advance', 'retencion']
ROLES = ['setter', 'closer', 'admin', 'delivery']
```

---

*End of summary. This document covers the complete AdvanceOS codebase as of February 25, 2026.*
