
ALTER TABLE sheet_configs ADD COLUMN block_height int NOT NULL DEFAULT 18;

ALTER TABLE sheet_sync_logs ADD COLUMN changes jsonb NOT NULL DEFAULT '[]';

ALTER TABLE sheet_sync_logs DROP CONSTRAINT sheet_sync_logs_triggered_by_check;
ALTER TABLE sheet_sync_logs ADD CONSTRAINT sheet_sync_logs_triggered_by_check
  CHECK (triggered_by IN ('cron', 'manual', 'rollback'));
