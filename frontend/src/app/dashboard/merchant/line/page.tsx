'use client';

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, Plus, Trash2, Loader2, Copy, MessageSquare, Key, Clock, CheckCircle, X, ExternalLink, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { lineOnboardingCompleteKey, lineOnboardingStepKey } from '@/lib/line-onboarding';

const steps = ['มี LINE OA', 'เปิด Messaging API', 'ใส่ข้อมูล Channel', 'ตั้งค่า Webhook'];
const managerURL = 'https://manager.line.biz/';
const developersURL = 'https://developers.line.biz/console/';

function MerchantLineContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedOnboarding = searchParams.get('onboarding') === '1';
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const isOnboarding = requestedOnboarding && !onboardingDismissed;
  const closeOnboarding = useCallback(() => {
    setOnboardingDismissed(true);
    window.history.replaceState(window.history.state, '', '/dashboard/merchant/line');
    router.replace('/dashboard/merchant/line');
  }, [router]);
  const queryClient = useQueryClient();
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [step, setStep] = useState(1);
  const [showIllustration, setShowIllustration] = useState(false);
  const [formError, setFormError] = useState('');
  const [savedWebhookURL, setSavedWebhookURL] = useState('');
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [configForm, setConfigForm] = useState({
    line_channel_id: '',
    line_channel_secret: '',
    line_access_token: '',
  });

  const { data: configData, isLoading, isError, refetch } = useQuery({
    queryKey: ['line-webhook-config'],
    queryFn: () => api.getLINEWebhookConfig(),
    retry: false,
  });

  const { data: subscriptionData } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => api.getSubscription(),
  });

  const freeCreditsAvailable = subscriptionData?.data?.free_plan_used === false
    && subscriptionData?.data?.subscription?.plan_id === 'plan-free';

  const config = configData?.data?.config;
  const stepKey = config?.merchant_id ? lineOnboardingStepKey(config.merchant_id) : '';

  useEffect(() => {
    if (!requestedOnboarding) setOnboardingDismissed(false);
  }, [requestedOnboarding]);

  useEffect(() => {
    if (!isOnboarding || isLoading || isError) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeOnboarding();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled])'));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOnboarding, isLoading, isError, closeOnboarding]);

  useEffect(() => {
    if (!isOnboarding || !stepKey) return;
    const savedStep = Number(window.localStorage.getItem(stepKey));
    if (savedStep >= 1 && savedStep <= 4 && (savedStep !== 4 || config?.is_configured)) setStep(savedStep);
    else setStep(1);
  }, [isOnboarding, stepKey, config?.is_configured]);

  const goToStep = (nextStep: number) => {
    setStep(nextStep);
    setFormError('');
    if (stepKey) window.localStorage.setItem(stepKey, String(nextStep));
  };

  const configMutation = useMutation({
    mutationFn: (data: { line_channel_id: string; line_channel_secret: string; line_access_token: string }) =>
      api.updateLINEWebhookConfig(data),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteLINEWebhookConfig(),
    onSuccess: () => {
      toast.success('ลบการตั้งค่า LINE Webhook แล้ว');
      setIsDeleting(false);
      queryClient.invalidateQueries({ queryKey: ['line-webhook-config'] });
      if (config?.merchant_id) {
        window.localStorage.removeItem(lineOnboardingCompleteKey(config.merchant_id));
        window.localStorage.removeItem(lineOnboardingStepKey(config.merchant_id));
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'ลบการตั้งค่า LINE Webhook ไม่สำเร็จ');
      setIsDeleting(false);
    },
  });

  const claimMutation = useMutation({ mutationFn: () => api.claimLINEFreeCredits() });

  const handleFinish = async () => {
    try {
      const result = await claimMutation.mutateAsync();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['subscription'] }),
        queryClient.invalidateQueries({ queryKey: ['quota'] }),
        queryClient.invalidateQueries({ queryKey: ['merchant-analytics-dashboard'] }),
      ]);
      toast.success(result.data?.granted ? 'ตั้งค่า LINE สำเร็จ รับเครดิตฟรี 20 สลิปแล้ว' : 'เชื่อมต่อ LINE เรียบร้อย');
    } catch {
      toast.error('ยังรับเครดิตฟรีไม่ได้ กรุณาตรวจสอบการตั้งค่า LINE แล้วลองอีกครั้ง');
      return;
    }
    if (stepKey) window.localStorage.removeItem(stepKey);
    if (config?.merchant_id) window.localStorage.setItem(lineOnboardingCompleteKey(config.merchant_id), 'true');
    closeOnboarding();
  };

  const handleSaveConfig = async () => {
    const data = {
      line_channel_id: configForm.line_channel_id.trim(),
      line_channel_secret: configForm.line_channel_secret.trim(),
      line_access_token: configForm.line_access_token.trim(),
    };
    if (!data.line_channel_id || !data.line_channel_secret || !data.line_access_token) {
      setFormError('กรุณากรอกข้อมูลทั้ง 3 ช่องให้ครบ');
      return;
    }
    if (!/^\d+$/.test(data.line_channel_id)) {
      setFormError('Channel ID ต้องเป็นตัวเลขเท่านั้น');
      return;
    }
    setFormError('');
    try {
      const response = await configMutation.mutateAsync(data);
      setConfigForm({ line_channel_id: '', line_channel_secret: '', line_access_token: '' });
      await queryClient.invalidateQueries({ queryKey: ['line-webhook-config'] });
      if (isOnboarding) {
        let webhookURL = response.data?.config?.webhook_url || '';
        if (!webhookURL) {
          const urlResponse = await api.getWebhookURL();
          webhookURL = urlResponse.data?.webhook_url || '';
        }
        setSavedWebhookURL(webhookURL);
        setCopied(false);
        goToStep(4);
      } else {
        toast.success(isEditing ? 'อัปเดต LINE Webhook แล้ว' : 'ตั้งค่า LINE Webhook แล้ว');
        setIsConfiguring(false);
        setIsEditing(false);
      }
    } catch (error) {
      const message = error instanceof Error && /invalid LINE access token/i.test(error.message)
        ? 'Channel access token ไม่ถูกต้อง กรุณาตรวจสอบข้อมูลแล้วลองอีกครั้ง'
        : 'บันทึกการตั้งค่าไม่สำเร็จ กรุณาตรวจสอบข้อมูลแล้วลองอีกครั้ง';
      setFormError(message);
      if (!isOnboarding) toast.error(message);
    }
  };

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success('คัดลอกแล้ว');
    } catch {
      toast.error('คัดลอกไม่สำเร็จ กรุณาเลือกและคัดลอก URL ด้วยตนเอง');
    }
  };

  if (isLoading) {
    return <PageSkeleton />;
  }

  const hasSavedConfig = Boolean(config?.is_configured || config?.line_channel_id || config?.webhook_url || config?.webhook_reference_id);

  const handleEditClick = () => {
    if (config && hasSavedConfig) {
      setConfigForm({
        line_channel_id: config.line_channel_id || '',
        line_channel_secret: '',
        line_access_token: '',
      });
    }
    setIsEditing(true);
  };

  const configFormView = (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        handleSaveConfig();
      }}
      noValidate
      className="space-y-5"
    >
      <label className="space-y-2">
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400">LINE Channel ID</span>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          name="line_channel_id"
          value={configForm.line_channel_id}
          onChange={(event) => setConfigForm({ ...configForm, line_channel_id: event.target.value })}
          placeholder="กรอกข้อมูลจาก LINE Developers"
          className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-500"
        />
        <span className="block text-xs text-zinc-500">หาได้ที่: LINE Developers → เลือก Channel → แท็บ Basic settings</span>
      </label>

      <label className="space-y-2">
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400">LINE Channel Secret</span>
        <input
          type="password"
          value={configForm.line_channel_secret}
          onChange={(event) => setConfigForm({ ...configForm, line_channel_secret: event.target.value })}
          placeholder="กรอกข้อมูลจาก LINE Developers"
          className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-500"
        />
        <span className="block text-xs text-zinc-500">หาได้ที่: แท็บ Basic settings</span>
        {isEditing && <span className="block text-xs text-zinc-400">Secret เดิมจะถูกแทนที่</span>}
      </label>

      <label className="space-y-2">
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400">Channel Access Token</span>
        <input
          type="password"
          value={configForm.line_access_token}
          onChange={(event) => setConfigForm({ ...configForm, line_access_token: event.target.value })}
          placeholder="กรอกข้อมูลจาก LINE Developers"
          className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-500"
        />
        <span className="block text-xs text-zinc-500">หาได้ที่: แท็บ Messaging API → Channel access token (long-lived) → กด Issue</span>
        {isEditing && <span className="block text-xs text-zinc-400">Token เดิมจะถูกแทนที่</span>}
      </label>

      {formError && <p role="alert" className="text-sm font-medium text-rose-600">{formError}</p>}

      {isOnboarding && (
        <a href={developersURL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline">
          เปิด LINE Developers Console <ExternalLink className="h-4 w-4" />
        </a>
      )}

      <div className="flex flex-col gap-2 pt-2 sm:flex-row">
        <button
          type="submit"
          disabled={configMutation.isPending}
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-zinc-950 px-5 text-sm font-bold text-white transition-colors hover:bg-zinc-800 disabled:cursor-wait disabled:opacity-60"
        >
          {configMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isOnboarding ? 'บันทึกและถัดไป' : isEditing ? 'อัปเดตการตั้งค่า' : 'บันทึกการตั้งค่า'}
        </button>
        {!isOnboarding && <button
          type="button"
          onClick={() => {
            setIsConfiguring(false);
            setIsEditing(false);
          }}
          className="h-11 rounded-md border border-zinc-200 bg-white px-5 text-sm font-bold text-zinc-700 transition-colors hover:border-zinc-900"
        >
          ยกเลิก
        </button>}
      </div>
    </form>
  );

  return (
    <div className="min-h-full px-6 py-6 md:px-8" style={{ background: 'var(--bg)' }}>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="border-b border-zinc-200 pb-5">
          <Link href="/dashboard/merchant" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900">
            <ChevronLeft className="h-4 w-4" />
            กลับไปร้านค้า
          </Link>
          <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">ช่องทางข้อความ</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-zinc-950">{isOnboarding ? 'ตั้งค่า LINE OA' : 'เชื่อมต่อ LINE'}</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-500">
            เชื่อมต่อ LINE Official Account เพื่อให้ลูกค้าส่งสลิปให้บอตของร้านค้าได้
          </p>
        </div>

        {freeCreditsAvailable && (
          <div className="flex flex-col gap-3 border border-emerald-200 bg-emerald-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-emerald-900">ตั้งค่า LINE OA ให้เสร็จ รับเครดิตฟรี 20 สลิปสำหรับทดลองใช้งาน</p>
            {!isOnboarding && <Link href="/dashboard/merchant/line?onboarding=1" className="inline-flex h-10 shrink-0 items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800">ตั้งค่าเพื่อรับสิทธิ์</Link>}
          </div>
        )}

        {isError ? (
          <section className="rounded-lg border border-rose-200 bg-white p-6">
            <p className="text-sm text-rose-700">โหลดข้อมูล LINE ไม่สำเร็จ กรุณาลองอีกครั้ง</p>
            <button type="button" onClick={() => refetch()} className="mt-4 h-10 rounded-md bg-blue-700 px-4 text-sm font-bold text-white">ลองอีกครั้ง</button>
          </section>
        ) : isOnboarding ? (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/55 p-3 sm:p-6">
          <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="line-onboarding-title" tabIndex={-1} className="max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-lg bg-white p-4 shadow-2xl outline-none sm:max-h-[calc(100dvh-3rem)] sm:p-6">
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-blue-700">ขั้นตอนที่ {step} จาก 4</p>
                <h2 id="line-onboarding-title" className="mt-1 text-lg font-black text-zinc-950">{steps[step - 1]}</h2>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link href="/dashboard" className="text-xs font-semibold text-zinc-500 hover:text-zinc-950 sm:text-sm">ข้ามไปก่อน</Link>
                <button type="button" onClick={closeOnboarding} aria-label="ปิดขั้นตอนตั้งค่า" className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"><X className="h-4 w-4" /></button>
              </div>
            </div>

            <ol className="mb-8 grid grid-cols-4 gap-1 sm:gap-2" aria-label="ขั้นตอนการตั้งค่า LINE">
              {steps.map((label, index) => {
                const number = index + 1;
                const completed = number < step;
                return <li key={label} className="min-w-0">
                  <button
                    type="button"
                    onClick={() => completed && goToStep(number)}
                    disabled={!completed}
                    aria-current={number === step ? 'step' : undefined}
                    className={`flex w-full min-w-0 flex-col items-center gap-2 border-t-2 pt-3 text-center text-[11px] leading-tight sm:text-xs ${number === step ? 'border-blue-700 font-bold text-blue-800' : completed ? 'border-emerald-600 font-semibold text-emerald-700' : 'border-zinc-200 text-zinc-400'} ${completed ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs ${number === step ? 'bg-blue-700 text-white' : completed ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>{completed ? '✓' : number}</span>
                    <span className="min-w-0 break-words">{label}</span>
                  </button>
                </li>;
              })}
            </ol>

            {step === 1 && <div className="space-y-5">
              {freeCreditsAvailable && <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">ตั้งค่า LINE OA ให้เสร็จเพื่อรับเครดิตฟรี 20 สลิป</p>}
              <p className="text-sm leading-6 text-zinc-700">FlowSlip ตรวจสลิปผ่าน LINE OA ของร้านคุณ ต้องมี LINE Official Account ก่อน</p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button type="button" onClick={() => goToStep(2)} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-blue-700 px-6 text-sm font-bold text-white hover:bg-blue-800">มีแล้ว <ChevronRight className="h-4 w-4" /></button>
                <a href={managerURL} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-zinc-200 px-4 text-sm font-semibold text-zinc-700 hover:border-blue-400">ยังไม่มี – สร้างบัญชี <ExternalLink className="h-4 w-4" /></a>
              </div>
              <p className="text-xs text-zinc-500">สร้างเสร็จแล้วกลับมากด &apos;มีแล้ว&apos;</p>
            </div>}

            {step === 2 && <div className="space-y-5">
              <p className="text-sm leading-6 text-zinc-700">ใน LINE OA Manager ไปที่ ตั้งค่า → Messaging API → กด &apos;เปิดใช้ Messaging API&apos; แล้วเลือกหรือสร้าง Provider</p>
              <a href={managerURL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline">เปิด LINE OA Manager <ExternalLink className="h-4 w-4" /></a>
              <div>
                <button type="button" onClick={() => setShowIllustration((visible) => !visible)} aria-expanded={showIllustration} className="text-xs font-semibold text-zinc-600 underline">{showIllustration ? 'ซ่อนภาพประกอบ' : 'ดูภาพประกอบ'}</button>
                {showIllustration && <div className="mt-3 flex min-h-32 items-center justify-center rounded-md border border-dashed border-zinc-300 bg-slate-50 p-4 text-center text-sm text-zinc-500">ภาพประกอบขั้นตอนเปิด Messaging API จะเพิ่มในภายหลัง</div>}
              </div>
              <button type="button" onClick={() => goToStep(3)} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-blue-700 px-6 text-sm font-bold text-white hover:bg-blue-800">ถัดไป <ChevronRight className="h-4 w-4" /></button>
            </div>}

            {step === 3 && <div className="space-y-5">
              <p className="text-sm text-zinc-700">นำข้อมูลจาก Messaging API Channel ของร้านมาใส่ด้านล่าง</p>
              {configFormView}
              {config?.is_configured && <button type="button" onClick={() => goToStep(4)} className="text-sm font-semibold text-blue-700 underline">ใช้การตั้งค่าปัจจุบัน</button>}
            </div>}

            {step === 4 && <div className="space-y-6">
              {freeCreditsAvailable && <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">เมื่อตั้งค่า Webhook เสร็จ กด “เสร็จสิ้น” เพื่อรับเครดิตฟรี 20 สลิป</p>}
              <p className="text-sm text-zinc-700">คัดลอก Webhook URL ของร้านไปตั้งค่าใน LINE Developers</p>
              <div className="flex min-w-0 flex-col gap-3 rounded-md border border-zinc-200 bg-slate-50 p-3 sm:flex-row sm:items-center">
                <code className="min-w-0 flex-1 break-all text-xs text-blue-800 sm:text-sm">{savedWebhookURL || config?.webhook_url || 'กำลังโหลด Webhook URL'}</code>
                <button type="button" disabled={!savedWebhookURL && !config?.webhook_url} onClick={() => copyToClipboard(savedWebhookURL || config?.webhook_url || '')} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800 disabled:opacity-50"><Copy className="h-4 w-4" />{copied ? 'คัดลอกแล้ว' : 'คัดลอก'}</button>
              </div>
              <ol className="space-y-2 text-sm leading-6 text-zinc-700">
                <li>1) วาง URL นี้ใน LINE Developers → แท็บ Messaging API → Webhook settings</li>
                <li>2) เปิด &apos;Use webhook&apos;</li>
                <li>3) กด Verify</li>
              </ol>
              <a href={developersURL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline">เปิด LINE Developers Console <ExternalLink className="h-4 w-4" /></a>
              <div>
                <button type="button" disabled={claimMutation.isPending || !savedWebhookURL && !config?.webhook_url} onClick={handleFinish} className="inline-flex h-11 items-center justify-center rounded-md bg-blue-700 px-6 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50">{claimMutation.isPending ? 'กำลังบันทึก...' : 'เสร็จสิ้น'}</button>
              </div>
            </div>}
          </section>
          </div>
        ) : !hasSavedConfig ? (
          <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <div className="grid lg:grid-cols-[340px_1fr]">
              <aside className="border-b border-zinc-200 bg-emerald-50 p-6 lg:border-b-0 lg:border-r">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-white">
                  <MessageSquare className="h-6 w-6 text-emerald-700" />
                </div>
                <h2 className="mt-5 text-xl font-black text-zinc-950">ตั้งค่า LINE Webhook</h2>
                <p className="mt-2 text-sm text-zinc-600">
                  กรอกข้อมูล LINE แล้วนำ Webhook URL ที่ได้รับไปตั้งค่าใน LINE Developers
                </p>
                {!isConfiguring && (
                  <button
                    type="button"
                    onClick={() => setIsConfiguring(true)}
                    className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-zinc-950 text-sm font-bold text-white transition-colors hover:bg-zinc-800"
                  >
                    <Plus className="h-4 w-4" />
                    ตั้งค่า LINE Webhook
                  </button>
                )}
              </aside>
              <div className="p-6 md:p-8">
                {isConfiguring ? configFormView : (
                  <div className="flex min-h-64 items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-slate-50 p-8 text-center">
                    <div>
                      <p className="text-sm font-bold text-zinc-950">ยังไม่ได้ตั้งค่า LINE Webhook</p>
                      <p className="mt-1 text-sm text-zinc-500">เริ่มด้วยการกรอก Channel ID, Secret และ Access Token</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-3">
              {[
                { icon: CheckCircle, label: 'สถานะ', value: config?.is_configured ? 'ใช้งานอยู่' : 'บันทึกแล้ว รออัปเดต', tone: config?.is_configured ? 'text-emerald-700' : 'text-amber-700' },
                { icon: Key, label: 'รหัสอ้างอิง', value: config?.webhook_reference_id || '-', tone: 'text-zinc-950' },
                { icon: Clock, label: 'ตั้งค่าเมื่อ', value: config?.updated_at ? new Date(config.updated_at).toLocaleDateString('th-TH') : '-', tone: 'text-zinc-950' },
              ].map(({ icon: Icon, label, value, tone }) => (
                <div key={label} className="rounded-lg border border-zinc-200 bg-white p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400">{label}</p>
                    <Icon className="h-4 w-4 text-zinc-400" />
                  </div>
                  <p className={`text-lg font-black ${tone}`}>{value}</p>
                </div>
              ))}
            </section>

            <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
              <div className="border-b border-zinc-200 px-6 py-4">
                <h2 className="flex items-center gap-2 text-base font-black text-zinc-950">
                  <Key className="h-4 w-4 text-blue-700" />
                  Webhook URL
                </h2>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-3 rounded-md border border-zinc-200 bg-slate-50 p-3">
                  <code className="min-w-0 flex-1 truncate text-sm font-semibold text-blue-800">{config?.webhook_url}</code>
                  <button
                    type="button"
                    onClick={() => config?.webhook_url && copyToClipboard(config.webhook_url)}
                    className="rounded-md border border-zinc-200 bg-white p-2 text-zinc-500 transition-colors hover:text-zinc-950"
                    aria-label="คัดลอก Webhook URL"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-3 text-xs text-zinc-500">
                  นำ URL นี้ไปใส่ใน LINE Developers Console ที่ Messaging API และ Webhook settings
                </p>
              </div>
            </section>

            {isEditing ? (
              <section className="rounded-lg border border-zinc-200 bg-white p-6 md:p-8">
                <h2 className="mb-5 text-base font-black text-zinc-950">แก้ไขการตั้งค่า LINE</h2>
                {configFormView}
              </section>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={handleEditClick}
                  className="inline-flex h-12 items-center justify-center rounded-md bg-blue-700 text-sm font-bold text-white transition-colors hover:bg-blue-800"
                >
                  แก้ไขการตั้งค่า
                </button>
                <button
                  type="button"
                  onClick={() => setIsDeleting(true)}
                  disabled={deleteMutation.isPending}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-rose-200 bg-white text-sm font-bold text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60"
                >
                  {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  ลบ
                </button>
              </div>
            )}
          </>
        )}

        {!isOnboarding && isDeleting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-zinc-950">ลบการตั้งค่า LINE?</h3>
                  <p className="mt-2 text-sm text-zinc-600">
                    Webhook URL จะหยุดทำงานจนกว่าจะตั้งค่า LINE ใหม่
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDeleting(false)}
                  className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100"
                  aria-label="ปิดหน้าต่างยืนยันการลบ"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-6 space-y-2">
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-rose-600 text-sm font-bold text-white transition-colors hover:bg-rose-700 disabled:cursor-wait disabled:opacity-60"
                >
                  {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  ยืนยันการลบ
                </button>
                <button
                  type="button"
                  onClick={() => setIsDeleting(false)}
                  disabled={deleteMutation.isPending}
                  className="h-11 w-full rounded-md border border-zinc-200 bg-white text-sm font-bold text-zinc-700 transition-colors hover:border-zinc-900"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        )}

        {!isOnboarding && <Link href="/dashboard/merchant/line?onboarding=1" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:underline">ดูขั้นตอนตั้งค่าอีกครั้ง <ChevronRight className="h-4 w-4" /></Link>}
      </div>
    </div>
  );
}

export default function MerchantLinePage() {
  return <Suspense fallback={<PageSkeleton />}><MerchantLineContent /></Suspense>;
}
