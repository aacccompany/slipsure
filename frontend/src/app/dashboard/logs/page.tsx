'use client';

import React from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  CheckCircle2, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboard';

export default function LogsPage() {
  const { data: logsResponse, isLoading } = useQuery({
    queryKey: ['dashboard-logs'],
    queryFn: () => dashboardService.getLogs(1)
  });

  const logs = logsResponse?.data || [];

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 tracking-tight mb-2">Verification Logs</h1>
          <p className="text-sm font-medium text-zinc-500">History of all processed slips and their verification status.</p>
        </div>
        <div className="flex items-center gap-3">
            <button className="bg-white border-2 border-zinc-100 text-zinc-600 px-6 py-3 rounded-xl font-bold text-sm hover:bg-zinc-50 transition-all flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export CSV
            </button>
        </div>
      </div>

      <div className="bg-white border border-zinc-100 rounded-[2.5rem] shadow-sm overflow-hidden">
        <div className="p-8 border-b border-zinc-100 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-zinc-50/30">
           <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Search by Transaction Ref, Sender..." 
                className="w-full pl-10 pr-4 py-3 bg-white border border-zinc-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-700/20 transition-all"
              />
           </div>
           <div className="flex items-center gap-3">
              <button className="p-3 bg-white border border-zinc-100 rounded-xl text-zinc-500 hover:text-blue-800 hover:border-blue-50 transition-all">
                 <Filter className="w-4 h-4" />
              </button>
              <select className="bg-white border border-zinc-100 rounded-xl px-4 py-3 text-sm font-bold text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-700/20">
                 <option>All Status</option>
                 <option>Success</option>
                 <option>Failed</option>
              </select>
           </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 text-blue-800 animate-spin mb-4" />
              <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Loading logs...</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-zinc-50">
                  <th className="px-8 py-5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Date & Time</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Sender</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Amount</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Trans. Ref</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {logs.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-sm font-bold text-zinc-900">
                          <Clock className="w-3.5 h-3.5 text-zinc-400" />
                          {item.timestamp}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                          <span className="text-sm font-bold text-zinc-900">{item.sender_name}</span>
                          <span className="text-[10px] font-bold text-blue-800 uppercase tracking-widest">{item.bank_name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-sm font-black text-zinc-900">฿{item.amount.toLocaleString()}</span>
                    </td>
                    <td className="px-8 py-6">
                      <code className="text-xs font-mono text-zinc-500 tracking-wider bg-zinc-100 px-2 py-1 rounded">{item.trans_ref}</code>
                    </td>
                    <td className="px-8 py-6">
                      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full w-fit ${
                          item.status === 'success' ? 'bg-blue-50 text-blue-900' : 'bg-rose-50 text-rose-700'
                      }`}>
                          {item.status === 'success' ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                          <span className="text-[10px] font-bold uppercase tracking-widest">{item.status}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button className="px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-blue-800 hover:border-blue-50 transition-all opacity-0 group-hover:opacity-100">
                        Manual Recheck
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-8 border-t border-zinc-50 flex items-center justify-between">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              Showing 1-{logs.length} of {logsResponse?.total || 0} logs
            </p>
            <div className="flex items-center gap-2">
                <button className="p-2 border border-zinc-100 rounded-lg text-zinc-400 hover:text-blue-800 hover:border-blue-50 transition-all disabled:opacity-50" disabled>
                    <ChevronLeft className="w-4 h-4" />
                </button>
                {[1, 2, 3, '...', 12].map((page, i) => (
                    <button key={i} className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                        page === 1 ? 'bg-zinc-900 text-white shadow-lg shadow-zinc-900/10' : 'text-zinc-500 hover:bg-zinc-50'
                    }`}>
                        {page}
                    </button>
                ))}
                <button className="p-2 border border-zinc-100 rounded-lg text-zinc-400 hover:text-blue-800 hover:border-blue-50 transition-all">
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}
