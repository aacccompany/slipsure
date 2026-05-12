'use client';

import React, { useState } from 'react';
import { 
  Plus, 
  Copy, 
  Trash2, 
  Eye, 
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboard';
import { toast } from 'sonner';

export default function ApiKeysPage() {
  const [showKey, setShowKey] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();

  const { data: keys, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: dashboardService.getKeys
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => dashboardService.createKey(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success('New API key created successfully!');
      setIsCreating(false);
    }
  });

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success('API Key copied to clipboard');
  };

  const handleCreate = () => {
    const name = prompt('Enter a name for your new API key:');
    if (name) {
      createMutation.mutate(name);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 tracking-tight mb-2">API Keys</h1>
          <p className="text-sm font-medium text-zinc-500">Manage your authentication tokens to access FlowSlip API.</p>
        </div>
        <button 
          onClick={handleCreate}
          className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create New Key
        </button>
      </div>

      <div className="bg-white border border-zinc-100 rounded-[2.5rem] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-100">
                <th className="px-8 py-5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Name</th>
                <th className="px-8 py-5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">API Key</th>
                <th className="px-8 py-5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Created</th>
                <th className="px-8 py-5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {keys?.map((item) => (
                <tr key={item.id} className="hover:bg-zinc-50/30 transition-colors group">
                  <td className="px-8 py-6">
                    <span className="text-sm font-bold text-zinc-900">{item.name}</span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <code className="bg-zinc-100 px-3 py-1.5 rounded-lg text-xs font-mono text-zinc-600 tracking-wider">
                        {showKey === item.id ? item.key : '••••••••••••••••'}
                      </code>
                      <button 
                        onClick={() => setShowKey(showKey === item.id ? null : item.id)}
                        className="p-1.5 text-zinc-400 hover:text-zinc-900 transition-colors"
                      >
                        {showKey === item.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button 
                        onClick={() => handleCopy(item.key)}
                        className="p-1.5 text-zinc-400 hover:text-emerald-600 transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-sm font-medium text-zinc-500">{item.created_at}</span>
                  </td>
                  <td className="px-8 py-6">
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full w-fit ${
                      item.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                        <CheckCircle2 className="w-3 h-3" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">{item.status}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button className="p-2 text-zinc-400 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-8 flex items-start gap-6">
         <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-emerald-50">
            <AlertCircle className="w-6 h-6 text-emerald-600" />
         </div>
         <div>
            <h4 className="text-emerald-900 font-bold mb-2">Security Recommendation</h4>
            <p className="text-emerald-700/80 text-sm font-medium leading-relaxed max-w-3xl">
              Never share your secret API keys in client-side code or public repositories. 
              Always use environment variables and handle verification on your server. 
              If a key is compromised, revoke it immediately and generate a new one.
            </p>
         </div>
      </div>
    </div>
  );
}
