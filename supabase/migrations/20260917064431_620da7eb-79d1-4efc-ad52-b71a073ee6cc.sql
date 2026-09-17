-- Clear dangling references so the new links can be created safely
UPDATE public.loan_facilities l SET customer_id = NULL
 WHERE customer_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.customers c WHERE c.id = l.customer_id);
UPDATE public.loan_facilities l SET project_id = NULL
 WHERE project_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = l.project_id);
UPDATE public.credit_monitoring_reports r SET customer_id = NULL
 WHERE customer_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.customers c WHERE c.id = r.customer_id);
UPDATE public.credit_monitoring_reports r SET project_id = NULL
 WHERE project_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = r.project_id);
DELETE FROM public.credit_monitoring_reports r
 WHERE NOT EXISTS (SELECT 1 FROM public.loan_facilities l WHERE l.id = r.loan_id);
UPDATE public.site_visits v SET loan_id = NULL
 WHERE loan_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.loan_facilities l WHERE l.id = v.loan_id);
UPDATE public.site_visits v SET drawdown_request_id = NULL
 WHERE drawdown_request_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.drawdown_requests d WHERE d.id = v.drawdown_request_id);

ALTER TABLE public.loan_facilities
  ADD CONSTRAINT loan_facilities_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD CONSTRAINT loan_facilities_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;

ALTER TABLE public.credit_monitoring_reports
  ADD CONSTRAINT credit_monitoring_reports_loan_id_fkey FOREIGN KEY (loan_id) REFERENCES public.loan_facilities(id) ON DELETE CASCADE,
  ADD CONSTRAINT credit_monitoring_reports_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD CONSTRAINT credit_monitoring_reports_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;

ALTER TABLE public.site_visits
  ADD CONSTRAINT site_visits_loan_id_fkey FOREIGN KEY (loan_id) REFERENCES public.loan_facilities(id) ON DELETE SET NULL,
  ADD CONSTRAINT site_visits_drawdown_request_id_fkey FOREIGN KEY (drawdown_request_id) REFERENCES public.drawdown_requests(id) ON DELETE SET NULL;