
-- 1) Add missing roles to the roles table
INSERT INTO public.roles (code, name) VALUES
  ('project_manager', 'Project Manager'),
  ('technician', 'Technician')
ON CONFLICT (code) DO NOTHING;

-- 2) Expand audit_log_action_check to include all actions used by RPCs
ALTER TABLE public.audit_log DROP CONSTRAINT IF EXISTS audit_log_action_check;
ALTER TABLE public.audit_log ADD CONSTRAINT audit_log_action_check CHECK (
  action = ANY(ARRAY[
    'INSERT', 'UPDATE', 'DELETE',
    'BULK_SAVE', 'BULK_MARK_OK', 'LINK_NC',
    'ARCHIVE', 'status_change', 'STATUS_CHANGE',
    'EXPORT', 'LOGIN', 'LOGOUT',
    'APPROVE', 'REJECT', 'SUBMIT', 'REOPEN',
    'MEMBER_ADDED', 'INVITE_CREATED', 'INVITE_ACCEPTED',
    'ROLE_CHANGED', 'MEMBER_REMOVED',
    'NEW_VERSION'
  ])
);
