'use client';

import React, { useState } from 'react';
import { ChevronLeft, Plus, Trash2, Loader2, Copy, MessageSquare, Key, Clock, CheckCircle, X } from 'lucide-react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';

const inputClass = 'w-full px-4 py-3 text-sm transition-all focus:outline-none';
const inputStyle = { border: '1px solid var(--border)', color: 'var(--navy)', background: '#fff' };

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

  // Fetch LINE webhook config
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
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--blue)' }} />
      </div>
    );
  }

  const config = configData?.data?.config;
  const hasSavedConfig = Boolean(
    config?.is_configured ||
    config?.line_channel_id ||
    config?.webhook_url ||
    config?.webhook_reference_id
  );

  // Handle edit button click - populate form with existing config
  const handleEditClick = () => {
    if (config && hasSavedConfig) {
      setConfigForm({
        line_channel_id: config.line_channel_id || '',
        line_channel_secret: '', // Don't pre-fill secret for security
        line_access_token: '', // Don't pre-fill token for security
      });
    }
    setIsEditing(true);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-4xl" style={{ background: 'var(--bg)' }}>
      <div>
        <Link
          href="/dashboard/merchant"
          className="inline-flex items-center gap-2 text-sm font-medium transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Merchant
        </Link>
      </div>

      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
          / Merchant / LINE Integration
        </p>
        <h1 className="font-bold tracking-tight" style={{ fontSize: '1.4rem', color: 'var(--navy)', letterSpacing: '-0.02em' }}>
          LINE Integration
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>ตั้งค่าการเชื่อมต่อ LINE Official Account ของคุณ</p>
      </div>

      {!hasSavedConfig ? (
        <div className="bg-white p-8" style={{ border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-11 h-11 flex items-center justify-center" style={{ background: '#DCFCE7' }}>
              <MessageSquare className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-bold text-base" style={{ color: 'var(--navy)' }}>Setup LINE Webhook</h3>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Connect your LINE Official Account to enable slip verification via LINE.
              </p>
            </div>
          </div>

          {isConfiguring ? (
            <form onSubmit={(e) => { e.preventDefault(); handleSaveConfig(); }} className="space-y-5">
              <div>
                <label className="block font-mono text-[9px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  LINE Channel ID
                </label>
                <input
                  type="text"
                  value={configForm.line_channel_id}
                  onChange={(e) => setConfigForm({ ...configForm, line_channel_id: e.target.value })}
                  placeholder="Enter from LINE Developers"
                  className={inputClass}
                  style={inputStyle}
                  required
                />
              </div>

              <div>
                <label className="block font-mono text-[9px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  LINE Channel Secret
                </label>
                <input
                  type="password"
                  value={configForm.line_channel_secret}
                  onChange={(e) => setConfigForm({ ...configForm, line_channel_secret: e.target.value })}
                  placeholder="Enter from LINE Developers"
                  className={inputClass}
                  style={inputStyle}
                  required
                />
              </div>

              <div>
                <label className="block font-mono text-[9px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  LINE Access Token (Channel Access Token)
                </label>
                <input
                  type="password"
                  value={configForm.line_access_token}
                  onChange={(e) => setConfigForm({ ...configForm, line_access_token: e.target.value })}
                  placeholder="Enter from LINE Developers"
                  className={inputClass}
                  style={inputStyle}
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={configMutation.isPending}
                  className="flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60"
                  style={{ background: 'var(--navy)', color: '#fff' }}
                >
                  {configMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Configuration'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfiguring(false)}
                  className="px-6 py-3 text-sm font-semibold transition-all hover:opacity-90"
                  style={{ border: '1px solid var(--border)', color: 'var(--navy)' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsConfiguring(true)}
              className="w-full py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
              style={{ border: '1px dashed var(--border-strong)', color: 'var(--text-muted)' }}
            >
              <Plus className="w-5 h-5" />
              Configure LINE Webhook
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Status Overview */}
          <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x bg-white" style={{ border: '1px solid var(--border)', borderColor: 'var(--border)' }}>
            <div className="p-6 flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center" style={{ background: '#DCFCE7' }}>
                <CheckCircle className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Status</p>
                <p className="text-sm font-bold" style={{ color: config?.is_configured ? '#047857' : '#B45309' }}>
                  {config?.is_configured ? 'Active' : 'Saved, needs update'}
                </p>
              </div>
            </div>

            <div className="p-6 flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center" style={{ background: 'var(--blue-pale)' }}>
                <Key className="w-5 h-5" style={{ color: 'var(--blue)' }} />
              </div>
              <div>
                <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Reference ID</p>
                <p className="text-sm font-bold font-mono" style={{ color: 'var(--navy)' }}>{config?.webhook_reference_id || '-'}</p>
              </div>
            </div>

            <div className="p-6 flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center" style={{ background: '#F3E8FF' }}>
                <Clock className="w-5 h-5 text-purple-700" />
              </div>
              <div>
                <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Configured</p>
                <p className="text-sm font-bold" style={{ color: 'var(--navy)' }}>
                  {config?.updated_at ? new Date(config.updated_at).toLocaleDateString('th-TH') : '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Webhook URL */}
          <section className="bg-white p-8" style={{ border: '1px solid var(--border)' }}>
            <p className="font-mono text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
              <Key className="w-3.5 h-3.5" /> Your Webhook URL
            </p>
            <div className="flex items-center gap-4 p-4" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
              <code className="flex-1 text-sm font-mono truncate" style={{ color: 'var(--blue)' }}>
                {config?.webhook_url}
              </code>
              <button
                onClick={() => config?.webhook_url && copyToClipboard(config.webhook_url)}
                className="p-2 transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
              Add this URL to your LINE Developers Console → Messaging API → Webhook settings
            </p>
          </section>

          {/* Edit Configuration Form */}
          {isEditing ? (
            <section className="bg-white p-8" style={{ border: '1px solid var(--border)' }}>
              <p className="font-mono text-[10px] uppercase tracking-widest mb-6" style={{ color: 'var(--text-muted)' }}>
                Edit LINE Configuration
              </p>
              <form onSubmit={(e) => { e.preventDefault(); handleSaveConfig(); }} className="space-y-5">
                <div>
                  <label className="block font-mono text-[9px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    LINE Channel ID
                  </label>
                  <input
                    type="text"
                    value={configForm.line_channel_id}
                    onChange={(e) => setConfigForm({ ...configForm, line_channel_id: e.target.value })}
                    placeholder="Enter from LINE Developers"
                    className={inputClass}
                    style={inputStyle}
                    required
                  />
                </div>

                <div>
                  <label className="block font-mono text-[9px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    LINE Channel Secret
                  </label>
                  <input
                    type="password"
                    value={configForm.line_channel_secret}
                    onChange={(e) => setConfigForm({ ...configForm, line_channel_secret: e.target.value })}
                    placeholder="Enter from LINE Developers"
                    className={inputClass}
                    style={inputStyle}
                    required
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Current secret will be replaced</p>
                </div>

                <div>
                  <label className="block font-mono text-[9px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    LINE Access Token (Channel Access Token)
                  </label>
                  <input
                    type="password"
                    value={configForm.line_access_token}
                    onChange={(e) => setConfigForm({ ...configForm, line_access_token: e.target.value })}
                    placeholder="Enter from LINE Developers"
                    className={inputClass}
                    style={inputStyle}
                    required
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Current token will be replaced</p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={configMutation.isPending}
                    className="flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60"
                    style={{ background: 'var(--navy)', color: '#fff' }}
                  >
                    {configMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Configuration'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-6 py-3 text-sm font-semibold transition-all hover:opacity-90"
                    style={{ border: '1px solid var(--border)', color: 'var(--navy)' }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </section>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={handleEditClick}
                className="flex-1 py-3.5 text-sm font-semibold transition-all hover:opacity-90"
                style={{ background: 'var(--navy)', color: '#fff' }}
              >
                Edit Configuration
              </button>
              <button
                onClick={() => setIsDeleting(true)}
                className="flex-1 py-3.5 text-sm font-semibold transition-colors"
                style={{ border: '1px solid #FECDD3', color: '#E11D48' }}
              >
                Delete
              </button>
            </div>
          )}

          {/* Instructions */}
          <section className="p-8" style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
            <p className="font-mono text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: '#047857' }}>
              <MessageSquare className="w-3.5 h-3.5" /> Setup Instructions
            </p>
            <div className="space-y-4 text-sm" style={{ color: 'var(--navy)' }}>
              <div className="flex gap-4">
                <span className="shrink-0 w-6 h-6 flex items-center justify-center text-xs font-bold text-white" style={{ background: '#047857' }}>1</span>
                <p>
                  Go to{' '}
                  <a
                    href="https://developers.line.biz/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium underline"
                    style={{ color: '#047857' }}
                  >
                    LINE Developers Console
                  </a>
                </p>
              </div>
              <div className="flex gap-4">
                <span className="shrink-0 w-6 h-6 flex items-center justify-center text-xs font-bold text-white" style={{ background: '#047857' }}>2</span>
                <p>Select your Messaging API channel</p>
              </div>
              <div className="flex gap-4">
                <span className="shrink-0 w-6 h-6 flex items-center justify-center text-xs font-bold text-white" style={{ background: '#047857' }}>3</span>
                <p>Go to "Messaging API" tab → "Webhook settings" and add the webhook URL above</p>
              </div>
              <div className="flex gap-4">
                <span className="shrink-0 w-6 h-6 flex items-center justify-center text-xs font-bold text-white" style={{ background: '#047857' }}>4</span>
                <p>Enable "Use webhook" checkbox and verify your channel secret</p>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Delete confirmation */}
      {isDeleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white max-w-md w-full p-8" style={{ border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg" style={{ color: 'var(--navy)' }}>Delete LINE configuration?</h3>
              <button onClick={() => setIsDeleting(false)} style={{ color: 'var(--text-muted)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              Customers will no longer be able to send slips through LINE until you configure it again. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: '#E11D48', color: '#fff' }}
              >
                {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Yes, delete
              </button>
              <button
                onClick={() => setIsDeleting(false)}
                disabled={deleteMutation.isPending}
                className="flex-1 py-3 text-sm font-semibold transition-all hover:opacity-90"
                style={{ border: '1px solid var(--border)', color: 'var(--navy)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
