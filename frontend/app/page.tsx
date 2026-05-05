'use client';

import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  DollarSign, 
  Zap, 
  Loader2, 
  Cpu, 
  Terminal, 
  RefreshCw 
} from 'lucide-react';

// Your live deployed API gateway URL
const API_BASE = "https://2zrpmyfi26.execute-api.us-east-1.amazonaws.com";

interface BudgetData {
  budget_limit: number;
  actual_spend: number;
  percent_spent: number;
  currency: string;
}

interface ActionResponse {
  status: string;
  message: string;
  action_taken: string;
  affected_resources: string[];
}

export default function Home() {
  const [metrics, setMetrics] = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([
    "System initialized.",
    "Awaiting user action..."
  ]);

  // Fetch cloud cost metrics
  const fetchMetrics = async () => {
    setLoading(true);
    addLog("Fetching cloud infrastructure metrics...");
    try {
      const res = await fetch(`${API_BASE}/metrics`);
      const payload = await res.json();
      setMetrics(payload.data);
      addLog("Successfully synced metrics from DynamoDB.");
    } catch (err) {
      addLog("Error: Failed to fetch cloud metrics.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Trigger Cost Optimization Action
  const triggerCleanup = async () => {
    setActionLoading(true);
    addLog("POST request fired to /actions/cleanup...");
    try {
      const res = await fetch(`${API_BASE}/actions/cleanup`, { method: 'POST' });
      const payload: ActionResponse = await res.json();
      addLog(`API Response: ${payload.message}`);
      if (payload.affected_resources.length > 0) {
        addLog(`Stopped instances: ${payload.affected_resources.join(', ')}`);
      }
    } catch (err) {
      addLog("Error: Failed to execute optimization task.");
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${timestamp}] ${message}`, ...prev]);
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100 p-6 md:p-12 selection:bg-teal-500 selection:text-black">
      {/* Top Header Navigation */}
      <header className="max-w-6xl mx-auto flex items-center justify-between pb-8 border-b border-zinc-800/80 mb-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-teal-500/10 rounded-xl border border-teal-500/30 text-teal-400">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">DEVPULSE</h1>
            <p className="text-xs text-zinc-400">AWS Resource & Budget Command Center</p>
          </div>
        </div>
        <button 
          onClick={fetchMetrics} 
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 active:scale-95 transition-all rounded-lg text-sm text-zinc-300 font-medium"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin text-teal-400" /> : <RefreshCw className="w-4 h-4" />}
          Refresh Data
        </button>
      </header>

      {/* Main Grid Content */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Bento Card 1: Live Cloud Budget Progress */}
        <div className="md:col-span-2 p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md flex flex-col justify-between group hover:border-zinc-700/80 transition-all duration-300">
          <div>
            <div className="flex justify-between items-start mb-6">
              <span className="text-xs font-semibold uppercase tracking-widest text-teal-400">AWS Budgets</span>
              <DollarSign className="w-5 h-5 text-zinc-500 group-hover:text-teal-400 transition-colors" />
            </div>
            <h2 className="text-sm font-medium text-zinc-400 mb-1">Monthly Cloud Budget Status</h2>
            
            {loading ? (
              <div className="h-16 flex items-center">
                <Loader2 className="w-6 h-6 animate-spin text-teal-400" />
              </div>
            ) : (
              <div className="flex items-baseline gap-2 my-2">
                <span className="text-4xl font-extrabold tracking-tight">
                  ${metrics?.actual_spend.toFixed(2)}
                </span>
                <span className="text-zinc-500 text-sm">
                  of ${metrics?.budget_limit.toFixed(2)} {metrics?.currency}
                </span>
              </div>
            )}
          </div>

          <div className="mt-8">
            <div className="flex justify-between text-xs text-zinc-400 mb-2">
              <span>Limit Usage Percentage</span>
              <span className="font-mono text-teal-400">{metrics?.percent_spent ?? 0}%</span>
            </div>
            {/* Custom Interactive Progress Bar */}
            <div className="w-full bg-zinc-800/50 h-3 rounded-full overflow-hidden border border-zinc-800">
              <div 
                className="bg-gradient-to-r from-teal-500 to-emerald-400 h-full rounded-full transition-all duration-1000 ease-out" 
                style={{ width: `${Math.min(metrics?.percent_spent ?? 0, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Bento Card 2: Interactive Automation Panel */}
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md flex flex-col justify-between group hover:border-zinc-700/80 transition-all duration-300">
          <div>
            <div className="flex justify-between items-start mb-6">
              <span className="text-xs font-semibold uppercase tracking-widest text-emerald-400">Cloud Automation</span>
              <Cpu className="w-5 h-5 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
            </div>
            <h2 className="text-lg font-bold tracking-tight mb-2">Cost Optimization</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Triggers an AWS Lambda utility to identify and terminate idle, unattached development instances securely in real-time.
            </p>
          </div>

          <button
            onClick={triggerCleanup}
            disabled={actionLoading}
            className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 font-semibold text-black rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2 mt-6 shadow-lg shadow-emerald-500/10"
          >
            {actionLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Optimizing Assets...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5 fill-current" />
                Optimize Cloud Spend
              </>
            )}
          </button>
        </div>

        {/* Bento Card 3: Real-Time Stream Terminal Logs */}
        <div className="md:col-span-3 p-6 rounded-2xl bg-black border border-zinc-800/80 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-teal-500/50 to-transparent" />
          <div className="flex items-center gap-2 mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-400">
            <Terminal className="w-4 h-4 text-teal-400" />
            <span>Activity Execution Stream</span>
          </div>

          <div className="bg-zinc-950/60 rounded-xl p-4 border border-zinc-900/80 h-48 overflow-y-auto font-mono text-xs text-zinc-400 space-y-2 scrollbar-thin scrollbar-thumb-zinc-800">
            {logs.map((log, idx) => (
              <div key={idx} className="flex items-start gap-2.5 hover:text-zinc-200 transition-colors">
                <span className="text-teal-500 select-none">❯</span>
                <p className="flex-1 leading-normal">{log}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </main>
  );
}