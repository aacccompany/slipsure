'use client';

import React, { useState } from 'react';
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  RefreshCw,
  Loader2,
  Calendar,
  CreditCard,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import type { Slip, SlipStatus } from '@/types/api';

export default function SlipsPage() {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<SlipStatus | 'all'>('all');
  const [page, setPage] = useState(1);

  const { data: slipsData, isLoading } = useQuery({
    queryKey: ['slips', statusFilter, page],
    queryFn: () => api.getSlips({
      status: statusFilter === 'all' ? undefined : statusFilter,
      page,
      limit: 20,
    }),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.uploadSlip(file),
    onSuccess: (response) => {
      toast.success('Slip uploaded successfully! Verification in progress...');
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ['slips'] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to upload slip');
    },
  });

  const reprocessMutation = useMutation({
    mutationFn: ({ slipId, forceVerify }: { slipId: string; forceVerify: boolean }) =>
      api.reprocessSlip(slipId, { force_verify: forceVerify }),
    onSuccess: () => {
      toast.success('Slip reprocessing initiated');
      queryClient.invalidateQueries({ queryKey: ['slips'] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to reprocess slip');
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      await uploadMutation.mutateAsync(selectedFile);
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusColor = (status: SlipStatus) => {
    switch (status) {
      case 'verified':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'failed':
        return 'text-rose-700 bg-rose-50 border-rose-200';
      case 'processing':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      default:
        return 'text-zinc-700 bg-zinc-50 border-zinc-200';
    }
  };

  const getStatusIcon = (status: SlipStatus) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="w-4 h-4" />;
      case 'failed':
        return <XCircle className="w-4 h-4" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const slips = slipsData?.data?.slips || [];
  const pagination = slipsData?.data?.pagination;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-[11px] text-zinc-400 uppercase tracking-widest mb-1">/ SLIP MANAGEMENT</p>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Payment Slips</h1>
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-8">
        <h3 className="text-sm font-bold text-zinc-900 mb-6 flex items-center gap-2">
          <Upload className="w-4 h-4" />
          Upload New Slip
        </h3>

        {!selectedFile ? (
          <div className="border-2 border-dashed border-zinc-200 rounded-xl p-12 text-center hover:border-blue-400 transition-colors">
            <input
              type="file"
              id="slip-upload"
              className="hidden"
              accept="image/*"
              onChange={handleFileSelect}
            />
            <label
              htmlFor="slip-upload"
              className="cursor-pointer flex flex-col items-center gap-4"
            >
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
                <Upload className="w-8 h-8 text-blue-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-900">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  PNG, JPG, JPEG up to 10MB
                </p>
              </div>
            </label>
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl">
            <div className="flex items-center gap-4">
              <FileText className="w-10 h-10 text-blue-700" />
              <div>
                <p className="text-sm font-medium text-zinc-900">{selectedFile.name}</p>
                <p className="text-xs text-zinc-500">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedFile(null)}
                className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="bg-blue-800 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-900 flex items-center gap-2 disabled:opacity-50"
              >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upload & Verify'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filter & List */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
        <div className="border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-900">Recent Slips</h3>
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as SlipStatus | 'all');
                setPage(1);
              }}
              className="px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-700/20"
            >
              <option value="all">All Status</option>
              <option value="verified">Verified</option>
              <option value="failed">Failed</option>
              <option value="processing">Processing</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 text-zinc-400 animate-spin mx-auto" />
            <p className="text-sm text-zinc-500 mt-4">Loading slips...</p>
          </div>
        ) : slips.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
            <p className="text-sm text-zinc-500">No slips found</p>
            <p className="text-xs text-zinc-400 mt-1">
              Upload your first slip to get started
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-zinc-100">
              {slips.map((slip) => (
                <div key={slip.id} className="p-6 hover:bg-zinc-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getStatusColor(slip.status)}`}>
                        {getStatusIcon(slip.status)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-900">
                          Slip #{slip.id.slice(0, 8)}...
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">
                          {new Date(slip.created_at).toLocaleString('th-TH', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </p>
                        {slip.transaction && (
                          <div className="flex items-center gap-4 mt-2 text-xs">
                            <span className="text-zinc-500">
                              <CreditCard className="w-3 h-3 inline mr-1" />
                              {parseFloat(slip.transaction.amount).toLocaleString()} THB
                            </span>
                            <span className="text-zinc-500">
                              Ref: {slip.transaction.reference_no}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(slip.status)}`}
                      >
                        {slip.status}
                      </span>
                      {slip.status === 'failed' && (
                        <button
                          onClick={() =>
                            reprocessMutation.mutate({ slipId: slip.id, forceVerify: true })
                          }
                          disabled={reprocessMutation.isPending}
                          className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
                          title="Reprocess"
                        >
                          <RefreshCw className="w-4 h-4 text-zinc-500" />
                        </button>
                      )}
                      <button
                        onClick={() => window.open(`/slips/${slip.id}`, '_blank')}
                        className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4 text-zinc-500" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="border-t border-zinc-200 px-6 py-4 flex items-center justify-between">
                <p className="text-xs text-zinc-500">
                  Showing {((page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(page * pagination.limit, pagination.total)} of {pagination.total} slips
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-sm border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-zinc-600">
                    Page {page} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                    disabled={page === pagination.totalPages}
                    className="px-3 py-1.5 text-sm border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
