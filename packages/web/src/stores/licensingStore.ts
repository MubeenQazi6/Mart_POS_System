import { create } from 'zustand';
import type { LicenseStatus, ActivationResult } from '@shared/types/licensing';
import { showToast } from '@renderer/components/ui/Toast';

interface LicensingState {
  status: LicenseStatus | null;
  machineCode: string;
  isLoading: boolean;
  isActivating: boolean;
  isActivationModalOpen: boolean;
  trialDaysRemaining: number | null;

  loadStatus: () => Promise<void>;
  activate: (licenseKeyOrJson: string) => Promise<ActivationResult | null>;
  deactivate: () => Promise<boolean>;
  openActivationModal: () => void;
  closeActivationModal: () => void;
  getTrialDaysRemaining: () => number | null;
  isTrialActive: () => boolean;
  isTrialExpired: () => boolean;
}

export const useLicensingStore = create<LicensingState>((set, get) => ({
  status: null,
  machineCode: '',
  isLoading: false,
  isActivating: false,
  isActivationModalOpen: false,
  trialDaysRemaining: null,

  loadStatus: async () => {
    if (!window.martpos) return;
    set({ isLoading: true });
    try {
      const [statusRes, machineRes] = await Promise.all([
        window.martpos.licensing.getStatus(),
        window.martpos.licensing.getMachineCode(),
      ]);

      if (statusRes.success && statusRes.data) {
        const status = statusRes.data;
        let trialDays = null;
        if (status.status === 'TRIAL') {
          trialDays = status.days_remaining ?? 0;
        }
        set({ 
          status: status,
          trialDaysRemaining: trialDays
        });
      }
      if (machineRes.success && machineRes.data) {
        set({ machineCode: machineRes.data });
      }
    } catch {
      // Non-blocking
    } finally {
      set({ isLoading: false });
    }
  },

  activate: async (licenseKeyOrJson: string) => {
    if (!window.martpos || get().isActivating) return null;
    const cleanLicenseInput = licenseKeyOrJson.trim();
    if (!cleanLicenseInput) {
      showToast('error', 'Please provide a license key or file content');
      return null;
    }
    set({ isActivating: true });
    try {
      const res = await window.martpos.licensing.activate(cleanLicenseInput);
      if (res.success && res.data) {
        if (res.data.success) {
          showToast('success', 'License activated successfully!');
          const status = res.data.status;
          let trialDays = null;
          if (status.status === 'TRIAL') {
            trialDays = status.days_remaining ?? 0;
          }
          set({ 
            status: status,
            trialDaysRemaining: trialDays,
            isActivationModalOpen: false 
          });
          // Explicitly reload from main process to guarantee sync with database
          await get().loadStatus();
        } else {
          showToast('error', res.data.error ?? 'Activation failed');
        }
        return res.data;
      }
      showToast('error', !res.success ? res.error : 'License activation failed');
      return null;
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Activation error');
      return null;
    } finally {
      set({ isActivating: false });
    }
  },

  deactivate: async () => {
    if (!window.martpos) return false;
    try {
      const res = await window.martpos.licensing.deactivate();
      if (res.success) {
        showToast('info', 'License removed from this machine');
        set({ trialDaysRemaining: null });
        void get().loadStatus();
        return true;
      }
      showToast('error', res.error ?? 'Failed to deactivate license');
      return false;
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to deactivate');
      return false;
    }
  },

  openActivationModal: () => set({ isActivationModalOpen: true }),
  closeActivationModal: () => set({ isActivationModalOpen: false }),

  // Trial methods - properly implemented
  getTrialDaysRemaining: () => {
    const status = get().status;
    if (!status) return null;
    // If licensed, no trial days remaining
    if (status.is_active) return 0;
    // If trial is active, return days remaining
    if (status.status === 'TRIAL') {
      return status.days_remaining ?? 0;
    }
    return null;
  },

  isTrialActive: () => {
    const status = get().status;
    if (!status) return false;
    // Trial is active if status is 'TRIAL' and not expired
    return status.status === 'TRIAL' && (status.days_remaining ?? 0) > 0;
  },

  isTrialExpired: () => {
    const status = get().status;
    if (!status) return false;
    // Trial is expired if status is 'TRIAL' and days remaining is 0 or less
    if (status.status === 'TRIAL') {
      return (status.days_remaining ?? 0) <= 0;
    }
    // Also expired if status is 'EXPIRED'
    return status.status === 'EXPIRED';
  },
}));