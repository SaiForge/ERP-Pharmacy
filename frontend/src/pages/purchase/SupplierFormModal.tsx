import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Supplier } from '../../types';

const supplierSchema = z.object({
  name: z.string().min(1, 'Company / Supplier name is required'),
  contact_person: z.string().min(1, 'Contact person name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  email: z.string().email('Invalid email address'),
  address: z.string().min(1, 'Full address is required'),
  gst_number: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});

type SupplierFormData = z.infer<typeof supplierSchema>;

interface SupplierFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SupplierFormData) => Promise<void>;
  initialData?: Supplier | null;
  isLoading?: boolean;
}

export const SupplierFormModal: React.FC<SupplierFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading = false,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      is_active: true,
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        contact_person: initialData.contact_person,
        phone: initialData.phone,
        email: initialData.email,
        address: initialData.address,
        gst_number: initialData.gst_number || '',
        is_active: initialData.is_active,
      });
    } else {
      reset({
        name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        gst_number: '',
        is_active: true,
      });
    }
  }, [initialData, reset, isOpen]);

  const handleFormSubmit = async (data: SupplierFormData) => {
    await onSubmit(data);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Supplier' : 'Register New Vendor / Supplier'}
      subtitle="Authorized wholesale pharmaceutical distributor credentials"
      maxWidth="md"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit(handleFormSubmit)} isLoading={isLoading}>
            {initialData ? 'Save Changes' : 'Register Supplier'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <Input
          label="Distributor / Firm Name"
          required
          placeholder="e.g. Apex Healthcare Distributors"
          {...register('name')}
          error={errors.name?.message}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Representative / Contact Person"
            required
            placeholder="e.g. Ramesh Gupta"
            {...register('contact_person')}
            error={errors.contact_person?.message}
          />
          <Input
            label="Phone Number"
            required
            placeholder="+91 98765 43210"
            {...register('phone')}
            error={errors.phone?.message}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Official Email"
            type="email"
            required
            placeholder="orders@distributor.com"
            {...register('email')}
            error={errors.email?.message}
          />
          <Input
            label="GSTIN / Tax ID"
            placeholder="07AAAAA0000A1Z5"
            {...register('gst_number')}
            error={errors.gst_number?.message}
          />
        </div>

        <Input
          label="Warehouse / Billing Address"
          required
          placeholder="Plot number, industrial area, city, pincode"
          {...register('address')}
          error={errors.address?.message}
        />
      </form>
    </Modal>
  );
};
