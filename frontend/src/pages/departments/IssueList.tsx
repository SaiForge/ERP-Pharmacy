import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, CheckCheck, XCircle, Eye, GitPullRequest, Trash2 } from 'lucide-react';
import { departmentIssuesApi, departmentsApi } from '../../api/departments';
import { medicinesApi } from '../../api/medicines';
import { Table, Column } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import { Topbar } from '../../components/ui/Topbar';
import { DepartmentIssue, IssueStatus } from '../../types';

export const IssueList: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<IssueStatus | ''>('');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewDetailsIssue, setViewDetailsIssue] = useState<DepartmentIssue | null>(null);

  // Requisition Form State
  const [deptId, setDeptId] = useState<number>(0);
  const [requestedBy, setRequestedBy] = useState<string>('');
  const [reqItems, setReqItems] = useState<{ medicine_id: number; quantity_requested: number }[]>([
    { medicine_id: 0, quantity_requested: 10 },
  ]);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['department-issues', page, search, statusFilter],
    queryFn: () =>
      departmentIssuesApi.list({
        page,
        page_size: 15,
        search: search || undefined,
        status_filter: (statusFilter as IssueStatus) || undefined,
      }),
  });

  const { data: departments } = useQuery({
    queryKey: ['departments-select'],
    queryFn: () => departmentsApi.list({ page: 1, page_size: 100 }),
  });

  const { data: medicines } = useQuery({
    queryKey: ['medicines-for-issue'],
    queryFn: () => medicinesApi.list({ page: 1, page_size: 100, is_active: true }),
  });

  const createRequisitionMutation = useMutation({
    mutationFn: departmentIssuesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department-issues'] });
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setIsCreateModalOpen(false);
      setRequestedBy('');
      setReqItems([{ medicine_id: 0, quantity_requested: 10 }]);
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to submit requisition');
    },
  });

  const issueStockMutation = useMutation({
    mutationFn: (issueId: number) => departmentIssuesApi.issue(issueId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department-issues'] });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setViewDetailsIssue(null);
    },
  });

  const rejectIssueMutation = useMutation({
    mutationFn: (issueId: number) => departmentIssuesApi.reject(issueId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department-issues'] });
      setViewDetailsIssue(null);
    },
  });

  const handleAddReqItem = () => {
    setReqItems((prev) => [...prev, { medicine_id: 0, quantity_requested: 10 }]);
  };

  const handleRemoveReqItem = (idx: number) => {
    if (reqItems.length > 1) {
      setReqItems((prev) => prev.filter((_, i) => i !== idx));
    }
  };

  const handleUpdateReqItem = (idx: number, field: string, val: any) => {
    setReqItems((prev) => {
      const next = [...prev];
      (next[idx] as any)[field] = val;
      return next;
    });
  };

  const handleSubmitRequisition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptId || !requestedBy.trim()) {
      setFormError('Please select a department and state the requester name.');
      return;
    }
    const invalid = reqItems.some((i) => !i.medicine_id || i.quantity_requested <= 0);
    if (invalid) {
      setFormError('Please choose valid medicines and quantities for all lines.');
      return;
    }

    createRequisitionMutation.mutate({
      department_id: deptId,
      requested_by: requestedBy.trim(),
      items: reqItems.map((i) => ({
        medicine_id: Number(i.medicine_id),
        quantity_requested: Number(i.quantity_requested),
      })),
    });
  };

  const getStatusBadge = (status: IssueStatus) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="warning" size="sm">Pending Approval</Badge>;
      case 'APPROVED':
        return <Badge variant="accent" size="sm">Approved</Badge>;
      case 'ISSUED':
        return <Badge variant="success" size="sm">Issued (FEFO Deducted)</Badge>;
      case 'REJECTED':
        return <Badge variant="danger" size="sm">Rejected</Badge>;
    }
  };

  const columns: Column<DepartmentIssue>[] = [
    {
      key: 'issue_number',
      header: 'Requisition # & Date',
      render: (i) => (
        <div>
          <span className="font-mono font-bold text-text-primary block">{i.issue_number}</span>
          <span className="text-[11px] text-text-secondary">
            {new Date(i.issue_date).toLocaleDateString()} {new Date(i.issue_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      ),
    },
    {
      key: 'department_name',
      header: 'Department / Ward',
      render: (i) => (
        <div>
          <span className="font-semibold text-text-primary block">{i.department_name}</span>
          <span className="text-xs text-text-secondary">Req by: {i.requested_by}</span>
        </div>
      ),
    },
    {
      key: 'items_count',
      header: 'Requested Items',
      render: (i) => (
        <span className="text-xs text-text-secondary">
          {i.items.length} drug line(s)
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Approval Status',
      render: (i) => getStatusBadge(i.status),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (i) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setViewDetailsIssue(i)}
            className="py-1 px-2 text-xs border border-border"
          >
            <Eye className="w-3.5 h-3.5 mr-1" /> View / Inspect
          </Button>

          {i.status === 'PENDING' && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => issueStockMutation.mutate(i.id)}
              isLoading={issueStockMutation.isPending}
              className="py-1 px-2 text-xs"
            >
              <CheckCheck className="w-3.5 h-3.5 mr-1" /> Issue Stock (FEFO)
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Topbar
        title="Hospital Department Requisitions & Stock Issues"
        subtitle="Manage ward drug requisitions, pharmacy approvals, and automated FEFO batch deductions"
        actions={
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              if (departments?.items?.length) setDeptId(departments.items[0].id);
              setIsCreateModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1" /> Create Requisition
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-white border border-border rounded-md p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search Requisition # or staff name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        <div className="flex items-center gap-1.5">
          {(['', 'PENDING', 'ISSUED', 'REJECTED'] as (IssueStatus | '')[]).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors select-none ${
                statusFilter === st
                  ? 'bg-accent-soft text-accent border-accent font-semibold'
                  : 'bg-white text-text-secondary border-border hover:bg-surface'
              }`}
            >
              {st === '' ? 'All Statuses' : st}
            </button>
          ))}
        </div>
      </div>

      <Table
        columns={columns}
        data={data?.items || []}
        keyExtractor={(i) => i.id}
        isLoading={isLoading}
        emptyMessage="No department requisitions found."
      />

      {data && (
        <Pagination
          currentPage={data.page}
          totalPages={data.total_pages}
          totalItems={data.total}
          pageSize={data.page_size}
          onPageChange={(p) => setPage(p)}
        />
      )}

      {/* Create Requisition Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="New Department Requisition"
        subtitle="Submit drug indent request from ward or clinical department"
        maxWidth="lg"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmitRequisition}
              isLoading={createRequisitionMutation.isPending}
            >
              Submit Requisition
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmitRequisition} className="space-y-4">
          {formError && (
            <div className="p-3 bg-danger-soft border border-danger/30 rounded text-danger text-xs">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Requesting Department"
              required
              options={(departments?.items || []).map((d) => ({
                value: d.id,
                label: `${d.name} (${d.location})`,
              }))}
              value={deptId}
              onChange={(e) => setDeptId(Number(e.target.value))}
            />

            <Input
              label="Requested By (Nurse / Doctor Name)"
              required
              placeholder="e.g. Sister Priya"
              value={requestedBy}
              onChange={(e) => setRequestedBy(e.target.value)}
            />
          </div>

          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-primary uppercase tracking-wider">
                Requested Medicines
              </span>
              <Button type="button" size="sm" variant="secondary" onClick={handleAddReqItem}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Medicine
              </Button>
            </div>

            <div className="space-y-2">
              {reqItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2.5 bg-surface border border-border rounded">
                  <div className="flex-1">
                    <Select
                      options={(medicines?.items || []).map((m) => ({
                        value: m.id,
                        label: `${m.name} [Avail: ${m.total_stock || 0}]`,
                      }))}
                      value={item.medicine_id}
                      onChange={(e) => handleUpdateReqItem(idx, 'medicine_id', Number(e.target.value))}
                      placeholder="Select drug..."
                    />
                  </div>
                  <div className="w-28">
                    <Input
                      type="number"
                      min={1}
                      placeholder="Qty"
                      value={item.quantity_requested}
                      onChange={(e) => handleUpdateReqItem(idx, 'quantity_requested', Number(e.target.value))}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveReqItem(idx)}
                    disabled={reqItems.length === 1}
                    className="p-1 text-text-secondary hover:text-danger disabled:opacity-30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </form>
      </Modal>

      {/* Inspect Issue Details Modal */}
      <Modal
        isOpen={!!viewDetailsIssue}
        onClose={() => setViewDetailsIssue(null)}
        title={viewDetailsIssue ? `Requisition ${viewDetailsIssue.issue_number}` : ''}
        subtitle={viewDetailsIssue ? `Department: ${viewDetailsIssue.department_name}` : ''}
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button variant="ghost" size="sm" onClick={() => setViewDetailsIssue(null)}>
              Close
            </Button>
            {viewDetailsIssue?.status === 'PENDING' && (
              <div className="flex items-center gap-2">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => viewDetailsIssue && rejectIssueMutation.mutate(viewDetailsIssue.id)}
                  isLoading={rejectIssueMutation.isPending}
                >
                  <XCircle className="w-4 h-4 mr-1" /> Reject Request
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => viewDetailsIssue && issueStockMutation.mutate(viewDetailsIssue.id)}
                  isLoading={issueStockMutation.isPending}
                >
                  <CheckCheck className="w-4 h-4 mr-1" /> Approve & Issue Stock (FEFO)
                </Button>
              </div>
            )}
          </div>
        }
      >
        {viewDetailsIssue && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-surface border border-border rounded text-xs">
              <div>
                <span className="text-text-secondary block">Date</span>
                <span className="font-semibold text-text-primary">
                  {new Date(viewDetailsIssue.issue_date).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-text-secondary block">Requester</span>
                <span className="font-semibold text-text-primary">{viewDetailsIssue.requested_by}</span>
              </div>
              <div>
                <span className="text-text-secondary block">Status</span>
                <span className="mt-0.5 inline-block">{getStatusBadge(viewDetailsIssue.status)}</span>
              </div>
              <div>
                <span className="text-text-secondary block">Approver</span>
                <span className="text-text-primary">{viewDetailsIssue.approved_by_name || 'Pending'}</span>
              </div>
            </div>

            <div className="border border-border rounded overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-alt border-b border-border text-text-secondary font-semibold">
                  <tr>
                    <th className="p-2.5">Medicine</th>
                    <th className="p-2.5 text-right">Requested</th>
                    <th className="p-2.5 text-right">Issued</th>
                    <th className="p-2.5">Allocated Batch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {viewDetailsIssue.items.map((item) => (
                    <tr key={item.id}>
                      <td className="p-2.5 font-semibold text-text-primary">{item.medicine_name}</td>
                      <td className="p-2.5 text-right font-mono">{item.quantity_requested}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-accent">
                        {item.quantity_issued}
                      </td>
                      <td className="p-2.5 font-mono text-xs">
                        {item.batch_number ? (
                          <Badge variant="accent" size="sm">{item.batch_number}</Badge>
                        ) : (
                          <span className="text-slate-400">FEFO on approval</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
