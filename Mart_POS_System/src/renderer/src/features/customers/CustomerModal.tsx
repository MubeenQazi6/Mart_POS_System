import { useState, useEffect, useCallback } from 'react';
import { Modal } from '@renderer/components/ui/Modal';
import { Button } from '@renderer/components/ui/Button';
import { Input } from '@renderer/components/ui/Input';
import { useCustomersStore } from '@renderer/stores/customersStore';
import { parseMoneyToMinor } from '@shared/utils/format';
import { formatMoney } from '@shared/utils/money';
import type { CustomerRow } from '@shared/types/customers';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerRow | null; // null = Add, non-null = Edit
}

interface FormState {
  name: string;
  phone: string;
  email: string;
  address: string;
  credit_limit: string;
  opening_balance: string;
}

const DEFAULT_FORM: FormState = {
  name: '',
  phone: '',
  email: '',
  address: '',
  credit_limit: '',
  opening_balance: '',
};

export function CustomerModal({
  isOpen,
  onClose,
  customer,
}: CustomerModalProps): React.JSX.Element | null {
  const { createCustomer, updateCustomer } = useCustomersStore();
  const [form, setForm] = useState<FormState>({ ...DEFAULT_FORM });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEdit = Boolean(customer);

  useEffect(() => {
    if (customer) {
      setForm({
        name: customer.name,
        phone: customer.phone,
        email: customer.email || '',
        address: customer.address || '',
        credit_limit: customer.credit_limit_minor > 0 ? (customer.credit_limit_minor / 100).toString() : '',
        opening_balance: (customer.opening_balance_minor / 100).toString(),
      });
    } else {
      setForm({ ...DEFAULT_FORM });
    }
    setErrors({});
  }, [customer, isOpen]);

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
    if (!form.name.trim()) newErrors.name = 'Customer name is required';
    if (!form.phone.trim()) newErrors.phone = 'Phone number is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.SyntheticEvent): Promise<void> => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const creditLimitMinor = form.credit_limit ? parseMoneyToMinor(form.credit_limit) : 0;
      if (isEdit && customer) {
        const success = await updateCustomer({
          id: customer.id,
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || undefined,
          address: form.address.trim() || undefined,
          credit_limit_minor: creditLimitMinor,
        });
        if (success) handleClose();
      } else {
        const openingMinor = form.opening_balance ? parseMoneyToMinor(form.opening_balance) : 0;
        const res = await createCustomer({
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || undefined,
          address: form.address.trim() || undefined,
          credit_limit_minor: creditLimitMinor,
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
      title={isEdit ? 'Edit Customer' : 'Register New Customer'}
      description={isEdit ? `Update profile for ${customer?.name ?? ''}` : 'Register a customer for POS checkout and Khata credit account'}
      size="md"
    >
      <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-3" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <Input
            id="customer-name"
            label="Customer Name"
            required
            placeholder="e.g. Imran Khan, Usman Ali"
            value={form.name}
            onChange={(e) => { setField('name', e.target.value); }}
            error={errors.name}
          />
          <Input
            id="customer-phone"
            label="Phone Number"
            required
            placeholder="e.g. 0300-1234567"
            value={form.phone}
            onChange={(e) => { setField('phone', e.target.value); }}
            error={errors.phone}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            id="customer-email"
            label="Email (optional)"
            type="email"
            placeholder="e.g. customer@gmail.com"
            value={form.email}
            onChange={(e) => { setField('email', e.target.value); }}
          />
          <Input
            id="customer-credit-limit"
            label="Khata Credit Limit (PKR)"
            type="number"
            step="any"
            placeholder="0 = Unlimited / default"
            value={form.credit_limit}
            onChange={(e) => { setField('credit_limit', e.target.value); }}
            hint={
              form.credit_limit && parseMoneyToMinor(form.credit_limit) > 0
                ? `Max allowed credit: ${formatMoney(parseMoneyToMinor(form.credit_limit))}`
                : 'Maximum outstanding credit allowed'
            }
          />
        </div>

        <Input
          id="customer-address"
          label="Address / Area"
          placeholder="e.g. House #14, Street 5, Gulberg"
          value={form.address}
          onChange={(e) => { setField('address', e.target.value); }}
        />

        {!isEdit && (
          <Input
            id="customer-opening-balance"
            label="Opening Khata Balance (PKR)"
            type="number"
            step="any"
            placeholder="0.00 (existing customer debt)"
            value={form.opening_balance}
            onChange={(e) => { setField('opening_balance', e.target.value); }}
            hint={
              form.opening_balance && parseMoneyToMinor(form.opening_balance) > 0
                ? `Customer owes: ${formatMoney(parseMoneyToMinor(form.opening_balance))}`
                : 'Initial receivable balance if starting with existing debt'
            }
          />
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {isEdit ? 'Save Changes' : 'Register Customer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
