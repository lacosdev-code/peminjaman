'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';
import {
  QrCode,
  Package,
  History,
  User,
  Hammer,
  ArrowUpRight,
  ArrowDownLeft,
  Settings,
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

const CACHE_KEY_TOOLS = 'sgd_active_tools';
const CACHE_KEY_LOGS = 'sgd_recent_logs';

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

export default function TechnicianDashboard() {
  const [activeTools, setActiveTools] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [technicianName, setTechnicianName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const router = useRouter();

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: 'Konfirmasi Keluar',
      text: 'Apakah Anda yakin ingin keluar dari aplikasi?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#C5A02D',
      cancelButtonColor: '#1e293b',
      confirmButtonText: 'Ya, Keluar',
      cancelButtonText: 'Batal',
      background: '#0a0a0a',
      color: '#f8fafc',
    });

    if (result.isConfirmed) {
      localStorage.removeItem('sgd_technician');
      localStorage.removeItem('sgd_active_tools');
      localStorage.removeItem('sgd_recent_logs');
      router.push('/login');
    }
  };

  const handleNotifications = () => {
    Swal.fire({
      title: 'Notifikasi',
      text: 'Belum ada notifikasi baru untuk Anda.',
      icon: 'info',
      confirmButtonColor: '#C5A02D',
      background: '#0a0a0a',
      color: '#f8fafc',
    });
  };

  // Load from cache on mount
  useEffect(() => {
    const techData = localStorage.getItem('sgd_technician');
    if (!techData) {
      router.push('/login');
      return;
    }
    const tech = JSON.parse(techData);
    setTechnicianName(tech.name);
    setAvatarUrl(tech.avatar_url || null);

    const cachedTools = localStorage.getItem(CACHE_KEY_TOOLS);
    const cachedLogs = localStorage.getItem(CACHE_KEY_LOGS);
    if (cachedTools) setActiveTools(JSON.parse(cachedTools));
    if (cachedLogs) setRecentLogs(JSON.parse(cachedLogs));

    setIsOnline(navigator.onLine);
    window.addEventListener('online', () => setIsOnline(true));
    window.addEventListener('offline', () => setIsOnline(false));
  }, [router]);

  const fetchData = async () => {
    if (!technicianName) return;

    try {
      // 1. Fetch recent activity logs for this technician (for the "Aktivitas Terbaru" list)
      const { data: logsData, error: logsError } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('details->>teknisi', technicianName)
        .order('created_at', { ascending: false })
        .limit(10);

      if (logsError) throw logsError;
      setRecentLogs(logsData || []);
      localStorage.setItem(CACHE_KEY_LOGS, JSON.stringify(logsData || []));

      // 2. Fetch Active Items directly from the `peminjaman` table
      // This is the source of truth as per the architecture guide
      const { data: activeLoans, error: activeError } = await supabase
        .from('peminjaman')
        .select('*, inventaris_utama(*)')
        .eq('status', 'Dipinjam') // or any appropriate status used by the Admin app
        .ilike('peminjam', `%${technicianName}%`);

      const toolStates: Record<string, any> = {};

      if (!activeError && activeLoans) {
        activeLoans.forEach(loan => {
          const asset = loan.inventaris_utama;
          if (asset) {
            toolStates[asset.nama] = {
              id: `loan-${loan.id}`,
              created_at: loan.tanggal_pinjam,
              details: {
                item_name: asset.nama,
                item_id: asset.id,
                type: 'Pinjam',
                teknisi: technicianName,
                condition: loan.kondisi_awal || 'Baik'
              }
            };
          }
        });
      }

      // 3. Fallback/Complement: Fetch assets directly assigned via `lokasi` in `inventaris_utama`
      const { data: directAssets, error: directError } = await supabase
        .from('inventaris_utama')
        .select('*')
        .ilike('lokasi', `%${technicianName}%`);

      if (!directError && directAssets) {
        directAssets.forEach(asset => {
          if (!toolStates[asset.nama]) {
            toolStates[asset.nama] = {
              id: `static-${asset.id}`,
              created_at: asset.updated_at || asset.created_at || new Date().toISOString(),
              details: {
                item_name: asset.nama,
                item_id: asset.id,
                type: 'Pinjam',
                teknisi: technicianName,
                condition: asset.kondisi || 'Baik'
              }
            };
          }
        });
      }

      // 4. Legacy/Migration: Parse logs to find items that might not be in the `peminjaman` table yet
      // This ensures a smooth transition while the Admin app is being updated
      const sortedLogs = [...(logsData || [])].reverse();
      sortedLogs.forEach(log => {
        const itemName = log.details.item_name;
        if (log.details.type === 'Pinjam') {
          if (!toolStates[itemName]) {
            toolStates[itemName] = log;
          }
        } else if (log.details.type === 'Kembali') {
          delete toolStates[itemName];
        }
      });

      const activeList = Object.values(toolStates);
      setActiveTools(activeList);
      localStorage.setItem(CACHE_KEY_TOOLS, JSON.stringify(activeList));

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (technicianName) {
      fetchData();

      const channel = supabase
        .channel('dashboard-sync')
        .on(
          'postgres_changes',
          { event: 'INSERT', table: 'activity_logs', schema: 'public' },
          () => fetchData()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [technicianName]);

  return (
    <main className="min-h-screen bg-background text-foreground pb-24">
      {/* Top Bar */}
      <header className="px-6 pt-8 pb-4 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-white/5 overflow-hidden gold-gradient flex items-center justify-center text-primary-foreground font-bold shadow-gold">
            {avatarUrl ? (
              <img src={avatarUrl} alt={technicianName} className="w-full h-full object-cover" />
            ) : (
              technicianName.charAt(0)
            )}
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Selamat Bekerja,</p>
            <h1 className="font-bold text-lg">{technicianName}</h1>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-white/5">
            <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`} />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {isOnline ? 'Sinyal' : 'Offline'}
            </span>
          </div>
          <button
            onClick={handleNotifications}
            className="p-2 rounded-full glass-panel active:scale-95 transition-transform"
          >
            <Bell size={20} className="text-slate-400" />
          </button>
          <button
            onClick={handleLogout}
            className="p-2 rounded-full glass-panel active:scale-95 transition-transform"
          >
            <Settings size={20} className="text-slate-400" />
          </button>
        </div>
      </header>

      <div className="px-6 space-y-8 max-w-lg mx-auto mt-4">
        {/* Quick Actions */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-4"
        >
          {/* Primary Action - Manual Selection */}
          <Link href="/assets" className="col-span-2">
            <button className="w-full gold-gradient p-8 rounded-3xl shadow-gold flex flex-col items-center justify-center gap-4 group active:scale-95 transition-all">
              <div className="bg-black/20 p-4 rounded-2xl group-hover:scale-110 transition-transform">
                <Package size={48} className="text-primary-foreground" strokeWidth={2.5} />
              </div>
              <div className="text-center">
                <span className="text-2xl font-black tracking-tight text-primary-foreground uppercase block">PINJAM MANUAL</span>
                <span className="text-xs font-bold text-primary-foreground/60 uppercase tracking-widest mt-1 italic">Pilih dari Daftar Aset</span>
              </div>
            </button>
          </Link>

          {/* Secondary Action - QR Scan */}
          <Link href="/scan" className="col-span-2">
            <button className="w-full bg-slate-900 border border-white/10 p-4 rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all hover:bg-slate-800">
              <QrCode size={20} className="text-primary" />
              <span className="text-sm font-bold text-slate-100 uppercase tracking-wider">Scan QR Alternatif</span>
            </button>
          </Link>
        </motion.section>

        {/* My Tools Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <Hammer size={14} className="text-primary" />
              Alat Saya Saat Ini
            </h2>
            <span className="text-[10px] font-bold text-primary px-2 py-0.5 rounded-full glass-panel ring-1 ring-primary/20">
              {activeTools.length} AKTIF
            </span>
          </div>

          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {loading ? (
                <div className="glass-panel p-6 rounded-2xl border border-white/5 animate-pulse h-24" />
              ) : activeTools.length > 0 ? (
                activeTools.map((tool, idx) => (
                  <motion.div
                    key={tool.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    onClick={() => router.push(`/handover/${tool.details.item_id || tool.id.toString().replace('static-', '')}`)}
                    className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center gap-4 relative overflow-hidden group cursor-pointer hover:border-primary/30 hover:shadow-[0_0_15px_rgba(197,160,45,0.1)] transition-all active:scale-[0.98]"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-primary/10 transition-colors" />
                    <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center text-primary">
                      <Package size={24} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-base text-slate-100">{tool.details.item_name}</h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                        Dipinjam {new Date(tool.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <button className="p-2 rounded-lg bg-primary/10 text-primary active:scale-90 transition-transform">
                      <ArrowUpRight size={18} />
                    </button>
                  </motion.div>
                ))
              ) : (
                <div className="glass-panel p-10 rounded-3xl text-center space-y-3 border-dashed border-white/10">
                  <Package size={40} className="mx-auto text-slate-700" />
                  <div>
                    <p className="text-slate-400 text-sm font-bold">Tidak ada alat aktif</p>
                    <p className="text-[11px] text-slate-600 mt-1">Scan QR untuk meminjam peralatan baru.</p>
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* History / Recent Logs */}
        <section className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <History size={14} className="text-primary" />
              Aktivitas Terakhir
            </h2>
            <button className="text-[10px] font-bold text-slate-500 uppercase tracking-wider hover:text-primary transition-colors">
              Lihat Semua
            </button>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="space-y-4">
                {[1, 2].map(i => (
                  <div key={i} className="glass-panel p-5 rounded-3xl border border-white/5 flex gap-4 animate-pulse">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800" />
                    <div className="flex-1 space-y-3">
                      <div className="h-4 bg-slate-800 rounded w-3/4" />
                      <div className="h-3 bg-slate-800 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentLogs.length > 0 ? (
              recentLogs.map((log, idx) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
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
                      <h3 className="font-black text-slate-100 text-sm truncate uppercase tracking-tight">
                        {log.details.item_name}
                      </h3>
                      <span className="text-[10px] text-slate-600 font-bold uppercase tracking-tighter shrink-0 bg-slate-800/50 px-2 py-0.5 rounded-md">
                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-2">
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${log.details.type === 'Pinjam' ? 'bg-amber-500 text-black' : 'bg-emerald-500 text-black'
                        }`}>
                        {log.details.type}
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-500">
                        <User size={10} className="text-slate-600" />
                        <span className="text-[10px] font-bold truncate max-w-[80px]">
                          {log.details.teknisi.split(' ')[0]}
                        </span>
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
              ))
            ) : (
              <div className="glass-panel p-10 rounded-3xl text-center border-dashed border-white/5">
                <History size={32} className="mx-auto text-slate-700 mb-3" />
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Belum ada aktivitas</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Persistent Bottom Nav */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-md glass-panel p-2 rounded-2xl border border-white/10 z-30 flex justify-around shadow-2xl">
        <Link href="/scan" className="flex-1">
          <button className="w-full p-3 text-primary flex flex-col items-center gap-1">
            <QrCode size={20} />
            <span className="text-[9px] font-bold uppercase tracking-tighter">Scan</span>
          </button>
        </Link>
        <Link href="/assets" className="flex-1">
          <button className="w-full p-3 text-slate-500 flex flex-col items-center gap-1 hover:text-primary transition-colors">
            <Package size={20} />
            <span className="text-[9px] font-bold uppercase tracking-tighter">Aset</span>
          </button>
        </Link>
        <Link href="/logs" className="flex-1">
          <button className="w-full p-3 text-slate-500 flex flex-col items-center gap-1 hover:text-primary transition-colors">
            <History size={20} />
            <span className="text-[9px] font-bold uppercase tracking-tighter">Logs</span>
          </button>
        </Link>
      </nav>
    </main>
  );
}

