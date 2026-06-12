'use client';

import React, { useState } from 'react';
import {
  Webhook,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  Copy,
  RefreshCw,
  MessageSquare,
  Key,
  Clock,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import type { LINEWebhookConfig, LINEWebhookTestResponse } from '@/types/api';

export default function WebhooksPage() {
  const queryClient = useQueryClient();

  const [isConfiguring, setIsConfiguring] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [configForm, setConfigForm] = useState({
    line_channel_id: '',
    line_channel_secret: '',
    line_access_token: '',
  });
  const [testResult, setTestResult] = useState<LINEWebhookTestResponse | null>(null);

  // Fetch LINE webhook config
  const { data: configData, isLoading } = useQuery({
    queryKey: ['line-webhook-config'],
    queryFn: () => api.getLINEWebhookConfig(),
  });

  const configMutation = useMutation({
    mutationFn: (data: { line_channel_id: string; line_channel_secret: string; line_access_token: string }) =>
      api.updateLINEWebhookConfig(data),
    onSuccess: () => {
      toast.success('LINE webhook configured successfully!');
      setIsConfiguring(false);
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
      queryClient.invalidateQueries({ queryKey: ['line-webhook-config'] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete webhook config');
    },
  });

  const testMutation = useMutation({
    mutationFn: () => api.testLINEWebhook(),
    onSuccess: (response) => {
      setTestResult(response.data?.result || null);
      toast.success('Webhook test completed');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Webhook test failed');
    },
  });

  const handleSaveConfig = () => {
    if (!configForm.line_channel_id || !configForm.line_channel_secret || !configForm.line_access_token) {
      toast.error('Please fill in all LINE credentials');
      return;
    }
    configMutation.mutate(configForm);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete LINE webhook configuration?')) {
      deleteMutation.mutate();
    }
  };

  const handleTest = () => {
    setIsTesting(true);
    testMutation.mutate();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-800 animate-spin" />
      </div>
    );
  }

  const config = configData?.data?.config;

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 tracking-tight mb-2">LINE Webhook</h1>
          <p className="text-sm font-medium text-zinc-500">
            Configure LINE Official Account to receive payment slip notifications from customers.
          </p>
        </div>
      </div>

      {!config?.is_configured ? (
        // Not configured - show setup form
        <div className="max-w-2xl">
          <div className="bg-white border border-zinc-200 rounded-2xl p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-green-700" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900">Setup LINE Webhook</h3>
                <p className="text-sm text-zinc-500">
                  Connect your LINE Official Account to enable slip verification via LINE.
                </p>
              </div>
            </div>

            {isConfiguring ? (
              <form onSubmit={(e) => { e.preventDefault(); handleSaveConfig(); }} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">
                    LINE Channel ID
                  </label>
                  <input
                    type="text"
                    value={configForm.line_channel_id}
                    onChange={(e) => setConfigForm({ ...configForm, line_channel_id: e.target.value })}
                    placeholder="Enter from LINE Developers"
                    className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-700/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">
                    LINE Channel Secret
                  </label>
                  <input
                    type="password"
                    value={configForm.line_channel_secret}
                    onChange={(e) => setConfigForm({ ...configForm, line_channel_secret: e.target.value })}
                    placeholder="Enter from LINE Developers"
                    className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-700/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">
                    LINE Access Token (Channel Access Token)
                  </label>
                  <input
                    type="password"
                    value={configForm.line_access_token}
                    onChange={(e) => setConfigForm({ ...configForm, line_access_token: e.target.value })}
                    placeholder="Enter from LINE Developers"
                    className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-700/20"
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={configMutation.isPending}
                    className="flex-1 bg-blue-800 text-white py-3 rounded-xl font-medium hover:bg-blue-900 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {configMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Configuration'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsConfiguring(false)}
                    className="px-6 py-3 border border-zinc-200 text-zinc-700 rounded-xl font-medium hover:bg-zinc-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setIsConfiguring(true)}
                className="w-full py-4 border-2 border-dashed border-zinc-200 rounded-2xl text-sm font-bold text-zinc-500 hover:border-blue-400 hover:text-blue-700 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Configure LINE Webhook
              </button>
            )}
          </div>
        </div>
      ) : (
        // Configured - show configuration
        <>
          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            {/* Status Cards */}
            <div className="bg-white border border-zinc-100 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-700" />
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Status</p>
                  <p className="text-sm font-bold text-green-700">Active</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-zinc-100 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                  <Webhook className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Reference ID</p>
                  <p className="text-sm font-bold text-zinc-900 font-mono">{config?.webhook_reference_id}</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-zinc-100 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center">
                  <Clock className="w-5 h-5 text-purple-700" />
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Configured</p>
                  <p className="text-sm font-bold text-zinc-900">
                    {new Date(config.updated_at).toLocaleDateString('th-TH')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Webhook URL */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-8 mb-6">
            <h3 className="text-lg font-bold text-zinc-900 mb-4 flex items-center gap-2">
              <Key className="w-5 h-5 text-blue-700" />
              Webhook URL
            </h3>
            <div className="flex items-center gap-4 p-4 bg-zinc-50 rounded-xl">
              <code className="flex-1 text-sm font-mono text-blue-800 truncate">
                {config?.webhook_url}
              </code>
              <button
                onClick={() => config?.webhook_url && copyToClipboard(config.webhook_url)}
                className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                <Copy className="w-4 h-4 text-zinc-500" />
              </button>
            </div>
            <p className="text-xs text-zinc-500 mt-3">
              Add this URL to your LINE Developers Console → Messaging API → Webhook settings
            </p>
          </div>

          {/* Test & Actions */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={handleTest}
              disabled={testMutation.isPending}
              className="flex-1 bg-white border border-zinc-200 py-4 rounded-xl font-medium text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {testMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Test Connection
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="px-6 py-4 border-2 border-rose-200 text-rose-600 rounded-xl font-medium hover:bg-rose-50 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Delete Configuration
            </button>
          </div>

          {/* Test Results */}
          {testResult && (
            <div className="bg-white border border-zinc-200 rounded-2xl p-6 mb-6">
              <h3 className="text-lg font-bold text-zinc-900 mb-4">Test Results</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-zinc-50">
                    <span className="text-sm text-zinc-500">Webhook Status</span>
                    <span className={`text-sm font-medium flex items-center gap-2 ${
                      testResult.webhook_status === 'active' ? 'text-green-700' : 'text-zinc-900'
                    }`}>
                      {testResult.webhook_status === 'active' ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                      {testResult.webhook_status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-zinc-50">
                    <span className="text-sm text-zinc-500">Connection</span>
                    <span className={`text-sm font-medium ${
                      testResult.connection_status === 'connected' ? 'text-green-700' : 'text-zinc-900'
                    }`}>
                      {testResult.connection_status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-zinc-500">API Access</span>
                    <span className={`text-sm font-medium ${
                      testResult.api_access === 'working' ? 'text-green-700' : 'text-zinc-900'
                    }`}>
                      {testResult.api_access}
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-zinc-50">
                    <span className="text-sm text-zinc-500">Signature Validation</span>
                    <span className="text-sm font-medium text-zinc-900">{testResult.signature_validation}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-zinc-500">Response Time</span>
                    <span className="text-sm font-medium text-zinc-900">{testResult.response_time_ms}ms</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-zinc-500">Tested At</span>
                    <span className="text-sm font-medium text-zinc-900">
                      {new Date(testResult.tested_at).toLocaleString('th-TH')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-8">
            <h3 className="text-lg font-bold text-zinc-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-700" />
              Setup Instructions
            </h3>
            <div className="space-y-4 text-sm text-zinc-700">
              <div className="flex gap-4">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-800 text-white rounded-full flex items-center justify-center font-bold">
                  1
                </span>
                <p>
                  Go to{' '}
                  <a
                    href="https://developers.line.biz/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-800 font-medium underline"
                  >
                    LINE Developers Console
                  </a>
                </p>
              </div>
              <div className="flex gap-4">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-800 text-white rounded-full flex items-center justify-center font-bold">
                  2
                </span>
                <p>Select your Messaging API channel</p>
              </div>
              <div className="flex gap-4">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-800 text-white rounded-full flex items-center justify-center font-bold">
                  3
                </span>
                <p>Go to "Messaging API" tab → "Webhook settings" and add the webhook URL above</p>
              </div>
              <div className="flex gap-4">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-800 text-white rounded-full flex items-center justify-center font-bold">
                  4
                </span>
                <p>Enable "Use webhook" checkbox and verify your channel secret</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
