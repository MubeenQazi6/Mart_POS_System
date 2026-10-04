export interface BackupMetadata {
  id: string;
  app_name: string;
  app_version: string;
  database_version: string;
  created_at: string;
  store_name: string;
  filename: string;
  file_path: string;
  size_bytes: number;
  tables_count: number;
  records_count: number;
  is_automatic_safety?: boolean;
}

export interface BackupValidationResult {
  is_valid: boolean;
  error?: string;
  metadata?: BackupMetadata;
  tables_found: string[];
  missing_required_tables: string[];
  integrity_check_passed: boolean;
  foreign_keys_valid: boolean;
}

export interface RestoreResult {
  success: boolean;
  pre_restore_backup_path?: string;
  restored_tables_count?: number;
  restored_at?: string;
  error?: string;
}

export interface DatabaseStats {
  size_bytes: number;
  tables_count: number;
  total_records: number;
  last_backup?: BackupMetadata | null;
  database_path: string;
  backups_directory: string;
}
