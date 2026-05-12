'use client';

import React, { useState } from 'react';
import { Store, Image as ImageIcon, Send, ArrowRight, ArrowLeft, CheckCircle2, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    shopName: '',
    description: '',
    lineToken: '',
  });
  const router = useRouter();

  const handleNext = () => setStep(step + 1);
  const handleBack = () => setStep(step - 1);
  
  const handleComplete = () => {
    // Save to local storage for demo
    localStorage.setItem('hasCompletedOnboarding', 'true');
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-xl">
        {/* Progress Bar */}
        <div className="flex items-center justify-between mb-12 relative px-4">
          <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-0.5 bg-zinc-200 dark:bg-zinc-800 -z-0" />
          {[1, 2, 3].map((s) => (
            <div 
              key={s}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all relative z-10",
                step >= s ? "bg-blue-900 border-blue-800 text-white" : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400"
              )}
            >
              {step > s ? <CheckCircle2 className="w-6 h-6" /> : s}
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 md:p-12 shadow-sm">
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-50 dark:border-emerald-800">
                  <Store className="w-8 h-8 text-blue-800" />
                </div>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Shop Profile</h1>
                <p className="text-zinc-500 text-sm mt-2">Tell us about your business to get started.</p>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Shop Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Premium Coffee Hub" 
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-700/20"
                    onChange={(e) => setFormData({...formData, shopName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Description</label>
                  <textarea 
                    placeholder="A brief description of your shop..." 
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm h-24 focus:outline-none focus:ring-2 focus:ring-blue-700/20 resize-none"
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-50 dark:border-emerald-800">
                  <ImageIcon className="w-8 h-8 text-blue-800" />
                </div>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Identity Branding</h1>
                <p className="text-zinc-500 text-sm mt-2">Upload your shop logo for receipts and notifications.</p>
              </div>
              
              <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors">
                <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <ImageIcon className="w-6 h-6 text-zinc-400" />
                </div>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Click to upload logo</p>
                <p className="text-[10px] text-zinc-400 mt-1">PNG or JPG, Max 2MB</p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-50 dark:border-emerald-800">
                  <MessageSquare className="w-8 h-8 text-blue-800" />
                </div>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Bot Integration</h1>
                <p className="text-zinc-500 text-sm mt-2">Connect your LINE Official Account Messaging API.</p>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">LINE Channel Access Token</label>
                  <input 
                    type="password" 
                    placeholder="Enter your token here..." 
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-700/20"
                    onChange={(e) => setFormData({...formData, lineToken: e.target.value})}
                  />
                </div>
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-700">
                   <p className="text-[10px] font-medium text-zinc-500 leading-relaxed uppercase tracking-wider">
                     Tip: You can find this in your LINE Developers Console under Messaging API settings.
                   </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-12 flex items-center gap-4">
            {step > 1 && (
              <button 
                onClick={handleBack}
                className="px-6 py-3 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-bold text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}
            <button 
              onClick={step === 3 ? handleComplete : handleNext}
              className="flex-1 px-6 py-3 bg-zinc-900 dark:bg-blue-800 text-white rounded-xl text-sm font-bold hover:bg-black dark:hover:bg-blue-800 transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              {step === 3 ? 'Finish Setup' : 'Continue'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <p className="text-center mt-8 text-[10px] font-bold text-zinc-400 uppercase tracking-[0.3em]">
           Step {step} of 3 // FlowSlip Onboarding
        </p>
      </div>
    </div>
  );
}
