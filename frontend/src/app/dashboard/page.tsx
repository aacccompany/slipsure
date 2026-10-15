'use client';

import React, { useState } from 'react';
import {
  ScanLine, CheckCircle2,
  Loader2, AlertCircle, ArrowUpRight, Users,
  BarChart3, RefreshCw, Calendar, Info, Search, Eye,
  X, Coins, CreditCard,
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { QuotaHero } from '@/components/dashboard/QuotaHero';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { RecentSlips } from '@/components/dashboard/RecentSlips';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import Link from 'next/link';
import { toast } from 'sonner';
import type { PaymentLog, TransactionStatus } from '@/types/api';

type AnalyticsPeriod = 'today' | '7d' | '30d' | 'month';
type OrderStatusFilter = 'all' | 'paid' | 'pending';
type TransactionFilterState = {
  status: '' | TransactionStatus;
  channel: '' | 'line';
  startDate: string;
  endDate: string;
  search: string;
};

const EMPTY_TRANSACTION_FILTERS: TransactionFilterState = {
  status: '',
  channel: '',
  startDate: '',
  endDate: '',
  search: '',
};

const periodOptions: { label: string; value: AnalyticsPeriod }[] = [
  { label: 'วันนี้', value: 'today' },
  { label: '7 วันที่แล้ว', value: '7d' },
  { label: '30 วันที่แล้ว', value: '30d' },
  { label: 'เดือนนี้', value: 'month' },
];

const orderStatusOptions: { label: string; value: OrderStatusFilter }[] = [
  { label: 'ทั้งหมด', value: 'all' },
  { label: 'ชำระแล้ว', value: 'paid' },
  { label: 'รอชำระ', value: 'pending' },
];

const transactionStatusOptions: { label: string; value: '' | TransactionStatus }[] = [
  { label: 'ทั้งหมด', value: '' },
  { label: 'สำเร็จ', value: 'success' },
  { label: 'ล้มเหลว', value: 'failed' },
  { label: 'รอดำเนินการ', value: 'pending' },
  { label: 'กำลังตรวจสอบ', value: 'processing' },
];

const transactionQueryParams = (filters: TransactionFilterState) => ({
  status: filters.status || undefined,
  start_date: filters.startDate || undefined,
  end_date: filters.endDate || undefined,
  search: filters.search.trim() || undefined,
});

export default function DashboardPage() {
  const [analyticsPeriod, setAnalyticsPeriod] = useState<AnalyticsPeriod>('7d');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatus, setOrderStatus] = useState<OrderStatusFilter>('all');
  const [selectedOrder, setSelectedOrder] = useState<PaymentLog | null>(null);
  const [transactionFilters, setTransactionFilters] = useState<TransactionFilterState>(EMPTY_TRANSACTION_FILTERS);
  const [appliedTransactionFilters, setAppliedTransactionFilters] = useState<TransactionFilterState>(EMPTY_TRANSACTION_FILTERS);
  const [chartTooltip, setChartTooltip] = useState<{
    left: number;
    top: number;
    date: string;
    verified: number;
    failed: number;
  } | null>(null);
  const [creditTooltip, setCreditTooltip] = useState<{
    left: number;
    top: number;
    date: string;
    credits: number;
  } | null>(null);
  const apiPeriod: '7d' | '30d' = analyticsPeriod === '30d' || analyticsPeriod === 'month' ? '30d' : '7d';

  const { data: quota, isLoading: quotaLoading } = useQuery({
    queryKey: ['quota'],
    queryFn: () => api.getQuota(),
  });

  const { data: slipStatsData, isLoading: statsLoading } = useQuery({
    queryKey: ['merchant-analytics-dashboard'],
    queryFn: () => api.getMerchantAnalyticsDashboard(),
  });

  const { data: usageData, refetch: refetchUsage, isLoading: usageLoading, isFetching: usageFetching } = useQuery({
    queryKey: ['merchant-analytics-usage', apiPeriod],
    queryFn: () => api.getMerchantAnalyticsUsage({ period: apiPeriod }),
  });

  const { data: paymentsData } = useQuery({
    queryKey: ['merchant-payments'],
    queryFn: () => api.getMerchantPayments({ limit: 100 }),
  });

  const {
    data: transactionData,
    refetch: refetchTransactions,
    isFetching: transactionsFetching,
  } = useQuery({
    queryKey: ['dashboard-transactions', appliedTransactionFilters],
    queryFn: () => api.getTransactions({ page: 1, limit: 5, ...transactionQueryParams(appliedTransactionFilters) }),
  });

  const { data: subscriptionData, isLoading: subLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => api.getSubscription(),
  });

  const stats = slipStatsData?.data;
  const successRate = Math.round(stats?.success_rate ?? 0);
  const rawDailyUsage = usageData?.data?.usage_per_day ?? [];
  const todayKey = new Date().toISOString().slice(0, 10);
  const dailyUsage = rawDailyUsage.filter((item) => {
    if (analyticsPeriod === 'today') return item.date === todayKey;
    if (analyticsPeriod === 'month') return item.date.startsWith(todayKey.slice(0, 7));
    return true;
  });
  const duplicateScans = usageData?.data?.failed_scan_reasons
    ?.find((item) => item.reason === 'DUPLICATE_SLIP')?.count ?? 0;
  const verifiedScans = stats?.verified_scans ?? 0;
  const failedScans = stats?.failed_scans ?? 0;

  const fallbackDays = analyticsPeriod === 'today' ? 1 : analyticsPeriod === '7d' ? 7 : 30;
  const chartData = dailyUsage.length > 0 ? dailyUsage : Array.from({ length: fallbackDays }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (fallbackDays - 1 - index));
    return {
      date: date.toISOString().slice(0, 10),
      count: 0,
      verified: 0,
      failed: 0,
    };
  });

  const chartWidth = 720;
  const chartHeight = 260;
  const chartPadding = { top: 22, right: 16, bottom: 34, left: 36 };
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right;
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  const maxLineValue = Math.max(1, ...chartData.flatMap((item) => [item.verified, item.failed]));
  const yMax = Math.max(4, Math.ceil(maxLineValue / 2) * 2);
  const yTicks = Array.from({ length: 5 }, (_, index) => Math.round((yMax / 4) * index));
  const getX = (index: number) => chartPadding.left + (chartData.length <= 1 ? plotWidth / 2 : (plotWidth / (chartData.length - 1)) * index);
  const getY = (value: number) => chartPadding.top + plotHeight - (value / yMax) * plotHeight;
  const toLinePoints = (key: 'verified' | 'failed') => chartData
    .map((item, index) => `${getX(index)},${getY(item[key])}`)
    .join(' ');
  const formatShortDate = (date: string) => new Date(date).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit' });
  const xLabelStep = chartData.length <= 10 ? 1 : Math.ceil((chartData.length - 1) / 6);
  const shouldShowXLabel = (index: number) => (
    index === 0 || index === chartData.length - 1 || index % xLabelStep === 0
  );
  const dateRangeLabel = chartData.length > 0
    ? `${formatShortDate(chartData[0].date)} ถึง ${formatShortDate(chartData[chartData.length - 1].date)}`
    : 'เลือกช่วงวันที่';
  const periodLabel = analyticsPeriod === 'today' ? '1d' : analyticsPeriod === 'month' ? 'month' : analyticsPeriod;
  const merchantPayments = paymentsData?.data?.items ?? [];
  const dashboardTransactions = transactionData?.data?.items ?? [];
  const transactionPagination = transactionData?.data?.pagination;
  const stripePayments = merchantPayments.filter((payment) => payment.gateway === 'stripe' && payment.status === 'success');
  const stripePaymentCount = stripePayments.length;
  const stripePaymentAmount = stripePayments.reduce((sum, payment) => sum + payment.amount, 0);
  const hasStripePayments = stripePaymentCount > 0;
  const filteredOrders = merchantPayments.filter((payment) => {
    const normalizedSearch = orderSearch.trim().toLowerCase();
    const matchesSearch = !normalizedSearch || [
      payment.id,
      payment.gateway_reference_id,
      payment.gateway,
      payment.status,
    ].some((value) => value?.toLowerCase().includes(normalizedSearch));
    const matchesStatus =
      orderStatus === 'all'
      || (orderStatus === 'paid' && payment.status === 'success')
      || (orderStatus === 'pending' && payment.status === 'pending');

    return matchesSearch && matchesStatus;
  });
  const orderStatusLabel = (status: string) => {
    if (status === 'success') return 'ชำระแล้ว';
    if (status === 'pending') return 'รอชำระ';
    if (status === 'failed') return 'ล้มเหลว';
    return status;
  };
  const orderStatusColor = (status: string) => {
    if (status === 'success') return { background: '#D1FAE5', color: '#059669' };
    if (status === 'pending') return { background: '#FEF3C7', color: '#B45309' };
    if (status === 'failed') return { background: '#FEE2E2', color: '#DC2626' };
    return { background: '#E5E7EB', color: '#475569' };
  };
  const orderNumber = (id: string, createdAt: string) => {
    const date = new Date(createdAt);
    const yearMonth = Number.isNaN(date.getTime())
      ? '000000'
      : `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    return `ORD-${yearMonth}-${id.slice(0, 5).toUpperCase()}`;
  };
  const applyTransactionFilters = () => {
    const nextFilters = { ...transactionFilters, search: transactionFilters.search.trim() };
    setAppliedTransactionFilters(nextFilters);
    if (JSON.stringify(nextFilters) === JSON.stringify(appliedTransactionFilters)) {
      void refetchTransactions();
    }
  };
  const updateTransactionFilters = (nextFilters: TransactionFilterState, applyNow = true) => {
    setTransactionFilters(nextFilters);
    if (applyNow) {
      setAppliedTransactionFilters({ ...nextFilters, search: nextFilters.search.trim() });
    }
  };
  const clearTransactionFilters = () => {
    setTransactionFilters(EMPTY_TRANSACTION_FILTERS);
    setAppliedTransactionFilters(EMPTY_TRANSACTION_FILTERS);
  };
  const transactionStatusColor = (status: TransactionStatus) => {
    if (status === 'success') return { background: '#D1FAE5', color: '#059669' };
    if (status === 'failed') return { background: '#FEE2E2', color: '#DC2626' };
    if (status === 'processing') return { background: '#DBEAFE', color: '#1D4ED8' };
    return { background: '#E5E7EB', color: '#475569' };
  };
  const transactionStatusLabel = (status: TransactionStatus) => {
    if (status === 'success') return 'สำเร็จ';
    if (status === 'failed') return 'ล้มเหลว';
    if (status === 'processing') return 'กำลังตรวจสอบ';
    return 'รอดำเนินการ';
  };
  const donutRadius = 78;
  const donutStroke = 38;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const donutDash = hasStripePayments ? donutCircumference : 0;
  const creditData = chartData.map((item) => ({
    date: item.date,
    credits: item.count || item.verified + item.failed,
  }));
  const totalCredits = creditData.reduce((sum, item) => sum + item.credits, 0);
  const creditWidth = 720;
  const creditHeight = 230;
  const creditPadding = { top: 24, right: 16, bottom: 34, left: 36 };
  const creditPlotWidth = creditWidth - creditPadding.left - creditPadding.right;
  const creditPlotHeight = creditHeight - creditPadding.top - creditPadding.bottom;
  const maxCreditValue = Math.max(1, ...creditData.map((item) => item.credits));
  const creditYMax = Math.max(4, Math.ceil(maxCreditValue / 2) * 2);
  const creditTicks = Array.from({ length: 5 }, (_, index) => Math.round((creditYMax / 4) * index));
  const creditBarWidth = Math.min(52, Math.max(8, (creditPlotWidth / Math.max(1, creditData.length)) * 0.72));
  const getCreditX = (index: number) => creditPadding.left + (creditData.length <= 1 ? creditPlotWidth / 2 : (creditPlotWidth / (creditData.length - 1)) * index);
  const getCreditY = (value: number) => creditPadding.top + creditPlotHeight - (value / creditYMax) * creditPlotHeight;

  const downloadReport = async () => {
    try {
      const blob = await api.exportMerchantAnalytics({ format: 'csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `merchant-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to download report');
    }
  };

  if (quotaLoading || statsLoading || usageLoading || subLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--blue)' }} />
      </div>
    );
  }

  // Day + month only for the hero card (the full date stays in the Account page).
  const resetDayMonth = quota?.data?.reset_date
    ? new Date(quota.data.reset_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long' })
    : '-';
  const hasTrendActivity = chartData.some((item) => item.verified > 0 || item.failed > 0);
  return (
    <div className="p-6 space-y-6" style={{ background: 'var(--bg)' }}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-extrabold tracking-tight" style={{ fontSize: '1.75rem', color: 'var(--navy)', letterSpacing: '-0.02em' }}>
            ภาพรวม
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
            สรุปการตรวจสอบสลิปและการใช้งานโควต้าของร้านคุณ
          </p>
        </div>
        <button
          onClick={downloadReport}
          className="flex shrink-0 items-center gap-2 text-sm font-semibold transition-all hover:opacity-80 px-4 py-2.5"
          style={{ background: 'var(--navy)', color: '#fff' }}
        >
          Download Report
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {quota?.data?.is_blocked && (
        <div className="flex items-center gap-3 px-4 py-3" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <p className="text-sm text-rose-700">
            โควต้าหมดแล้ว{' '}
            <Link href="/dashboard/subscription" className="underline font-medium">อัพเกรดแผน</Link>
            {' '}เพื่อใช้งานต่อ
          </p>
        </div>
      )}

      <QuotaHero
        limit={quota?.data?.quota_limit ?? 0}
        used={quota?.data?.used ?? 0}
        remaining={quota?.data?.remaining ?? 0}
        resetLabel={resetDayMonth}
        isBlocked={quota?.data?.is_blocked}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="สลิปที่ตรวจสอบแล้ว"
          value={(stats?.verified_scans ?? 0).toLocaleString()}
          change="ตลอดเวลา"
          isPositive={true}
          icon={ScanLine}
        />
        <StatCard
          title="อัตราความสำเร็จ"
          value={`${successRate}%`}
          change={`ผ่านการตรวจ ${stats?.verified_scans ?? 0} รายการ`}
          isPositive={verifiedScans + failedScans === 0 || successRate >= 80}
          icon={CheckCircle2}
        />
        <StatCard
          title="LINE Bot ที่เชื่อมต่อ"
          value={(stats?.bot_clients ?? 0).toLocaleString()}
          change={`ใหม่ ${stats?.new_bot_clients ?? 0} / ก่อนหน้า ${stats?.previous_bot_clients ?? 0}`}
          isPositive={true}
          icon={Users}
        />
      </div>

      <section className="space-y-4">
        <div className="rounded-lg bg-white p-6" style={{ border: '1px solid var(--border)' }}>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: 'var(--blue-pale)' }}>
                <BarChart3 className="h-5 w-5" style={{ color: 'var(--blue)' }} />
              </div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--navy)' }}>
                วิเคราะห์ข้อมูล
              </h2>
            </div>
            <button
              type="button"
              onClick={() => refetchUsage()}
              className="flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition-all hover:bg-slate-50 disabled:opacity-60"
              style={{ borderColor: 'var(--border)', color: 'var(--navy)' }}
              disabled={usageFetching}
            >
              <RefreshCw className={`h-4 w-4 ${usageFetching ? 'animate-spin' : ''}`} />
              รีเฟรช
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {periodOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setAnalyticsPeriod(option.value);
                  setChartTooltip(null);
                  setCreditTooltip(null);
                }}
                className="rounded-md border px-4 py-2 text-sm font-semibold transition-all hover:bg-slate-50"
                style={{
                  borderColor: analyticsPeriod === option.value ? '#9BC1E6' : 'var(--border)',
                  background: analyticsPeriod === option.value ? '#EAF4FF' : '#fff',
                  color: 'var(--navy)',
                }}
              >
                {option.label}
              </button>
            ))}
            <div
              className="flex min-w-0 flex-1 items-center gap-3 rounded-md border px-4 py-2 text-sm"
              style={{ borderColor: 'var(--border)', color: 'var(--navy)' }}
            >
              <Calendar className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
              <span className="truncate">{dateRangeLabel}</span>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <div className="rounded-lg bg-white p-6" style={{ border: '1px solid var(--border)' }}>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold" style={{ color: 'var(--navy)' }}>
                แนวโน้มการตรวจสอบ
              </p>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{periodLabel}</span>
            </div>

            {!hasTrendActivity ? (
              <EmptyState
                icon={ScanLine}
                title="ยังไม่มีสลิปที่ตรวจสอบ"
                description="เชื่อมต่อ LINE bot เพื่อเริ่มรับและตรวจสลิป ผลจะแสดงเป็นกราฟที่นี่"
                action={{ label: 'เชื่อมต่อ LINE', href: '/dashboard/merchant/line' }}
              />
            ) : (
            <div className="relative" onMouseLeave={() => setChartTooltip(null)}>
              <div className="mb-1 flex justify-center gap-4 text-sm">
                <span className="flex items-center gap-2" style={{ color: 'var(--navy)' }}>
                  <span className="h-4 w-4 rounded-full border-2" style={{ borderColor: '#10B981' }} />
                  สำเร็จ
                </span>
                <span className="flex items-center gap-2" style={{ color: 'var(--navy)' }}>
                  <span className="h-4 w-4 rounded-full border-2" style={{ borderColor: '#FF3B3F' }} />
                  ล้มเหลว
                </span>
              </div>

              {chartTooltip && (
                <div
                  className="pointer-events-none absolute z-20 min-w-36 -translate-x-1/2 -translate-y-full rounded-md border bg-white px-3 py-2 text-xs shadow-lg"
                  style={{
                    left: `${chartTooltip.left}%`,
                    top: `${chartTooltip.top}%`,
                    borderColor: 'var(--border)',
                    color: 'var(--navy)',
                  }}
                >
                  <p className="mb-1 font-semibold">{formatShortDate(chartTooltip.date)}</p>
                  <p className="text-emerald-600">สำเร็จ: {chartTooltip.verified.toLocaleString()} ครั้ง</p>
                  <p className="text-rose-500">ล้มเหลว: {chartTooltip.failed.toLocaleString()} ครั้ง</p>
                  <p className="mt-1 border-t pt-1" style={{ borderColor: 'var(--border)' }}>
                    รวม: {(chartTooltip.verified + chartTooltip.failed).toLocaleString()} ครั้ง
                  </p>
                </div>
              )}

              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-72 w-full overflow-visible" role="img" aria-label="Verification trend">
                {yTicks.map((tick) => {
                  const y = getY(tick);
                  return (
                    <g key={tick}>
                      <line
                        x1={chartPadding.left}
                        x2={chartWidth - chartPadding.right}
                        y1={y}
                        y2={y}
                        stroke="#E5E7EB"
                        strokeWidth="1"
                      />
                      <text x="14" y={y + 4} fontSize="11" fill="#64748B">{tick}</text>
                    </g>
                  );
                })}

                <polyline
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={toLinePoints('verified')}
                />
                <polyline
                  fill="none"
                  stroke="#FF3B3F"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={toLinePoints('failed')}
                />

                {chartData.map((item, index) => {
                  const left = (getX(index) / chartWidth) * 100;
                  const top = (Math.min(getY(item.verified), getY(item.failed)) / chartHeight) * 100;
                  const showTooltip = () => setChartTooltip({
                    left,
                    top,
                    date: item.date,
                    verified: item.verified,
                    failed: item.failed,
                  });

                  return (
                    <g key={`${item.date}-points`}>
                      <circle cx={getX(index)} cy={getY(item.verified)} r="4" fill="#fff" stroke="#10B981" strokeWidth="2" />
                      <circle cx={getX(index)} cy={getY(item.failed)} r="4" fill="#fff" stroke="#FF3B3F" strokeWidth="2" />
                      <circle
                        cx={getX(index)}
                        cy={getY(item.verified)}
                        r="13"
                        fill="transparent"
                        className="cursor-pointer"
                        onMouseEnter={showTooltip}
                        onFocus={showTooltip}
                      />
                      <circle
                        cx={getX(index)}
                        cy={getY(item.failed)}
                        r="13"
                        fill="transparent"
                        className="cursor-pointer"
                        onMouseEnter={showTooltip}
                        onFocus={showTooltip}
                      />
                      {shouldShowXLabel(index) && (
                        <text
                          x={getX(index)}
                          y={chartHeight - 10}
                          textAnchor="middle"
                          fontSize="11"
                          fill="#64748B"
                        >
                          {formatShortDate(item.date)}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
            )}
          </div>

          <div className="rounded-lg bg-white p-6" style={{ border: '1px solid var(--border)' }}>
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm font-semibold" style={{ color: 'var(--navy)' }}>
                วิธีการชำระเงิน
              </p>
              <Info className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
            </div>

            {!hasStripePayments ? (
              <EmptyState
                icon={CreditCard}
                title="ใช้แผน Free อยู่"
                description="ยังไม่มีการชำระเงินผ่าน Stripe อัพเกรดแผนเพื่อเพิ่มโควต้าสลิปต่อเดือน"
                action={{ label: 'ดูแผนทั้งหมด', href: '/dashboard/subscription' }}
              />
            ) : (
            <div className="flex min-h-72 flex-col items-center justify-center">
              <svg viewBox="0 0 220 220" className="h-56 w-56" role="img" aria-label="Payment method chart">
                <circle cx="110" cy="110" r={donutRadius} fill="none" stroke="#E5E7EB" strokeWidth={donutStroke} />
                <circle
                  cx="110"
                  cy="110"
                  r={donutRadius}
                  fill="none"
                  stroke="#5B8FF9"
                  strokeWidth={donutStroke}
                  strokeDasharray={`${donutDash} ${donutCircumference}`}
                  strokeLinecap="round"
                  transform="rotate(-90 110 110)"
                >
                  <title>
                    {hasStripePayments
                      ? `Stripe ${stripePaymentCount} payments, THB ${stripePaymentAmount.toLocaleString()}`
                      : 'No paid Stripe payments yet. Current account is on Free tier.'}
                  </title>
                </circle>
              </svg>
              <div className="mt-2 flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                <span className="h-3 w-3 rounded-full" style={{ background: hasStripePayments ? '#5B8FF9' : '#CBD5E1' }} />
                {hasStripePayments ? 'Stripe' : 'Free tier'}
                <span style={{ color: 'var(--navy)' }}>{stripePaymentCount.toLocaleString()}</span>
              </div>
              <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                {hasStripePayments
                  ? `THB ${stripePaymentAmount.toLocaleString()} collected`
                  : 'No paid Stripe payments yet'}
              </div>
            </div>
            )}
          </div>
        </div>

        <div className="rounded-lg bg-white p-6" style={{ border: '1px solid var(--border)' }}>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold" style={{ color: 'var(--navy)' }}>
              วิเคราะห์ค่าใช้จ่าย
            </p>
            <p className="text-sm font-semibold" style={{ color: 'var(--navy)' }}>
              รวมทั้งสิ้น <span className="mx-1 font-bold">{totalCredits.toLocaleString()}</span> เครดิต
            </p>
          </div>

          {totalCredits === 0 ? (
            <EmptyState
              compact
              icon={Coins}
              title="ยังไม่มีการใช้เครดิต"
              description="เมื่อมีการตรวจสลิป เครดิตที่ใช้ในแต่ละวันจะแสดงที่นี่"
            />
          ) : (
          <div className="relative" onMouseLeave={() => setCreditTooltip(null)}>
            {creditTooltip && (
              <div
                className="pointer-events-none absolute z-20 min-w-32 -translate-x-1/2 -translate-y-full rounded-md px-3 py-2 text-xs text-white shadow-lg"
                style={{
                  left: `${creditTooltip.left}%`,
                  top: `${creditTooltip.top}%`,
                  background: 'var(--navy)',
                }}
              >
                <p className="mb-1 font-bold">{formatShortDate(creditTooltip.date)}</p>
                <p className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-sm" style={{ background: '#4B8BFF' }} />
                  เครดิตที่ใช้: {creditTooltip.credits.toLocaleString()}
                </p>
              </div>
            )}

            <svg viewBox={`0 0 ${creditWidth} ${creditHeight}`} className="h-64 w-full overflow-visible" role="img" aria-label="Credit usage chart">
              {creditTicks.map((tick) => {
                const y = getCreditY(tick);
                return (
                  <g key={tick}>
                    <line
                      x1={creditPadding.left}
                      x2={creditWidth - creditPadding.right}
                      y1={y}
                      y2={y}
                      stroke="#E5E7EB"
                      strokeWidth="1"
                    />
                    <text x="14" y={y + 4} fontSize="11" fill="#64748B">{tick}</text>
                  </g>
                );
              })}

              {creditData.map((item, index) => {
                const x = getCreditX(index);
                const y = getCreditY(item.credits);
                const height = creditPadding.top + creditPlotHeight - y;
                const left = (x / creditWidth) * 100;
                const top = (Math.max(creditPadding.top, y - 8) / creditHeight) * 100;
                const showTooltip = () => setCreditTooltip({
                  left,
                  top,
                  date: item.date,
                  credits: item.credits,
                });

                return (
                  <g key={`${item.date}-credits`}>
                    <rect
                      x={x - creditBarWidth / 2}
                      y={y}
                      width={creditBarWidth}
                      height={Math.max(0, height)}
                      fill="#3B82F6"
                      opacity={item.credits > 0 ? 0.95 : 0}
                      className="cursor-pointer"
                      onMouseEnter={showTooltip}
                      onFocus={showTooltip}
                    />
                    <rect
                      x={x - Math.max(creditBarWidth, 18) / 2}
                      y={creditPadding.top}
                      width={Math.max(creditBarWidth, 18)}
                      height={creditPlotHeight}
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={showTooltip}
                      onFocus={showTooltip}
                    />
                    {shouldShowXLabel(index) && (
                      <text
                        x={x}
                        y={creditHeight - 10}
                        textAnchor="middle"
                        fontSize="11"
                        fill="#64748B"
                      >
                        {formatShortDate(item.date)}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
          )}
        </div>

        <div className="rounded-lg bg-white p-6" style={{ border: '1px solid var(--border)' }}>
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--navy)' }}>
                ตัวกรองประวัติ
              </p>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                กรองจากสถานะ วันที่ และคำค้นหา เพื่อค้นหารายการสลิปที่ต้องการ
              </p>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-xs font-semibold" style={{ color: 'var(--navy)' }}>
                รวม {transactionPagination?.total.toLocaleString() ?? 0} รายการ
              </p>
              <Link
                href="/dashboard/slips"
                className="inline-flex items-center gap-1 text-xs font-bold"
                style={{ color: 'var(--blue)' }}
              >
                ดูทั้งหมด
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <form
            className="mb-5"
            onSubmit={(event) => {
              event.preventDefault();
              applyTransactionFilters();
            }}
          >
            <div className="grid gap-3 lg:grid-cols-4">
              <label className="space-y-1 text-xs font-bold" style={{ color: 'var(--navy)' }}>
                สถานะ
                <select
                  value={transactionFilters.status}
                  onChange={(event) => updateTransactionFilters({ ...transactionFilters, status: event.target.value as TransactionFilterState['status'] })}
                  className="h-10 w-full rounded-md border bg-white px-3 text-sm font-medium outline-none transition-all focus:border-blue-300"
                  style={{ borderColor: 'var(--border)', color: 'var(--navy)' }}
                >
                  {transactionStatusOptions.map((option) => (
                    <option key={option.value || 'all'} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 text-xs font-bold" style={{ color: 'var(--navy)' }}>
                ช่องทาง
                <select
                  value={transactionFilters.channel}
                  onChange={(event) => updateTransactionFilters({ ...transactionFilters, channel: event.target.value as TransactionFilterState['channel'] })}
                  className="h-10 w-full rounded-md border bg-white px-3 text-sm font-medium outline-none transition-all focus:border-blue-300"
                  style={{ borderColor: 'var(--border)', color: 'var(--navy)' }}
                >
                  <option value="">ทั้งหมด</option>
                  <option value="line">LINE bot</option>
                </select>
              </label>

              <label className="space-y-1 text-xs font-bold" style={{ color: 'var(--navy)' }}>
                วันที่เริ่ม
                <input
                  type="date"
                  value={transactionFilters.startDate}
                  onChange={(event) => updateTransactionFilters({ ...transactionFilters, startDate: event.target.value })}
                  className="h-10 w-full rounded-md border bg-white px-3 text-sm font-medium outline-none transition-all focus:border-blue-300"
                  style={{ borderColor: 'var(--border)', color: 'var(--navy)' }}
                />
              </label>

              <label className="space-y-1 text-xs font-bold" style={{ color: 'var(--navy)' }}>
                วันที่สิ้นสุด
                <input
                  type="date"
                  value={transactionFilters.endDate}
                  onChange={(event) => updateTransactionFilters({ ...transactionFilters, endDate: event.target.value })}
                  className="h-10 w-full rounded-md border bg-white px-3 text-sm font-medium outline-none transition-all focus:border-blue-300"
                  style={{ borderColor: 'var(--border)', color: 'var(--navy)' }}
                />
              </label>
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(260px,1fr)_auto] lg:items-end">
              <label className="max-w-md space-y-1 text-xs font-bold" style={{ color: 'var(--navy)' }}>
                คำค้นหา (UUID / ผู้รับ / ธนาคาร)
                <span className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                  <input
                    value={transactionFilters.search}
                    onChange={(event) => updateTransactionFilters({ ...transactionFilters, search: event.target.value }, false)}
                    placeholder="เช่น 1234-uuid หรือ ชื่อร้าน"
                    className="h-10 w-full rounded-md border bg-white pl-10 pr-3 text-sm outline-none transition-all placeholder:text-zinc-400 focus:border-blue-300"
                    style={{ borderColor: 'var(--border)', color: 'var(--navy)' }}
                  />
                </span>
              </label>

              <div className="flex flex-wrap gap-2 lg:justify-end">
                <button
                  type="button"
                  onClick={clearTransactionFilters}
                  className="h-10 rounded-md border bg-white px-4 text-sm font-bold transition-all hover:bg-slate-50"
                  style={{ borderColor: 'var(--border)', color: 'var(--navy)' }}
                >
                  ล้างตัวกรอง
                </button>
                <button
                  type="submit"
                  className="inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-bold text-white transition-all hover:opacity-90"
                  style={{ background: 'var(--blue)' }}
                >
                  <RefreshCw className={`h-4 w-4 ${transactionsFetching ? 'animate-spin' : ''}`} />
                  รีเฟรชข้อมูล
                </button>
              </div>
            </div>
          </form>

          <div className="overflow-hidden rounded-lg border" style={{ borderColor: 'var(--border)' }}>
            <div className="hidden grid-cols-[0.8fr_0.8fr_1.6fr_0.7fr_0.8fr_0.8fr] gap-4 px-5 py-3 text-xs font-semibold md:grid"
              style={{ background: '#EEF6FF', color: 'var(--text-muted)' }}>
              <span>สถานะ</span>
              <span>ยอดเงิน</span>
              <span>ต้นทาง → ปลายทาง</span>
              <span>เครดิต</span>
              <span>วันที่</span>
              <span className="text-right">ดำเนินการ</span>
            </div>

            {transactionsFetching && dashboardTransactions.length === 0 ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--blue)' }} />
              </div>
            ) : dashboardTransactions.length > 0 ? dashboardTransactions.map((transaction) => {
              const transactionDate = transaction.transfer_at || transaction.created_at;
              const sender = transaction.sender_name || transaction.sender_account || '-';
              const receiver = transaction.receiver_name || transaction.receiver_account || '-';
              return (
                <div
                  key={transaction.id}
                  className="grid gap-3 border-t px-5 py-4 text-sm md:grid-cols-[0.8fr_0.8fr_1.6fr_0.7fr_0.8fr_0.8fr] md:items-center"
                  style={{ borderColor: 'var(--border)', color: 'var(--navy)' }}
                >
                  <span>
                    <span className="rounded-full px-3 py-1 text-xs font-bold" style={transactionStatusColor(transaction.status)}>
                      {transactionStatusLabel(transaction.status)}
                    </span>
                  </span>
                  <span className="font-bold">฿{transaction.amount.toLocaleString()}</span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">
                      {sender} <span style={{ color: 'var(--text-muted)' }}>→</span> {receiver}
                    </span>
                    <span className="block truncate font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {transaction.reference_no || transaction.id}
                    </span>
                  </span>
                  <span className="font-bold">{transaction.provider_charged_credits ?? 1}</span>
                  <span className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {new Date(transactionDate).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="flex justify-end">
                    <Link
                      href="/dashboard/slips"
                      className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-bold transition-all hover:bg-slate-50"
                      style={{ borderColor: 'var(--border)', color: 'var(--navy)' }}
                    >
                      <Eye className="h-4 w-4" />
                      ดูรายละเอียด
                    </Link>
                  </span>
                </div>
              );
            }) : (
              <div className="border-t px-6 py-8 text-center text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                ยังไม่มีประวัติสลิปที่ตรงกับตัวกรอง
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg bg-white p-6" style={{ border: '1px solid var(--border)' }}>
          <div className="mb-4 flex items-center gap-3">
            <p className="text-sm font-bold" style={{ color: 'var(--navy)' }}>
              คำสั่งซื้อล่าสุด
            </p>
            <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
            <Link
              href="/dashboard/orders"
              className="flex items-center gap-1 text-sm font-semibold transition-opacity hover:opacity-70"
              style={{ color: 'var(--navy)' }}
            >
              ดูทั้งหมด
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mb-4 flex flex-col gap-3 lg:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input
                value={orderSearch}
                onChange={(event) => setOrderSearch(event.target.value)}
                placeholder="ค้นหาเลขที่คำสั่งซื้อ..."
                className="h-10 w-full rounded-md border bg-white pl-9 pr-3 text-sm outline-none transition-all focus:border-blue-300"
                style={{ borderColor: 'var(--border)', color: 'var(--navy)' }}
              />
            </div>
            <div className="flex gap-2">
              {orderStatusOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setOrderStatus(option.value)}
                  className="rounded-md border px-4 py-2 text-sm font-semibold transition-all hover:bg-slate-50"
                  style={{
                    borderColor: orderStatus === option.value ? 'var(--navy)' : 'var(--border)',
                    background: orderStatus === option.value ? 'var(--navy)' : '#fff',
                    color: orderStatus === option.value ? '#fff' : 'var(--navy)',
                  }}
                >
                  {option.label}{option.value === 'all' ? ` (${merchantPayments.length})` : ''}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border" style={{ borderColor: 'var(--border)' }}>
            <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_1fr_0.8fr] gap-4 px-6 py-3 text-xs font-semibold"
              style={{ background: '#EEF6FF', color: 'var(--text-muted)' }}>
              <span>เลขที่คำสั่งซื้อ</span>
              <span>ยอดรวม</span>
              <span>วิธีชำระ</span>
              <span>สถานะ</span>
              <span>วันที่</span>
              <span className="text-right">จัดการ</span>
            </div>

            {filteredOrders.length > 0 ? filteredOrders.map((payment) => {
              const paidOrCreatedAt = payment.paid_at || payment.created_at;
              const paidDate = new Date(paidOrCreatedAt);
              return (
                <div
                  key={payment.id}
                  className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_1fr_0.8fr] items-center gap-4 border-t px-6 py-5 text-sm"
                  style={{ borderColor: 'var(--border)', color: 'var(--navy)' }}
                >
                  <span className="font-mono font-semibold">{orderNumber(payment.id, payment.created_at)}</span>
                  <span className="font-bold">
                    {payment.currency.toUpperCase()} {payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="font-medium capitalize">{payment.gateway}</span>
                  <span>
                    <span className="rounded-full px-3 py-1 text-xs font-bold" style={orderStatusColor(payment.status)}>
                      {orderStatusLabel(payment.status)}
                    </span>
                  </span>
                  <span>
                    {Number.isNaN(paidDate.getTime())
                      ? '-'
                      : paidDate.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(payment)}
                      title={payment.gateway_reference_id || payment.id}
                      className="flex items-center gap-2 font-semibold"
                      style={{ color: 'var(--navy)' }}
                    >
                      <Eye className="h-4 w-4" />
                      ดูรายละเอียด
                    </button>
                  </span>
                </div>
              );
            }) : (
              <div className="border-t px-6 py-8 text-center text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                ยังไม่มีประวัติการชำระเงิน
              </div>
            )}
          </div>
        </div>
      </section>

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
                ['ยอดรวม', `${selectedOrder.currency.toUpperCase()} ${selectedOrder.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
                ['วิธีชำระ', selectedOrder.gateway],
                ['สถานะ', orderStatusLabel(selectedOrder.status)],
                ['เลขอ้างอิง Stripe', selectedOrder.gateway_reference_id || '-'],
                ['Payment ID', selectedOrder.id],
                ['Merchant ID', selectedOrder.merchant_id],
                ['Merchant', selectedOrder.merchant_name || '-'],
                ['Subscription ID', selectedOrder.subscription_id || '-'],
                ['สร้างเมื่อ', new Date(selectedOrder.created_at).toLocaleString('th-TH')],
                ['ชำระเมื่อ', selectedOrder.paid_at ? new Date(selectedOrder.paid_at).toLocaleString('th-TH') : '-'],
              ].map(([label, value]) => (
                <div key={label} className="grid gap-2 rounded-md bg-slate-50 px-4 py-3 text-sm md:grid-cols-[160px_1fr]">
                  <span className="font-bold" style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <span className="break-all font-semibold" style={{ color: 'var(--navy)' }}>{value}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 border-t px-6 py-4" style={{ borderColor: 'var(--border)' }}>
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
