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
  User,
  Building2,
  Clock
} from 'lucide-react';

const logs = [
  { id: 1, date: '2024-04-28 14:30', amount: 1250.00, sender: 'Somchai J.', bank: 'KBank', ref: 'KB1714282210', status: 'Success' },
  { id: 2, date: '2024-04-28 14:15', amount: 500.00, sender: 'Jane Doe', bank: 'SCB', ref: 'SCB1714281305', status: 'Success' },
  { id: 3, date: '2024-04-28 13:50', amount: 2500.00, sender: 'Unknown', bank: 'N/A', ref: 'N/A', status: 'Failed' },
  { id: 4, date: '2024-04-28 13:20', amount: 150.00, sender: 'Wichai S.', bank: 'TTB', ref: 'TTB1714278010', status: 'Success' },
  { id: 5, date: '2024-04-28 12:45', amount: 3000.00, sender: 'Malee K.', bank: 'BBL', ref: 'BBL1714275902', status: 'Success' },
];

export default function LogsPage() {
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
                className="w-full pl-10 pr-4 py-3 bg-white border border-zinc-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
           </div>
           <div className="flex items-center gap-3">
              <button className="p-3 bg-white border border-zinc-100 rounded-xl text-zinc-500 hover:text-emerald-600 hover:border-emerald-100 transition-all">
                 <Filter className="w-4 h-4" />
              </button>
              <select className="bg-white border border-zinc-100 rounded-xl px-4 py-3 text-sm font-bold text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                 <option>All Status</option>
                 <option>Success</option>
                 <option>Failed</option>
              </select>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-zinc-50">
                <th className="px-8 py-5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Date & Time</th>
                <th className="px-8 py-5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Sender</th>
                <th className="px-8 py-5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Amount</th>
                <th className="px-8 py-5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Trans. Ref</th>
                <th className="px-8 py-5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {logs.map((item) => (
                <tr key={item.id} className="hover:bg-zinc-50/50 transition-colors cursor-pointer">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-sm font-bold text-zinc-900">
                        <Clock className="w-3.5 h-3.5 text-zinc-400" />
                        {item.date}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-zinc-900">{item.sender}</span>
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{item.bank}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-sm font-black text-zinc-900">฿{item.amount.toLocaleString()}</span>
                  </td>
                  <td className="px-8 py-6">
                    <code className="text-xs font-mono text-zinc-500 tracking-wider bg-zinc-100 px-2 py-1 rounded">{item.ref}</code>
                  </td>
                  <td className="px-8 py-6">
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full w-fit ${
                        item.status === 'Success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                        {item.status === 'Success' ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                        <span className="text-[10px] font-bold uppercase tracking-widest">{item.status}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-8 border-t border-zinc-50 flex items-center justify-between">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Showing 1-5 of 1,248 logs</p>
            <div className="flex items-center gap-2">
                <button className="p-2 border border-zinc-100 rounded-lg text-zinc-400 hover:text-emerald-600 hover:border-emerald-100 transition-all disabled:opacity-50" disabled>
                    <ChevronLeft className="w-4 h-4" />
                </button>
                {[1, 2, 3, '...', 12].map((page, i) => (
                    <button key={i} className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                        page === 1 ? 'bg-zinc-900 text-white shadow-lg shadow-zinc-900/10' : 'text-zinc-500 hover:bg-zinc-50'
                    }`}>
                        {page}
                    </button>
                ))}
                <button className="p-2 border border-zinc-100 rounded-lg text-zinc-400 hover:text-emerald-600 hover:border-emerald-100 transition-all">
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}
