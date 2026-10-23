import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Medicine } from '../../types';

const medicineSchema = z.object({
  name: z.string().min(1, 'Brand name is required'),
  generic_name: z.string().min(1, 'Generic name is required'),
  category: z.string().min(1, 'Category is required'),
  manufacturer: z.string().min(1, 'Manufacturer is required'),
  unit: z.string().min(1, 'Unit form is required'),
  pack_size: z.coerce.number().min(1, 'Pack size must be at least 1'),
  reorder_level: z.coerce.number().min(0, 'Reorder level cannot be negative'),
  hsn_code: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});

type MedicineFormData = z.infer<typeof medicineSchema>;

interface MedicineFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: MedicineFormData) => Promise<void>;
  initialData?: Medicine | null;
  isLoading?: boolean;
}

const UNIT_OPTIONS = [
  { value: 'Tablet', label: 'Tablet' },
  { value: 'Capsule', label: 'Capsule' },
  { value: 'Syrup', label: 'Syrup / Suspension' },
  { value: 'Injection', label: 'Injection / Vial' },
  { value: 'Ointment', label: 'Ointment / Cream' },
  { value: 'Drops', label: 'Eye / Ear Drops' },
  { value: 'Inhaler', label: 'Inhaler / Respules' },
  { value: 'IV Fluid', label: 'IV Infusion Bottle' },
];

export const MedicineFormModal: React.FC<MedicineFormModalProps> = ({
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
  } = useForm<MedicineFormData>({
    resolver: zodResolver(medicineSchema),
    defaultValues: {
      pack_size: 1,
      reorder_level: 10,
      is_active: true,
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        generic_name: initialData.generic_name,
        category: initialData.category,
        manufacturer: initialData.manufacturer,
        unit: initialData.unit,
        pack_size: initialData.pack_size,
        reorder_level: initialData.reorder_level,
        hsn_code: initialData.hsn_code || '',
        is_active: initialData.is_active,
      });
    } else {
      reset({
        name: '',
        generic_name: '',
        category: '',
        manufacturer: '',
        unit: 'Tablet',
        pack_size: 1,
        reorder_level: 10,
        hsn_code: '',
        is_active: true,
      });
    }
  }, [initialData, reset, isOpen]);

  const handleFormSubmit = async (data: MedicineFormData) => {
    await onSubmit(data);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Medicine' : 'Add New Medicine to Catalog'}
      subtitle="Define clinical catalog details, packaging unit, and reorder threshold"
      maxWidth="lg"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit(handleFormSubmit)} isLoading={isLoading}>
            {initialData ? 'Save Changes' : 'Create Medicine'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Brand / Commercial Name"
            placeholder="e.g. Amoxicillin 500mg"
            required
            {...register('name')}
            error={errors.name?.message}
          />
          <Input
            label="Generic / Chemical Name"
            placeholder="e.g. Amoxicillin Trihydrate"
            required
            {...register('generic_name')}
            error={errors.generic_name?.message}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Therapeutic Category"
            placeholder="e.g. Antibiotics, Analgesics"
            required
            {...register('category')}
            error={errors.category?.message}
          />
          <Input
            label="Manufacturer"
            placeholder="e.g. Cipla Ltd, Sun Pharma"
            required
            {...register('manufacturer')}
            error={errors.manufacturer?.message}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Select
            label="Dosage Form Unit"
            options={UNIT_OPTIONS}
            required
            {...register('unit')}
            error={errors.unit?.message}
          />
          <Input
            label="Pack Size (Units/Pack)"
            type="number"
            required
            {...register('pack_size')}
            error={errors.pack_size?.message}
          />
          <Input
            label="Reorder Threshold"
            type="number"
            required
            helperText="Alerts when total stock drops to this"
            {...register('reorder_level')}
            error={errors.reorder_level?.message}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="HSN Code (GST/Tax)"
            placeholder="e.g. 300410"
            {...register('hsn_code')}
            error={errors.hsn_code?.message}
          />
          <div className="flex items-center space-x-2 pt-6">
            <input
              type="checkbox"
              id="is_active_check"
              className="rounded border-border text-accent focus:ring-0 w-4 h-4"
              {...register('is_active')}
            />
            <label htmlFor="is_active_check" className="text-xs font-medium text-text-primary">
              Active in hospital formulary
            </label>
          </div>
        </div>
      </form>
    </Modal>
  );
};
