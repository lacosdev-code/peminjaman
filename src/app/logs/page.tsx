'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
    History,
    ChevronLeft,
    RefreshCw,
    User,
    ArrowUpRight,
    ArrowDownLeft,
    AlertTriangle,
    Loader2
} from 'lucide-react';

interface ActivityLog {
    id: number;
    created_at: string;
    details: {
        teknisi: string;
        type: 'Pinjam' | 'Kembali';
        item_name: string;
        condition: string;
        photo_url?: string;
    };
}

export default function LogsPage() {
    const router = useRouter();
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [technicianName, setTechnicianName] = useState('');

    const fetchLogs = async (showRefresh = false) => {
        if (!technicianName) return;

        if (showRefresh) setRefreshing(true);
        setError(null);

        try {
            const { data, error: sbError } = await supabase
                .from('activity_logs')
                .select('*')
                .eq('details->>teknisi', technicianName)
                .order('created_at', { ascending: false });

            if (sbError) throw sbError;

            setLogs(data || []);
        } catch (err: any) {
            console.error('Error fetching logs:', err);
            setError('Gagal memuat riwayat aktivitas. Periksa koneksi Anda.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        const techData = localStorage.getItem('sgd_technician');
        if (!techData) {
            router.push('/login');
            return;
        }
        const tech = JSON.parse(techData);
        setTechnicianName(tech.name);
    }, [router]);

    useEffect(() => {
        if (technicianName) {
            fetchLogs();

            // Listen for realtime updates
            const channel = supabase
                .channel('logs-sync')
                .on(
                    'postgres_changes',
                    { event: 'INSERT', table: 'activity_logs', schema: 'public' },
                    () => fetchLogs()
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [technicianName]);

    return (
        <main className="min-h-screen bg-background text-foreground pb-24">
            {/* Header */}
            <header className="px-6 pt-8 pb-4 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-20 border-b border-white/5">
                <Link href="/">
                    <button className="p-3 rounded-2xl glass-panel bg-white/5 active:scale-90 transition-transform">
                        <ChevronLeft size={20} className="text-slate-400" />
                    </button>
                </Link>
                <div className="text-center flex-1 mx-4">
                    <p className="text-[10px] font-black tracking-[0.2em] text-primary uppercase italic">Inventaris SGD</p>
                    <h1 className="font-bold text-base text-slate-100">Riwayat Aktivitas</h1>
                </div>
                <button
                    onClick={() => fetchLogs(true)}
                    disabled={refreshing}
                    className="p-3 rounded-2xl glass-panel bg-white/5 active:scale-90 transition-transform"
                >
                    <RefreshCw size={20} className={`text-slate-400 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
            </header>

            {/* Content */}
            <div className="px-6 py-6 space-y-4 max-w-lg mx-auto">
                <AnimatePresence mode="wait">
                    {loading ? (
                        // Skeleton Loader
                        <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={`skeleton-${i}`} className="glass-panel p-5 rounded-3xl border border-white/5 flex gap-4 animate-pulse">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-800 shrink-0" />
                                    <div className="flex-1 space-y-3">
                                        <div className="h-4 bg-slate-800 rounded w-3/4" />
                                        <div className="h-3 bg-slate-800 rounded w-1/2" />
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    ) : error ? (
                        <motion.div key="error" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-10 rounded-3xl text-center space-y-4 border border-rose-500/10">
                            <AlertTriangle size={40} className="mx-auto text-rose-500" />
                            <p className="text-rose-400 text-sm font-bold">{error}</p>
                            <button onClick={() => fetchLogs()} className="w-full bg-slate-800 py-3 rounded-xl mt-2 text-xs uppercase font-bold tracking-widest text-white active:scale-95 transition-transform">
                                Coba Lagi
                            </button>
                        </motion.div>
                    ) : logs.length === 0 ? (
                        <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel p-10 rounded-3xl text-center border-dashed border-white/5 flex flex-col items-center justify-center min-h-[300px]">
                            <History size={48} className="text-slate-700 mb-4" />
                            <p className="text-slate-400 text-sm font-black tracking-tight uppercase">Belum ada aktivitas</p>
                            <p className="text-xs text-slate-500 mt-2 max-w-[200px]">Riwayat peminjaman dan pengembalian Anda akan muncul di sini.</p>
                        </motion.div>
                    ) : (
                        <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                            <div className="flex items-center justify-between px-1 mb-2">
                                <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Semua Waktu</h2>
                                <span className="text-[10px] font-bold bg-white/5 text-slate-400 px-2 py-0.5 rounded-full ring-1 ring-white/10">
                                    Total: {logs.length}
                                </span>
                            </div>

                            {logs.map((log, idx) => (
                                <motion.div
                                    key={log.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="glass-panel p-5 rounded-3xl border border-white/5 flex gap-4 relative group hover:border-primary/20 transition-all active:scale-[0.98]"
                                >
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${log.details.type === 'Pinjam'
                                        ? 'bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20'
                                        : 'bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20'
                                        }`}>
                                        {log.details.type === 'Pinjam' ? <ArrowUpRight size={22} strokeWidth={2.5} /> : <ArrowDownLeft size={22} strokeWidth={2.5} />}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className="font-black text-slate-100 text-sm truncate uppercase tracking-tight pr-2">
                                                {log.details.item_name}
                                            </h3>
                                            <div className="flex flex-col items-end">
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter shrink-0">
                                                    {new Date(log.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                </span>
                                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter shrink-0 mt-0.5">
                                                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                                            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${log.details.type === 'Pinjam' ? 'bg-amber-500 text-black' : 'bg-emerald-500 text-black'
                                                }`}>
                                                {log.details.type}
                                            </div>

                                            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest outline outline-1 ${log.details.condition === 'Baik' || log.details.condition === 'Bagus'
                                                ? 'outline-emerald-500/30 text-emerald-500'
                                                : 'outline-rose-500/30 text-rose-500'
                                                }`}>
                                                {log.details.condition}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </main>
    );
}
