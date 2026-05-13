ALTER TABLE sheet_sync_logs DROP CONSTRAINT sheet_sync_logs_status_check;
ALTER TABLE sheet_sync_logs ADD CONSTRAINT sheet_sync_logs_status_check
    CHECK (status IN ('success', 'warning', 'partial', 'failed'));
