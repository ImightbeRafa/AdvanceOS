# AdvanceOS — Progress Tracker

## Phase 1: Foundation
- [x] Next.js project initialized (Next.js 16 + React 19 + TypeScript strict)
- [x] Tailwind CSS v4 + shadcn/ui configured (zinc dark theme)
- [x] Dark layered theme (3 surface levels, status colors, contrast tokens)
- [x] shadcn/ui components installed (button, input, label, card, dialog, sheet, tabs, table, badge, select, textarea, dropdown-menu, avatar, separator, scroll-area, tooltip, popover, command, checkbox, calendar, progress, skeleton, alert-dialog, form, switch)
- [x] Environment variables (.env.local, .env.example)
- [x] TypeScript types defined (all entities: Profile, Set, Deal, Client, Payment, Commission, Task, etc.)
- [x] Constants defined (status labels/colors, transitions, roles, fee tables, commission rates, Advance90 phases/tasks, nav items)
- [x] Zod schemas defined (login, register, createSet, closeDeal, followUp, disqualify, payment, teamMember, expense, adSpend)
- [x] Supabase client helpers (browser client, server client, service client, middleware)
- [x] Currency utilities (USD/CRC formatter, Tilopay fee calculator, commission calculator)
- [x] Date utilities (Spanish locale formatters, relative dates)
- [x] TanStack Query provider
- [x] Zustand currency store
- [x] Database migration written (full schema: 17 tables, indexes, triggers, RLS policies)
- [x] Auth pages (login with Google OAuth + email/password, registration, callback route)
- [x] Middleware (auth protection, redirect logic)
- [x] Root layout (dark mode, Spanish lang, Toaster, TooltipProvider, QueryProvider)
- [x] Dashboard layout (server-side auth check, profile fetch)
- [x] Sidebar navigation (collapsible, role-filtered, icons + text, tooltips)
- [x] TopBar (search trigger, quick actions dropdown, notifications bell, user menu with logout)
- [x] Dashboard shell (sidebar + topbar + main content area)
- [x] PROGRESS.md created

## Phase 2: Shared Components & Design System
- [x] StatusChip component
- [x] DataTable component (filters, search, sort, row actions)
- [x] QuickViewDrawer component
- [x] ConfirmModal component
- [x] EmptyState component
- [x] ActivityTimeline component
- [x] Currency toggle component (USD/CRC)
- [x] Shared components barrel export

## Phase 3: Team Module
- [x] Team member list (table with role chips, salary, status)
- [x] Edit team member modal (admin only — role, salary, notes)
- [x] Team member drawer (quick view with contact, planilla, bank info)
- [x] Server actions for team CRUD + activity logging

## Phase 4: Sales Module — Sets & Deals
- [x] Sales dashboard (3 blocks: Pending Calls, Follow Ups Today, Closures This Month)
- [x] Sets list/table with filters (status, closer, search by name/IG/WhatsApp)
- [x] Create Set modal with IG duplicate detection
- [x] Set detail drawer (prospect info, assignment, summary, deal info, action buttons)
- [x] Deal creation modal — Closed tab (service, revenue, payment, Tilopay, Phantom, notes)
- [x] Deal creation modal — Follow Up tab (notes + date, reminder)
- [x] Deal creation modal — Descalificado tab (reason required)
- [x] Status machine (server-side transitions with validation)
- [x] Status history audit trail
- [x] Auto client creation on close
- [x] Auto onboarding checklist creation
- [x] Auto Advance90 phase/task generation
- [x] Server actions for sets/deals CRUD

## Phase 5: Payments & Commissions
- [x] Payment registration modal (gross, method, Tilopay installments)
- [x] Automatic Tilopay fee calculation (7.5% / 10% / 14%)
- [x] Net amount computation and preview
- [x] Auto commission creation (5% setter, 10% closer on net)
- [x] "Closed (pendientes pagos)" logic (saldo tracking, auto-transition to Closed)
- [x] Commission mark-as-paid action
- [x] Salary payment mark-as-paid action
- [x] Server actions for payments/commissions

## Phase 6: Client Module
- [x] Auto client creation on deal close (with onboarding checklist + timeline)
- [x] Client list (table with status, service, assigned_to, filters)
- [x] Client profile page with tabs:
  - [x] Overview (contact info, cash collected, pending tasks, Advance90 phases)
  - [x] Onboarding (checklist with checkboxes, completion dates)
  - [x] Tareas (task list with status dropdowns, assignees, due dates)
  - [x] Assets (file list, type badges)
  - [x] Pagos & Comisiones (role-restricted, gross/net/fee breakdown)
  - [x] Actividad (activity timeline)
- [x] Client status management (onboarding → activo → pausado → completado)
- [x] Task status management (pendiente → en_progreso → bloqueado → listo)
- [x] Server actions for clients CRUD

## Phase 7: Advance90 Cronograma
- [x] Auto-generate 90-day timeline on client creation (when service = Advance90)
- [x] Phase/task auto-creation based on defined schedule (Day 0-7, 7-14, etc.)
- [x] Phase status display in client overview
- [x] Task management within client profile

## Phase 8: Accounting Module
- [x] Revenue & Cash Collected metrics dashboard
- [x] Bank fees tracking (auto from Tilopay)
- [x] Expense registration modal (category, description, amount, date, recurring)
- [x] Expense list display
- [x] CAC metrics (cost per client, cost per set)
- [x] Salary and commission totals
- [x] Margin calculation (cashNet - expenses - salaries - commissions)
- [x] USD/CRC toggle with currency store
- [x] Unpaid commissions panel with pay buttons
- [x] Exchange rate API endpoint

## Phase 9: Dashboards & Role-Based Home
- [x] Setter dashboard (today's sets, pending, closed, commissions)
- [x] Closer dashboard (pending calls, follow-ups, overdue tasks, commissions)
- [x] Admin dashboard (sets/closures this month, pending payments, overdue tasks, quick links)
- [x] Delivery dashboard (pending/in-progress/overdue/completed tasks, task list)

## Phase 10: Global UX & Polish
- [x] Global search (Ctrl+K command palette, searches clients + sets by name/IG/WhatsApp)
- [x] Quick actions in command palette
- [x] Activity history on clients (ActivityTimeline component)
- [x] Empty states with helpful messages
- [x] Notification bell in TopBar (UI ready, count wired)
- [x] Confirmation modals on critical actions (via ConfirmModal component)
- [x] Dark layered UI (3 surface levels: background < surface-1 < surface-2 < surface-3)
- [x] Clean build verification (TypeScript strict, zero errors)
- [ ] Saveable filters (deferred — requires user preferences table)
- [ ] In-app notifications via Supabase Realtime (notifications table ready, realtime subscription pending)
- [ ] Loading states / error boundaries / optimistic updates (partial — handled in individual components)

## Phase 11: Deployment
- [ ] Vercel project setup
- [ ] Environment variables configured (Supabase URL, keys, Google OAuth)
- [ ] Supabase production project + run migrations
- [ ] Domain configuration
- [ ] Final testing

## Pending / Future
- [ ] Formularios completos por vertical (product, service, restaurant, software, health, real estate)
- [ ] Retención service definition (cronograma, entregables)
- [ ] Default responsible per phase/task (auto-assignment)
- [ ] Supabase Realtime subscriptions for live notifications
- [ ] Recharts charts for accounting trends (monthly revenue, margin)
- [ ] File upload via Supabase Storage for client assets
- [ ] Saveable/persistent filter presets
- [ ] Ad spend CRUD form in accounting
- [ ] Salary payment generation (biweekly auto-creation)
- [ ] Export commission/salary summaries
