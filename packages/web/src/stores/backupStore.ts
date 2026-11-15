import { create } from 'zustand';
import type {
  BackupMetadata,
  BackupValidationResult,
  RestoreResult,
  DatabaseStats,
} from '@shared/types/backup';
import { showToast } from '@renderer/components/ui/Toast';

interface BackupState {
  backups: BackupMetadata[];
  stats: DatabaseStats | null;
  isLoading: boolean;
  isCreating: boolean;
  isRestoring: boolean;
  isDownloading: boolean;
  selectedBackupPath: string | null;
  validationResult: BackupValidationResult | null;
  isConfirmRestoreOpen: boolean;

  loadBackupsAndStats: () => Promise<void>;
  createBackup: (notes?: string) => Promise<BackupMetadata | null>;
  selectAndValidateFile: (filePath?: string) => Promise<BackupValidationResult | null>;
  restoreSelectedBackup: () => Promise<RestoreResult | null>;
  downloadDb: () => Promise<boolean>;
  clearSelection: () => void;
  openRestoreConfirm: () => void;
  closeRestoreConfirm: () => void;
}

export const useBackupStore = create<BackupState>((set, get) => ({
  backups: [],
  stats: null,
  isLoading: false,
  isCreating: false,
  isRestoring: false,
  isDownloading: false, // Properly initialized as false
  selectedBackupPath: null,
  validationResult: null,
  isConfirmRestoreOpen: false,

  loadBackupsAndStats: async () => {
    if (!window.martpos) return;
    set({ isLoading: true });
    try {
      const [listRes, statsRes] = await Promise.all([
        window.martpos.backup.list(),
        window.martpos.backup.getStats(),
      ]);

      if (listRes.success) {
        set({ backups: listRes.data });
      }
      if (statsRes.success) {
        set({ stats: statsRes.data });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load backup data';
      showToast('error', errorMessage);
    } finally {
      set({ isLoading: false });
    }
  },

  createBackup: async (notes?: string) => {
    if (!window.martpos) return null;
    set({ isCreating: true });
    try {
      const res = await window.martpos.backup.create(notes);
      if (res.success) {
        showToast('success', `Backup created successfully (${res.data.filename})`);
        await get().loadBackupsAndStats();
        return res.data;
      }
      showToast('error', res.error || 'Failed to create backup');
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Backup creation error';
      showToast('error', errorMessage);
      return null;
    } finally {
      set({ isCreating: false });
    }
  },

  selectAndValidateFile: async (filePath?: string) => {
    if (!window.martpos) return null;
    try {
      let targetPath = filePath;
      if (!targetPath) {
        const selectRes = await window.martpos.backup.selectFile();
        if (!selectRes.success || !selectRes.data) {
          return null;
        }
        targetPath = selectRes.data;
      }

      set({ selectedBackupPath: targetPath, isLoading: true });
      const valRes = await window.martpos.backup.validate(targetPath);
      if (valRes.success) {
        set({ validationResult: valRes.data });
        if (!valRes.data.is_valid) {
          showToast('error', valRes.data.error || 'Invalid database backup file');
        } else {
          showToast('info', 'Backup file validated successfully');
          set({ isConfirmRestoreOpen: true });
        }
        return valRes.data;
      }
      showToast('error', valRes.error || 'Validation failed');
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Validation error';
      showToast('error', errorMessage);
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  restoreSelectedBackup: async () => {
    const { selectedBackupPath } = get();
    if (!window.martpos || !selectedBackupPath) return null;

    set({ isRestoring: true });
    try {
      const res = await window.martpos.backup.restore(selectedBackupPath);
      if (res.success) {
        showToast('success', 'Database restored successfully! All data reconciled.');
        set({ isConfirmRestoreOpen: false, selectedBackupPath: null, validationResult: null });
        await get().loadBackupsAndStats();
        return res.data;
      }
      showToast('error', res.error || 'Database restoration failed');
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Restore error';
      showToast('error', errorMessage);
      return null;
    } finally {
      set({ isRestoring: false });
    }
  },

  clearSelection: () => set({ 
    selectedBackupPath: null, 
    validationResult: null, 
    isConfirmRestoreOpen: false 
  }),
  
  openRestoreConfirm: () => set({ isConfirmRestoreOpen: true }),
  
  closeRestoreConfirm: () => set({ isConfirmRestoreOpen: false }),

  downloadDb: async () => {
    if (!window.martpos) return false;
    set({ isDownloading: true }); // Set to true when starting download
    try {
      const res = await window.martpos.backup.downloadDb();
      if (res.success) {
        if (res.data) {
          showToast('success', 'Database downloaded successfully!');
        }
        set({ isDownloading: false }); // Reset to false on success
        return true;
      }
      showToast('error', res.error || 'Failed to download database');
      set({ isDownloading: false }); // Reset to false on error
      return false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Download error';
      showToast('error', errorMessage);
      set({ isDownloading: false }); // Reset to false on error
      return false;
    }
  },
}));