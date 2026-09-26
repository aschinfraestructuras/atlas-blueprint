-- Drop the overly restrictive action check constraint and replace with a broader one
-- that covers all action types used by the application's audit service.
ALTER TABLE public.audit_log
  DROP CONSTRAINT IF EXISTS audit_log_action_check;

ALTER TABLE public.audit_log
  ADD CONSTRAINT audit_log_action_check CHECK (
    action = ANY (ARRAY[
      'INSERT',
      'UPDATE',
      'DELETE',
      'BULK_SAVE',
      'BULK_MARK_OK',
      'LINK_NC',
      'ARCHIVE',
      'status_change',
      'STATUS_CHANGE',
      'EXPORT',
      'LOGIN',
      'LOGOUT',
      'APPROVE',
      'REJECT',
      'SUBMIT',
      'REOPEN'
    ])
  );
