'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Eye, Loader2, RefreshCw, Search, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { PaymentLog } from '@/types/api';

type OrderStatusFilter = 'all' | 'paid' | 'pending' | 'failed';

const statusOptions: { label: string; value: OrderStatusFilter }[] = [
  { label: 'ทั้งหมด', value: 'all' },
  { label: 'ชำระแล้ว', value: 'paid' },
  { label: 'รอชำระ', value: 'pending' },
  { label: 'ล้มเหลว', value: 'failed' },
];

function orderStatusLabel(status: string) {
  if (status === 'success') return 'ชำระแล้ว';
  if (status === 'pending') return 'รอชำระ';
  if (status === 'failed') return 'ล้มเหลว';
  return status;
}

function orderStatusColor(status: string) {
  if (status === 'success') return { background: '#D1FAE5', color: '#059669' };
  if (status === 'pending') return { background: '#FEF3C7', color: '#B45309' };
  if (status === 'failed') return { background: '#FEE2E2', color: '#DC2626' };
  return { background: '#E5E7EB', color: '#475569' };
}

function orderNumber(id: string, createdAt: string) {
  const date = new Date(createdAt);
  const yearMonth = Number.isNaN(date.getTime())
    ? '000000'
    : `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  return `ORD-${yearMonth}-${id.slice(0, 5).toUpperCase()}`;
}

function formatMoney(payment: PaymentLog) {
  return `${payment.currency.toUpperCase()} ${payment.amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('th-TH', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function OrdersPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<OrderStatusFilter>('all');
  const [selectedOrder, setSelectedOrder] = useState<PaymentLog | null>(null);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['merchant-payments-all'],
    queryFn: () => api.getMerchantPayments({ limit: 500 }),
  });

  const payments = data?.data?.items ?? [];
  const filteredOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return payments.filter((payment) => {
      const matchesSearch = !normalizedSearch || [
        payment.id,
        payment.gateway_reference_id,
        payment.gateway,
        payment.status,
        payment.merchant_name,
        orderNumber(payment.id, payment.created_at),
      ].some((value) => value?.toLowerCase().includes(normalizedSearch));
      const matchesStatus =
        status === 'all'
        || (status === 'paid' && payment.status === 'success')
        || (status === 'pending' && payment.status === 'pending')
        || (status === 'failed' && payment.status === 'failed');

      return matchesSearch && matchesStatus;
    });
  }, [payments, search, status]);

  return (
    <div className="min-h-full px-6 py-6 md:px-8" style={{ background: 'var(--bg)' }}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 border-b border-zinc-200 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/dashboard"
              className="mb-4 inline-flex items-center gap-2 text-sm font-semibold transition-opacity hover:opacity-70"
              style={{ color: 'var(--text-muted)' }}
            >
              <ArrowLeft className="h-4 w-4" />
              กลับแดชบอร์ด
            </Link>
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">/ Recent Orders</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-zinc-950">รายการชำระเงินทั้งหมด</h1>
            <p className="mt-2 text-sm text-zinc-500">ดูประวัติการจ่ายเงินผ่าน Stripe และรายละเอียดของแต่ละรายการ</p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border bg-white px-4 text-sm font-bold transition-colors hover:bg-slate-50"
            style={{ borderColor: 'var(--border)', color: 'var(--navy)' }}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            รีเฟรช
          </button>
        </div>

        <section className="rounded-lg bg-white p-6" style={{ border: '1px solid var(--border)' }}>
          <div className="mb-5 flex flex-col gap-3 lg:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ค้นหาเลขที่คำสั่งซื้อ, Stripe ref, สถานะ..."
                className="h-11 w-full rounded-md border bg-white pl-9 pr-3 text-sm outline-none transition-all focus:border-blue-300"
                style={{ borderColor: 'var(--border)', color: 'var(--navy)' }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStatus(option.value)}
                  className="rounded-md border px-4 py-2 text-sm font-semibold transition-all hover:bg-slate-50"
                  style={{
                    borderColor: status === option.value ? 'var(--navy)' : 'var(--border)',
                    background: status === option.value ? 'var(--navy)' : '#fff',
                    color: status === option.value ? '#fff' : 'var(--navy)',
                  }}
                >
                  {option.label}{option.value === 'all' ? ` (${payments.length})` : ''}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold" style={{ color: 'var(--navy)' }}>
              รวม {filteredOrders.length.toLocaleString()} รายการ
            </p>
          </div>

          <div className="overflow-hidden rounded-lg border" style={{ borderColor: 'var(--border)' }}>
            <div
              className="hidden grid-cols-[1.25fr_0.8fr_0.8fr_0.8fr_1fr_0.75fr] gap-4 px-6 py-3 text-xs font-semibold md:grid"
              style={{ background: '#EEF6FF', color: 'var(--text-muted)' }}
            >
              <span>เลขที่คำสั่งซื้อ</span>
              <span>ยอดรวม</span>
              <span>วิธีชำระ</span>
              <span>สถานะ</span>
              <span>วันที่</span>
              <span className="text-right">จัดการ</span>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--blue)' }} />
              </div>
            ) : filteredOrders.length > 0 ? filteredOrders.map((payment) => {
              const paidOrCreatedAt = payment.paid_at || payment.created_at;
              return (
                <div
                  key={payment.id}
                  className="grid gap-3 border-t px-6 py-5 text-sm md:grid-cols-[1.25fr_0.8fr_0.8fr_0.8fr_1fr_0.75fr] md:items-center"
                  style={{ borderColor: 'var(--border)', color: 'var(--navy)' }}
                >
                  <span className="font-mono font-semibold">{orderNumber(payment.id, payment.created_at)}</span>
                  <span className="font-bold">{formatMoney(payment)}</span>
                  <span className="font-medium capitalize">{payment.gateway}</span>
                  <span>
                    <span className="rounded-full px-3 py-1 text-xs font-bold" style={orderStatusColor(payment.status)}>
                      {orderStatusLabel(payment.status)}
                    </span>
                  </span>
                  <span>{formatDate(paidOrCreatedAt)}</span>
                  <span className="flex justify-start md:justify-end">
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(payment)}
                      className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-bold transition-colors hover:bg-slate-50"
                      style={{ borderColor: 'var(--border)', color: 'var(--navy)' }}
                    >
                      <Eye className="h-4 w-4" />
                      ดูรายละเอียด
                    </button>
                  </span>
                </div>
              );
            }) : (
              <div className="border-t px-6 py-10 text-center text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                ยังไม่มีรายการชำระเงินที่ตรงกับตัวกรอง
              </div>
            )}
          </div>
        </section>
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
          <div className="w-full max-w-xl overflow-hidden rounded-lg bg-white shadow-2xl" style={{ border: '1px solid var(--border)' }}>
            <div className="flex items-start justify-between border-b px-6 py-5" style={{ borderColor: 'var(--border)' }}>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  Order Detail
                </p>
                <h2 className="mt-1 text-xl font-black" style={{ color: 'var(--navy)' }}>
                  {orderNumber(selectedOrder.id, selectedOrder.created_at)}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="rounded-md p-2 transition-colors hover:bg-slate-100"
                aria-label="Close order detail"
                style={{ color: 'var(--text-muted)' }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 px-6 py-5">
              {[
                ['ยอดรวม', formatMoney(selectedOrder)],
                ['วิธีชำระ', selectedOrder.gateway],
                ['สถานะ', orderStatusLabel(selectedOrder.status)],
                ['เลขอ้างอิง Stripe', selectedOrder.gateway_reference_id || '-'],
                ['Payment ID', selectedOrder.id],
                ['Merchant ID', selectedOrder.merchant_id],
                ['Merchant', selectedOrder.merchant_name || '-'],
                ['Subscription ID', selectedOrder.subscription_id || '-'],
                ['สร้างเมื่อ', formatDate(selectedOrder.created_at)],
                ['ชำระเมื่อ', formatDate(selectedOrder.paid_at)],
              ].map(([label, value]) => (
                <div key={label} className="grid gap-2 rounded-md bg-slate-50 px-4 py-3 text-sm md:grid-cols-[160px_1fr]">
                  <span className="font-bold" style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <span className="break-all font-semibold" style={{ color: 'var(--navy)' }}>{value}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end border-t px-6 py-4" style={{ borderColor: 'var(--border)' }}>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="rounded-md border bg-white px-4 py-2 text-sm font-bold transition-colors hover:bg-slate-50"
                style={{ borderColor: 'var(--border)', color: 'var(--navy)' }}
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

