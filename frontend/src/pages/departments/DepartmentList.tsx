import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Building2, MapPin, UserCheck } from 'lucide-react';
import { departmentsApi } from '../../api/departments';
import { Table, Column } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Topbar } from '../../components/ui/Topbar';
import { Department } from '../../types';

export const DepartmentList: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [departmentHead, setDepartmentHead] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['departments', search],
    queryFn: () => departmentsApi.list({ search: search || undefined }),
  });

  const createMutation = useMutation({
    mutationFn: departmentsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setIsModalOpen(false);
      setName('');
      setLocation('');
      setDepartmentHead('');
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to create department');
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !location.trim() || !departmentHead.trim()) {
      setFormError('All fields are required.');
      return;
    }
    createMutation.mutate({
      name: name.trim(),
      location: location.trim(),
      department_head: departmentHead.trim(),
      is_active: true,
    });
  };

  const columns: Column<Department>[] = [
    {
      key: 'name',
      header: 'Department / Unit',
      render: (d) => (
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-surface-alt rounded text-accent">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-text-primary block">{d.name}</span>
            <span className="text-xs text-text-secondary">{d.location}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'department_head',
      header: 'Department Incharge',
      render: (d) => (
        <div className="flex items-center gap-1.5 text-xs text-text-primary">
          <UserCheck className="w-3.5 h-3.5 text-slate-400" />
          <span>{d.department_head}</span>
        </div>
      ),
    },
    {
      key: 'active_issues_count',
      header: 'Pending Requisitions',
      render: (d) => (
        <Badge variant={d.active_issues_count ? 'warning' : 'neutral'} size="sm">
          {d.active_issues_count || 0} pending
        </Badge>
      ),
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (d) => (
        <Badge variant={d.is_active ? 'success' : 'neutral'} size="sm">
          {d.is_active ? 'Active Unit' : 'Inactive'}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Topbar
        title="Hospital Departments & Clinical Units"
        subtitle="Manage wards, ICUs, and specialized departments requesting internal pharmacy stock"
        actions={
          <Button size="sm" variant="primary" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Add Department
          </Button>
        }
      />

      <div className="bg-white border border-border rounded-md p-4 flex items-center justify-between">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search departments, locations, incharge..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
      </div>

      <Table
        columns={columns}
        data={data?.items || []}
        keyExtractor={(d) => d.id}
        isLoading={isLoading}
        emptyMessage="No departments found."
      />

      {/* Add Department Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Register Hospital Department"
        subtitle="Configure hospital ward / internal unit for pharmacy indents"
        maxWidth="md"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateSubmit}
              isLoading={createMutation.isPending}
            >
              Register Department
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-danger-soft border border-danger/30 rounded text-danger text-xs">
              {formError}
            </div>
          )}

          <Input
            label="Department / Ward Name"
            required
            placeholder="e.g. Intensive Care Unit (ICU)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Input
            label="Physical Hospital Location"
            required
            placeholder="e.g. Block A, 2nd Floor, Room 204"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />

          <Input
            label="Department Incharge / Head Physician"
            required
            placeholder="e.g. Dr. K. N. Rao"
            value={departmentHead}
            onChange={(e) => setDepartmentHead(e.target.value)}
          />
        </form>
      </Modal>
    </div>
  );
};
