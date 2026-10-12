'use client';

import React, { useState } from 'react';
import { ChevronLeft, Plus, Trash2, Loader2, Copy, MessageSquare, Key, Clock, CheckCircle, X } from 'lucide-react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';

export default function MerchantLinePage() {
  const queryClient = useQueryClient();
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [configForm, setConfigForm] = useState({
    line_channel_id: '',
    line_channel_secret: '',
    line_access_token: '',
  });

  const { data: configData, isLoading } = useQuery({
    queryKey: ['line-webhook-config'],
    queryFn: () => api.getLINEWebhookConfig(),
  });

  const configMutation = useMutation({
    mutationFn: (data: { line_channel_id: string; line_channel_secret: string; line_access_token: string }) =>
      api.updateLINEWebhookConfig(data),
    onSuccess: () => {
      toast.success(isEditing ? 'LINE webhook updated successfully!' : 'LINE webhook configured successfully!');
      setIsConfiguring(false);
      setIsEditing(false);
      setConfigForm({ line_channel_id: '', line_channel_secret: '', line_access_token: '' });
      queryClient.invalidateQueries({ queryKey: ['line-webhook-config'] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to configure LINE webhook');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteLINEWebhookConfig(),
    onSuccess: () => {
      toast.success('LINE webhook configuration deleted');
      setIsDeleting(false);
      queryClient.invalidateQueries({ queryKey: ['line-webhook-config'] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete webhook config');
      setIsDeleting(false);
    },
  });

  const handleSaveConfig = () => {
    if (!configForm.line_channel_id || !configForm.line_channel_secret || !configForm.line_access_token) {
      toast.error('Please fill in all LINE credentials');
      return;
    }
    configMutation.mutate(configForm);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-800" />
      </div>
    );
  }

  const config = configData?.data?.config;
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
      className="space-y-5"
    >
      <label className="space-y-2">
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400">LINE Channel ID</span>
        <input
          type="text"
          value={configForm.line_channel_id}
          onChange={(event) => setConfigForm({ ...configForm, line_channel_id: event.target.value })}
          placeholder="Enter from LINE Developers"
          className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-500"
          required
        />
      </label>

      <label className="space-y-2">
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400">LINE Channel Secret</span>
        <input
          type="password"
          value={configForm.line_channel_secret}
          onChange={(event) => setConfigForm({ ...configForm, line_channel_secret: event.target.value })}
          placeholder="Enter from LINE Developers"
          className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-500"
          required
        />
        {isEditing && <span className="block text-xs text-zinc-400">Current secret will be replaced.</span>}
      </label>

      <label className="space-y-2">
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400">Channel Access Token</span>
        <input
          type="password"
          value={configForm.line_access_token}
          onChange={(event) => setConfigForm({ ...configForm, line_access_token: event.target.value })}
          placeholder="Enter from LINE Developers"
          className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-500"
          required
        />
        {isEditing && <span className="block text-xs text-zinc-400">Current token will be replaced.</span>}
      </label>

      <div className="flex flex-col gap-2 pt-2 sm:flex-row">
        <button
          type="submit"
          disabled={configMutation.isPending}
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-zinc-950 px-5 text-sm font-bold text-white transition-colors hover:bg-zinc-800 disabled:cursor-wait disabled:opacity-60"
        >
          {configMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isEditing ? 'Update Configuration' : 'Save Configuration'}
        </button>
        <button
          type="button"
          onClick={() => {
            setIsConfiguring(false);
            setIsEditing(false);
          }}
          className="h-11 rounded-md border border-zinc-200 bg-white px-5 text-sm font-bold text-zinc-700 transition-colors hover:border-zinc-900"
        >
          Cancel
        </button>
      </div>
    </form>
  );

  return (
    <div className="min-h-full px-6 py-6 md:px-8" style={{ background: 'var(--bg)' }}>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="border-b border-zinc-200 pb-5">
          <Link href="/dashboard/merchant" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900">
            <ChevronLeft className="h-4 w-4" />
            Back to Merchant
          </Link>
          <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">Messaging channel</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-zinc-950">LINE Integration</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-500">
            Connect your LINE Official Account so customers can send slips directly to your bot.
          </p>
        </div>

        {!hasSavedConfig ? (
          <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <div className="grid lg:grid-cols-[340px_1fr]">
              <aside className="border-b border-zinc-200 bg-emerald-50 p-6 lg:border-b-0 lg:border-r">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-white">
                  <MessageSquare className="h-6 w-6 text-emerald-700" />
                </div>
                <h2 className="mt-5 text-xl font-black text-zinc-950">Setup LINE Webhook</h2>
                <p className="mt-2 text-sm text-zinc-600">
                  Add your LINE credentials, then copy the generated webhook URL into LINE Developers.
                </p>
                {!isConfiguring && (
                  <button
                    type="button"
                    onClick={() => setIsConfiguring(true)}
                    className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-zinc-950 text-sm font-bold text-white transition-colors hover:bg-zinc-800"
                  >
                    <Plus className="h-4 w-4" />
                    Configure LINE Webhook
                  </button>
                )}
              </aside>
              <div className="p-6 md:p-8">
                {isConfiguring ? configFormView : (
                  <div className="flex min-h-64 items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-slate-50 p-8 text-center">
                    <div>
                      <p className="text-sm font-bold text-zinc-950">No LINE webhook configured yet</p>
                      <p className="mt-1 text-sm text-zinc-500">Start by adding your channel ID, secret, and access token.</p>
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
                { icon: CheckCircle, label: 'Status', value: config?.is_configured ? 'Active' : 'Saved, needs update', tone: config?.is_configured ? 'text-emerald-700' : 'text-amber-700' },
                { icon: Key, label: 'Reference ID', value: config?.webhook_reference_id || '-', tone: 'text-zinc-950' },
                { icon: Clock, label: 'Configured', value: config?.updated_at ? new Date(config.updated_at).toLocaleDateString('th-TH') : '-', tone: 'text-zinc-950' },
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
                    aria-label="Copy webhook URL"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-3 text-xs text-zinc-500">
                  Add this URL in LINE Developers Console, Messaging API, Webhook settings.
                </p>
              </div>
            </section>

            {isEditing ? (
              <section className="rounded-lg border border-zinc-200 bg-white p-6 md:p-8">
                <h2 className="mb-5 text-base font-black text-zinc-950">Edit LINE Configuration</h2>
                {configFormView}
              </section>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={handleEditClick}
                  className="inline-flex h-12 items-center justify-center rounded-md bg-blue-700 text-sm font-bold text-white transition-colors hover:bg-blue-800"
                >
                  Edit Configuration
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-rose-200 bg-white text-sm font-bold text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60"
                >
                  {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Delete
                </button>
              </div>
            )}
          </>
        )}

        <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-6">
          <h2 className="flex items-center gap-2 text-base font-black text-zinc-950">
            <MessageSquare className="h-4 w-4 text-emerald-700" />
            Setup Instructions
          </h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {[
              'Go to LINE Developers Console',
              'Select your Messaging API channel',
              'Open Messaging API, then Webhook settings',
              'Paste the webhook URL and enable Use webhook',
            ].map((step, index) => (
              <div key={step} className="flex gap-3 rounded-md bg-white/70 p-3 text-sm text-zinc-700">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-xs font-bold text-white">
                  {index + 1}
                </span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
