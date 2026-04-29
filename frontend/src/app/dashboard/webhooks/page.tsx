'use client';

import React from 'react';
import { 
  Webhook, 
  Plus, 
  ExternalLink, 
  Trash2, 
  Settings2,
  CheckCircle2,
  Activity,
  Zap
} from 'lucide-react';

const webhooks = [
  { 
    id: 1, 
    url: 'https://api.yourcommerce.com/webhooks/slipsure', 
    events: ['slip.verified', 'slip.failed'], 
    status: 'Healthy',
    lastSent: '2 mins ago'
  },
];

export default function WebhooksPage() {
  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 tracking-tight mb-2">Webhooks</h1>
          <p className="text-sm font-medium text-zinc-500">Configure real-time notifications for automated slip verification events.</p>
        </div>
        <button className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Webhook Endpoint
        </button>
      </div>

      <div className="grid gap-6">
        {webhooks.map((item) => (
          <div key={item.id} className="bg-white border border-zinc-100 rounded-[2.5rem] p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-4 flex-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100">
                  <Webhook className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                   <h3 className="text-lg font-bold text-zinc-900 tracking-tight">{item.url}</h3>
                   <div className="flex items-center gap-4 mt-1">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                         <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                         {item.status}
                      </div>
                      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                         <Activity className="w-3 h-3" />
                         Last sent: {item.lastSent}
                      </div>
                   </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {item.events.map(event => (
                  <span key={event} className="px-3 py-1 bg-zinc-50 border border-zinc-100 rounded-lg text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    {event}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-6 py-3 border-2 border-zinc-100 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-50 transition-all">
                 <Settings2 className="w-4 h-4" />
                 Configure
              </button>
              <button className="p-3 border-2 border-zinc-100 rounded-xl text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-all">
                 <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        <div className="bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-[2.5rem] p-12 text-center">
            <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 border border-zinc-100 shadow-sm">
                <Zap className="w-8 h-8 text-zinc-300" />
            </div>
            <h4 className="text-zinc-900 font-bold mb-2">Need more endpoints?</h4>
            <p className="text-zinc-500 text-sm font-medium mb-8 max-w-sm mx-auto">
              Upgrade to our Business Plan to add up to 20 webhook endpoints for complex workflows.
            </p>
            <button className="text-emerald-600 font-bold text-sm uppercase tracking-widest hover:underline decoration-2 underline-offset-4">
               View Pricing Plans
            </button>
        </div>
      </div>
    </div>
  );
}
