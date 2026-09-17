# Remix of Remix of Remix of Kinetic Capital

SYSTEM CONTEXT
You are a senior fullstack software engineer and system designer,,,,build BuildTrack360 — a Construction Finance Management System (CFMS) for Kinetic Investment Ventures, a construction lending institution. This is a multi-portal, role-based web application that manages the full lifecycle of construction loans: from developer onboarding and credit appraisal, through milestone-based disbursements and site monitoring, to repayments, risk scoring, and executive reporting.
The system must be production-grade, modular, and built for real financial operations. Prioritize clarity, auditability, and workflow control over visual flair.
________________________________________
TECH STACK
•	Framework: React + TypeScript (Vite)
•	Styling: Tailwind CSS + shadcn/ui component library
•	Routing: React Router v6 with role-gated route guards
•	State Management: React Query (server state) + Zustand (client/auth state)
•	Backend/DB: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
•	Forms: React Hook Form + Zod validation
•	Charts: Recharts
•	Tables: TanStack Table v8
•	File Uploads: Supabase Storage with signed URLs
•	Notifications: Sonner (toast) + in-app notification bell
•	
•	
________________________________________
ROLES & ACCESS CONTROL
Implement role-based access control (RBAC) with the following roles. Each role sees only the navigation and data relevant to them:
Role	Key Access
super_admin	Everything — system config, users, approval matrix, master data
credit_officer	Applications, appraisals, credit conditions, loan setup
operations_officer	Project tracking, contractor compliance, customer lifecycle
site_monitoring_officer	Site visits, photo uploads, GPS capture, milestone status
finance_officer	Disbursement approvals, payments, repayments, reconciliation
risk_compliance_officer	Risk scores, alerts, audit logs, IFRS 9 indicators
developer	Submit applications, upload documents, view project status, request drawdowns
contractor	View assigned works, submit progress, invoices, documents
executive	Portfolio dashboards, risk heatmaps, board-level reporting
Implement a useAuth() hook and a <ProtectedRoute role={[...]} /> wrapper component. Redirect unauthorized users to a /403 page.
________________________________________
DATABASE SCHEMA
Create the following Supabase tables with Row Level Security (RLS) policies:
Identity & Access
•	users (id, email, full_name, role, status, created_at)
•	audit_logs (id, user_id, action, entity_type, entity_id, old_value, new_value, ip_address, timestamp)
Customer
•	customers (id, name, customer_type, pin, registration_number, email, phone, address, sector, status, created_by, created_at)
•	customer_directors (id, customer_id, name, id_number, shareholding_pct, kra_pin, phone)
•	customer_documents (id, customer_id, doc_type, file_url, expiry_date, status, version, uploaded_by, created_at)
Project
•	projects (id, customer_id, name, location, gps_lat, gps_lng, project_type, units, expected_value, start_date, end_date, status, created_by)
•	project_documents (id, project_id, doc_type, file_url, version, status, created_at)
Credit
•	appraisals (id, customer_id, project_id, requested_amount, recommended_amount, ltv, dscr, score, grade, status, created_by, created_at)
•	approval_conditions (id, appraisal_id, condition_type, description, due_date, responsible_party, status)
Loan
•	loan_facilities (id, appraisal_id, approved_amount, interest_rate, tenor_months, processing_fee, insurance, repayment_frequency, status, activated_at)
•	repayment_schedules (id, loan_id, instalment_date, principal, interest, total, balance, status)
•	covenants (id, loan_id, condition, threshold, monitoring_frequency, status)
Construction
•	milestones (id, project_id, name, target_pct, eligible_amount, sequence)
•	drawdown_requests (id, loan_id, milestone_id, requested_amount, certified_amount, status, requested_by, created_at)
•	site_visits (id, project_id, officer_id, visit_date, gps_lat, gps_lng, weather, observations, status)
•	site_media (id, site_visit_id, file_url, caption, timestamp, geotag)
•	issues (id, site_visit_id, category, severity, description, responsible_party, due_date, status)
Contractor
•	contractors (id, name, registration_number, phone, email, specialization, nca_category, status)
•	contractor_contracts (id, contractor_id, project_id, scope, amount, start_date, end_date, retention_pct, status)
•	contractor_scores (id, contractor_id, delivery, quality, safety, compliance, financial_reliability, created_at)
Finance
•	payments (id, drawdown_id, beneficiary_id, amount, purpose, status, created_by, authorized_by, created_at)
•	beneficiaries (id, name, bank_name, account_number, mobile_wallet, verification_status)
•	ledger_entries (id, loan_id, transaction_type, debit, credit, balance, reference, created_at)
•	repayments (id, loan_id, amount, payment_date, allocation_principal, allocation_interest, reference, source)
Risk
•	risk_scores (id, entity_type, entity_id, score, grade, drivers, created_at)
•	risk_alerts (id, trigger_event, severity, entity_type, entity_id, owner_id, due_date, status, created_at)
•	ifrs9_indicators (id, loan_id, days_past_due, stage, sicr_flags, impairment_driver, calculated_at)
________________________________________
APPLICATION STRUCTURE
Scaffold the following route and page structure:
/login                          → Login page
/403                            → Unauthorized
/dashboard                      → Role-aware home dashboard

/customers                      → Customer list
/customers/new                  → Onboarding wizard (multi-step)
/customers/:id                  → Customer profile (directors, docs, history)

/projects                       → Project list with status filters
/projects/new                   → Project registration form
/projects/:id                   → Project detail (docs, milestones, timeline)

/appraisals                     → Appraisal queue
/appraisals/new/:projectId      → New appraisal form
/appraisals/:id                 → Appraisal detail + memo + approval

/loans                          → Loan book
/loans/:id                      → Facility detail (schedule, covenants, drawdowns)

/drawdowns                      → Drawdown pipeline
/drawdowns/new/:loanId          → Drawdown request form
/drawdowns/:id                  → Drawdown detail + approval stages

/site-visits                    → Site visit log
/site-visits/new/:projectId     → Field report form (mobile-optimized)
/site-visits/:id                → Visit detail with photos, issues

/contractors                    → Contractor directory
/contractors/new                → Contractor registration
/contractors/:id                → Contractor profile + contracts + scores

/payments                       → Payment queue
/payments/:id                   → Payment detail + authorization

/risk                           → Risk dashboard
/risk/alerts                    → Alert list + mitigation tracker

/documents                      → Document management center
/analytics                      → Executive portfolio dashboard

/admin/users                    → User management
/admin/settings                 → System configuration
/admin/audit-log                → Audit trail viewer
________________________________________
KEY SCREENS — DETAILED REQUIREMENTS
1. GLOBAL LAYOUT
•	Left sidebar navigation, collapsible on mobile
•	Top bar: user avatar, role badge, notification bell (alert count), global search
•	Sidebar links conditioned on user role
•	Breadcrumb trail on all inner pages
•	Color theme: professional dark blue (#1E3A5F) primary, white backgrounds, amber (#F59E0B) for warnings, red (#EF4444) for critical alerts, green (#10B981) for approved/active
2. CUSTOMER ONBOARDING — Multi-Step Wizard
Steps: Company Info → Directors & Ownership → KYC Documents → Financial Profile → Review & Submit
•	Step indicator with progress bar
•	Beneficial ownership must total 100% (enforce with real-time validation)
•	Document upload per doc type with expiry date field
•	Final step shows completeness checklist before submission
•	Submit triggers maker-checker queue visible to credit officers
3. PROJECT REGISTRATION
•	Form with sections: Project Info | Land & Security | Technical Documents | Commercial Model
•	Map picker for GPS coordinates (use embedded Leaflet or Google Maps iframe)
•	Document upload per required type (BOQ, drawings, permits, NCA approvals, insurance)
•	Submission blocked if BOQ or title details are missing — show a checklist warning panel
4. APPRAISAL MODULE
•	Appraisal form with tabs: Borrower Assessment | Project Viability | Collateral | Cash Flow | Contractor Risk
•	Auto-calculate: LTV = Recommended Amount / Collateral Value; DSCR = Net Operating Income / Debt Service
•	Risk score displayed as a donut chart with driver breakdown (weights shown)
•	Appraisal memo auto-generated as a structured summary panel (printable)
•	Approval routing shown as a visual stepper: Credit Officer → Credit Manager → Committee
•	Conditions table: type, description, due date, responsible party, status (with inline edit)
5. LOAN FACILITY
•	Facility summary card: amount, rate, tenor, fees, insurance, status badge
•	Repayment schedule displayed in a paginated table with totals row
•	Covenant tracker: condition, threshold, next review date, compliance status (green/amber/red)
•	"Activate Facility" button disabled until all mandatory controls pass (show checklist)
6. DRAWDOWN — APPROVAL WORKFLOW
•	Request form: select milestone, enter requested amount, attach site report reference
•	Visual approval pipeline stepper: Submitted → Site Inspection → QS Certification → Risk Check → Finance → Payment Released
•	Each stage shows: approver name, timestamp, decision (approved/rejected), comment
•	If risk alert is active, stage auto-escalates with red warning banner
•	Blocked drawdowns show reason prominently with a "Resolve Issue" CTA
7. SITE VISIT — MOBILE-OPTIMIZED
•	Large tap targets, single-column layout for mobile
•	Photo upload with camera capture option (accept="image/*" capture="environment")
•	GPS auto-capture on form open with manual override
•	Stage completion slider per construction element (0–100%)
•	Issues section: category dropdown, severity (Low/Medium/High/Critical), responsible party
•	Offline state banner: "You're offline — report will sync when connection is restored"
•	Submit generates a formal PDF-style report summary
8. RISK DASHBOARD
•	Portfolio risk heatmap: color-coded grid of projects by risk grade (Green/Amber/Red/Dark Red)
•	Early warning panel: list of active alerts sorted by severity, with days open
•	Alert card: trigger event, entity name, owner, due date, status pill, "Resolve" button
•	Risk score trend sparkline per entity (last 6 score recalculations)
•	IFRS 9 staging summary: count of Stage 1 / Stage 2 / Stage 3 loans with total exposure
9. EXECUTIVE DASHBOARD
•	KPI cards row: Total Portfolio (disbursed), Active Projects, PAR 30, Avg Risk Grade, Pending Drawdowns
•	Portfolio exposure by stage (bar chart)
•	Project completion distribution (grouped bar: planned % vs actual %)
•	Risk grade distribution (pie chart)
•	Geographic distribution map (project pins by county)
•	Export button → generates timestamped PDF board pack
•	All charts filterable by: period, county, product type, officer, risk grade
10. PAYMENTS MODULE
•	Payments queue table: beneficiary, amount, purpose, linked request, status, created date
•	Dual authorization UI: "Authorize" button only visible to approved Finance Officers above threshold
•	Beneficiary verification badge (verified/unverified) shown on payment card
•	Payment status flow: Pending → Authorized → Submitted → Confirmed / Failed
•	Failed payments show retry option with reconciliation note field
________________________________________
GLOBAL COMPONENTS TO BUILD
Component	Description
<StatusBadge status />	Pill badge with semantic color (active, pending, rejected, blocked, etc.)
<MakerCheckerBar />	Shows current approval stage, approver, and action buttons
<DocumentUploader />	Drag-and-drop + file browser, shows upload progress, previews image thumbnails, blocks non-allowed file types
<AuditLogDrawer />	Slide-out panel showing full audit trail for any entity
<RiskScoreCard score grade drivers />	Visual risk card with donut chart and driver list
<AlertBanner severity message />	Full-width contextual alert banner (info/warning/critical)
<ProgressMilestone milestones />	Visual milestone tracker showing target % vs actual %
<ApprovalStepper stages />	Horizontal stepper showing approval pipeline state
<EmptyState icon title message cta />	Consistent empty state for all list views
<ConfirmDialog />	Reusable modal for destructive actions (delete, reject, override)
________________________________________
BUSINESS RULES TO ENFORCE IN UI
1.	KYC Gate: Customer cannot be submitted for activation if any mandatory document is missing or expired — show a red checklist panel.
2.	LTV Cap: Appraisal recommended amount input disabled if it exceeds product LTV limit — show tooltip explaining limit.
3.	Drawdown Over-disbursement: Drawdown requested amount field shows remaining eligible balance; submission blocked if it would exceed facility.
4.	Completion Gate: Drawdown blocked if site visit shows completion % below milestone threshold — display current vs required %.
5.	Beneficial Ownership: Director shareholding inputs validate in real-time that total = 100% before form proceeds.
6.	Contractor Block: Contractor with expired license or poor performance score shows a red "Blocked" badge and cannot be selected in project assignment dropdowns.
7.	Dual Authorization: Payment "Authorize" button hidden unless user is an authorized Finance Officer and payment exceeds single-signatory threshold.
8.	Budget Lock: BOQ variation form is disabled and shows "Budget Locked" state after facility is approved, unless user is super_admin or credit_officer with override.
9.	Risk Override: Any risk score manual override shows a mandatory reason field and creates an audit log entry.
10.	Document Versioning: Re-uploading an approved document creates a new version (v2, v3…) rather than overwriting — show version history tab.
________________________________________
AUDIT & SECURITY REQUIREMENTS
•	Every create, update, approve, reject, delete action must call a logAudit(action, entityType, entityId, oldValue, newValue) utility that inserts to audit_logs
•	Sensitive document downloads must log the download event
•	Session timeout after 30 minutes of inactivity with a countdown warning modal
•	All forms validate on submit with Zod schemas — never trust client input
•	File uploads restricted to: PDF, JPG, PNG, DOCX, XLSX — reject others with a user-friendly error
•	Supabase RLS must ensure users can only read/write data their role permits
________________________________________
NOTIFICATIONS
•	In-app notification bell shows unread count
•	Notifications triggered by: new appraisal assigned, drawdown awaiting approval, risk alert created, document expiring in 14 days, payment awaiting authorization
•	Each notification links directly to the relevant entity page
•	Mark as read individually or "Mark all as read"
________________________________________
INITIAL SEED DATA
Create a Supabase seed script that populates:
•	5 users (one per main role)
•	2 sample customers (one corporate, one individual developer)
•	1 registered project with GPS, BOQ uploaded
•	1 completed appraisal with conditions
•	1 active loan facility with repayment schedule
•	3 milestones (Foundation 30%, Superstructure 65%, Completion 100%)
•	1 approved drawdown and 1 pending drawdown
•	2 site visit reports with mock photos
•	1 contractor with performance scores
•	5 sample risk alerts (mixed severities)
•	Sample ledger entries and 1 repayment
________________________________________
DESIGN SYSTEM TOKENS
css
--color-primary: #1E3A5F;        /* Deep navy — brand primary */
--color-primary-light: #2D5F8A;  /* Hover/active states */
--color-accent: #F59E0B;         /* Amber — warnings, highlights */
--color-success: #10B981;        /* Green — approved, active, on track */
--color-danger: #EF4444;         /* Red — critical, blocked, rejected */
--color-warning: #F59E0B;        /* Amber — pending, monitoring */
--color-surface: #F8FAFC;        /* Light grey page background */
--color-border: #E2E8F0;         /* Subtle border */
--font-sans: 'Inter', sans-serif;
--radius: 8px;
--shadow-card: 0 1px 3px rgba(0,0,0,0.08);
________________________________________
PHASE 1 MVP SCOPE (Build First)
Focus the initial build on these modules only. Other modules can be stubbed with "Coming Soon" placeholders:
1.	Authentication & RBAC
2.	Customer & Developer Onboarding
3.	Project Registration
4.	Document Management
5.	Credit Appraisal
6.	Loan Facility Management
7.	Milestone-Based Drawdown (basic workflow)
8.	Basic Risk Score display
9.	Payments Approval Register
10.	Executive Dashboard (key KPIs + charts)




Use this supabase project,,
Publishable key sb_publishable_JiVqyUTtPAq4Jf9wUAXZDQ_WbLjPaCv

Annon key eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6eXhsbGRxaG5icHJwaWxjc29wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4NTQwMjQsImV4cCI6MjA5NTQzMDAyNH0.ytYgB5kX3MByuJOXiQRIcrUfdeYjsHhZsMrC_Dr3isg

Project id wzyxlldqhnbprpilcsop
Super admin email macknonvulimu@gmail.com
________________________________________
LOVABLE-SPECIFIC INSTRUCTIONS
•	Use Supabase as the backend — do not use local mock data except for the seed script
•	Generate all Supabase table migrations as SQL in a /supabase/migrations/ folder
•	Use shadcn/ui for all UI primitives (Button, Input, Select, Dialog, Tabs, Sheet, Card, Badge, Table, etc.)
•	Every list page must include: search bar, status filter, pagination, and an "Export CSV" button
•	Every detail page must include: a status badge in the header, an audit log drawer accessible via an "Activity" button, and a breadcrumb
•	Do not use placeholder lorem ipsum data in the final UI — use realistic construction finance data in the seed
•	Add loading skeletons (not spinners) on all data-fetching states
•	All currency values formatted as KES X,XXX,XXX (Kenyan Shilling)
•	All dates formatted as DD MMM YYYY (e.g. 15 Jan 2025)
•	Percentages shown to 1 decimal place (e.g. 72.5%)
Share
Content
Kinetic_BUILDTRACK360.docx
docx



## Build with Lovable


- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
