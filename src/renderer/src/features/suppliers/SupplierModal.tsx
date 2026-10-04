import { useState, useEffect, useCallback } from 'react';
import { Modal } from '@renderer/components/ui/Modal';
import { Button } from '@renderer/components/ui/Button';
import { Input } from '@renderer/components/ui/Input';
import { useSuppliersStore } from '@renderer/stores/suppliersStore';
import { parseMoneyToMinor } from '@shared/utils/format';
import { formatMoney } from '@shared/utils/money';
import { isValidNonNegativeNumber, NON_NEGATIVE_NUMBER_ERROR } from '@shared/utils/validation';
import type { SupplierRow } from '@shared/types/purchases';

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: SupplierRow | null; // null = Add, non-null = Edit
}

interface FormState {
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  opening_balance: string;
}

const DEFAULT_FORM: FormState = {
  name: '',
  contact_person: '',
  phone: '',
  email: '',
  address: '',
  opening_balance: '',
};

export function SupplierModal({
  isOpen,
  onClose,
  supplier,
}: SupplierModalProps): React.JSX.Element | null {
  const { createSupplier, updateSupplier } = useSuppliersStore();
  const [form, setForm] = useState<FormState>({ ...DEFAULT_FORM });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEdit = Boolean(supplier);

  useEffect(() => {
    if (supplier) {
      setForm({
        name: supplier.name,
        contact_person: supplier.contact_person || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || '',
        opening_balance: (supplier.opening_balance_minor / 100).toString(),
      });
    } else {
      setForm({ ...DEFAULT_FORM });
    }
    setErrors({});
  }, [supplier, isOpen]);

  const handleClose = useCallback(() => {
    setForm({ ...DEFAULT_FORM });
    setErrors({});
    onClose();
  }, [onClose]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]): void => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) newErrors.name = 'Supplier name is required';
    if (form.opening_balance && !isValidNonNegativeNumber(form.opening_balance)) {
      newErrors.opening_balance = NON_NEGATIVE_NUMBER_ERROR;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.SyntheticEvent): Promise<void> => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      if (isEdit && supplier) {
        const success = await updateSupplier({
          id: supplier.id,
          name: form.name.trim(),
          contact_person: form.contact_person.trim() || undefined,
          phone: form.phone.trim() || undefined,
          email: form.email.trim() || undefined,
          address: form.address.trim() || undefined,
        });
        if (success) handleClose();
      } else {
        const openingMinor = form.opening_balance ? parseMoneyToMinor(form.opening_balance) : 0;
        const res = await createSupplier({
          name: form.name.trim(),
          contact_person: form.contact_person.trim() || undefined,
          phone: form.phone.trim() || undefined,
          email: form.email.trim() || undefined,
          address: form.address.trim() || undefined,
          opening_balance_minor: openingMinor,
        });
        if (res) handleClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEdit ? 'Edit Supplier' : 'Add New Supplier'}
      description={isEdit ? `Update details for ${supplier?.name ?? ''}` : 'Register a new supplier or distributor'}
      size="md"
    >
      <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-3" noValidate>
        <Input
          id="supplier-name"
          label="Supplier / Company Name"
          required
          placeholder="e.g. Metro Cash & Carry, Unilever Distributor"
          value={form.name}
          onChange={(e) => { setField('name', e.target.value); }}
          error={errors.name}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            id="supplier-contact"
            label="Contact Person"
            placeholder="e.g. Tariq Mehmood"
            value={form.contact_person}
            onChange={(e) => { setField('contact_person', e.target.value); }}
          />
          <Input
            id="supplier-phone"
            label="Phone Number"
            placeholder="e.g. 0300-1234567"
            value={form.phone}
            onChange={(e) => { setField('phone', e.target.value); }}
          />
        </div>

        <Input
          id="supplier-email"
          label="Email (optional)"
          type="email"
          placeholder="e.g. orders@supplier.com"
          value={form.email}
          onChange={(e) => { setField('email', e.target.value); }}
        />

        <Input
          id="supplier-address"
          label="Address / Location"
          placeholder="e.g. Plot 12, Wholesale Market, Lahore"
          value={form.address}
          onChange={(e) => { setField('address', e.target.value); }}
        />

        {!isEdit && (
          <Input
            id="supplier-opening-balance"
            label="Opening Balance (PKR)"
            type="number"
            min="0"
            step="any"
            placeholder="0.00 (amount mart owes supplier)"
            value={form.opening_balance}
            onChange={(e) => { setField('opening_balance', e.target.value.startsWith('-') ? '' : e.target.value); }}
            error={errors.opening_balance}
            hint={
              form.opening_balance && parseMoneyToMinor(form.opening_balance) > 0
                ? `Payable to supplier: ${formatMoney(parseMoneyToMinor(form.opening_balance))}`
                : 'Initial payable balance if starting with existing credit'
            }
          />
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {isEdit ? 'Save Changes' : 'Register Supplier'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
