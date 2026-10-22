# BuildTrack360 customer progress portal

## Feature branch

`feat/customer-progress-portal`

Draft pull request: https://github.com/Mackdish/fundstride-core-b711e33b/pull/1

## Migration order

Apply the following migrations to a staging Supabase project in filename order:

1. `20261022090000_customer_portal_access.sql` — invitations and explicit project access.
2. `20261022091000_project_progress_updates.sql` — progress update drafts, publication metadata, and revision history.
3. `20261022092000_project_progress_photos.sql` — private photo bucket, metadata, and storage policies.
4. `20261022093000_in_app_notifications.sql` — user-scoped notifications.
5. `20261022094000_project_customer_contributions.sql` — customer contribution ledger.
6. `20261022095000_project_construction_milestones.sql` — construction milestones separate from financing milestones.

These migrations are additive. They do not replace or drop existing customers, projects, financing milestones, loans, drawdowns, payments, or repayments.

## Required configuration

- Configure Supabase Auth email delivery.
- Add the deployed BuildTrack360 URL and its `/portal` redirect path to the Supabase Auth allowed redirect URLs.
- Keep `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY` server-only. Never expose either value through `VITE_*` variables or browser bundles.
- The `progress-photos` bucket is private; do not make it public.

## Local verification

Run:

```bash
bun install --frozen-lockfile
bun run lint
bun run build
```

A GitHub Actions workflow on the feature branch runs the same lint and production-build checks. No successful workflow result should be assumed until GitHub reports it.

## Staging acceptance checklist

### Customer access
- [ ] Staff can invite a new customer and link an existing same-tenant customer account.
- [ ] Cross-tenant account linking is rejected.
- [ ] Customer A cannot query Customer B's projects, milestones, photos, notifications, contributions, or financial summary.
- [ ] A project grant reveals only that project and can be revoked.
- [ ] A revoked or inactive account loses access.

### Progress updates
- [ ] Progress percentage rejects values below 0 or above 100.
- [ ] Staff can save a draft; customers cannot see it.
- [ ] Authorized staff can publish directly.
- [ ] Published updates cannot be edited in place; corrections create a new update.
- [ ] Audit history is created for every saved update.
- [ ] Notifications are created only after publication and successful audit-history insertion.

### Photos
- [ ] Multiple JPEG, PNG, and WebP photos can be uploaded (10 MB maximum each).
- [ ] Unsupported formats and oversized files are rejected.
- [ ] Storage objects remain private and are scoped to tenant/project/update.
- [ ] Customers can read photos only for published updates they are authorized to view.
- [ ] Failed metadata writes do not leave orphaned files during normal error handling.

### Milestones and finance
- [ ] Construction milestones remain separate from drawdown/financing milestones.
- [ ] Draft construction milestones are hidden from customers.
- [ ] Only the linked customer account and authorized finance staff can view financial records.
- [ ] Project-only access grants do not grant access to finance records.
- [ ] Contributions are audited; customers see confirmed contributions only.
- [ ] Payment and drawdown statuses are displayed as stored rather than inferred.

## Important release note

The connected GitHub repository can be edited through the feature branch, but this session has no verified connection to the live Supabase database. The migrations have been committed as files only; they have **not** been applied to production. Review and test them in staging before merging or deploying.