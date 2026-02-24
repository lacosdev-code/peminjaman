'use client';

import { useEffect, useState } from 'react';
import { supabase, updateAssetKondisi } from '@/services/supabase';
import {
  QrCode,
  Package,
  History,
  User,
  Hammer,
  ArrowUpRight,
  ArrowDownLeft,
  Settings,
  Bell,
  LogOut,
  Briefcase,
  Wrench,
  Home,
  X,
  ChevronRight,
  Tag,
  Layers,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Skull,
  RefreshCw
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
  const [assignedAssets, setAssignedAssets] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [technicianName, setTechnicianName] = useState('');
  const [technicianId, setTechnicianId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingKondisi, setPendingKondisi] = useState<string | null>(null);

  const closeModal = () => { setSelectedAsset(null); setPendingKondisi(null); };
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
      background: '#ffffff',
      color: '#0f172a',
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
      background: '#ffffff',
      color: '#0f172a',
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
    setTechnicianId(tech.id || null);
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
    // Read tech data fresh from localStorage, not from potentially-stale state
    const techDataRaw = localStorage.getItem('sgd_technician');
    if (!techDataRaw) return;
    const techData = JSON.parse(techDataRaw);
    const currentName = techData.name;
    const currentId = techData.id || null;
    if (!currentName) return;

    try {
      // 1. Fetch recent activity logs for this technician (for the "Aktivitas Terbaru" list)
      const { data: logsData, error: logsError } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('details->>teknisi', currentName)
        .order('created_at', { ascending: false })
        .limit(10);

      if (logsError) throw logsError;
      setRecentLogs(logsData || []);
      localStorage.setItem(CACHE_KEY_LOGS, JSON.stringify(logsData || []));

      // 2. Fetch Active Items directly from the `peminjaman` table
      const { data: activeLoans, error: activeError } = await supabase
        .from('peminjaman')
        .select('*, inventaris_utama(*)')
        .eq('status', 'Dipinjam')
        .ilike('peminjam', `%${currentName}%`);

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
                teknisi: currentName,
                condition: loan.kondisi_awal || 'Baik'
              }
            };
          }
        });
      }

      // 3. Official Source: Fetch assets permanently assigned to this technician
      // Real columns in inventaris_orang: id, orang, nama, jumlah, kondisi, keterangan, foto_url, technician_id
      const COLS = 'id, nama, orang, jumlah, kondisi, keterangan, foto_url, technician_id';
      if (currentId || currentName) {
        // Try RPC first
        const { data: rpcAssets, error: rpcError } = currentId
          ? await supabase.rpc('get_assigned_assets', { p_tech_id: currentId })
          : { data: null, error: new Error('no id') };

        if (!rpcError && rpcAssets && rpcAssets.length > 0) {
          setAssignedAssets(rpcAssets.map((asset: any) => ({
            id: asset.id,
            nama: asset.nama_barang || asset.nama || '',
            kondisi: asset.kondisi,
            foto_url: asset.foto_url || ''
          })));
        } else {
          let assigned: any[] = [];

          // Fallback 1: by technician_id
          if (currentId) {
            const { data: byId, error: idErr } = await supabase
              .from('inventaris_orang')
              .select(COLS)
              .eq('technician_id', currentId);
            if (idErr) console.error('Fallback ID error:', idErr.message);
            assigned = byId || [];
            console.log('Fallback by ID result:', assigned.length, 'rows');
          }

          // Fallback 2: by name in 'orang' column
          if (assigned.length === 0 && currentName) {
            const { data: byName, error: nameErr } = await supabase
              .from('inventaris_orang')
              .select(COLS)
              .ilike('orang', `%${currentName}%`);
            if (nameErr) console.error('Fallback name error:', nameErr.message);
            assigned = byName || [];
            console.log('Fallback by name result:', assigned.length, 'rows');
          }

          setAssignedAssets(assigned.map((a: any) => ({
            id: a.id,
            nama: a.nama || '',
            kondisi: a.kondisi || '',
            foto_url: a.foto_url || '',
            keterangan: a.keterangan || '',
            jumlah: a.jumlah || 1,
          })));
        }
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
    if (technicianName && technicianId) {
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
  }, [technicianName, technicianId]);

  return (
    <main className="min-h-screen bg-background text-foreground pb-10 relative overflow-x-hidden">
      {/* Dynamic Background Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] animate-blob" />
        <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-sgd-600/5 rounded-full blur-[100px] animate-blob" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-primary/5 rounded-full blur-[80px] animate-blob" style={{ animationDelay: '4s' }} />
      </div>

      {/* Scrollable Content Wrapper */}
      <div style={{ paddingBottom: '160px' }}>
        {/* Top Bar */}
        <header
          style={{ paddingTop: 'calc(2rem + var(--safe-top))' }}
          className="px-6 pb-4 flex items-center justify-between sticky top-0 bg-background/40 backdrop-blur-xl z-30 border-b border-black/5"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-black/5 overflow-hidden gold-gradient flex items-center justify-center text-primary-foreground font-bold shadow-gold">
              {avatarUrl ? (
                <img src={avatarUrl} alt={technicianName} className="w-full h-full object-cover" />
              ) : (
                technicianName.charAt(0)
              )}
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Selamat Bekerja,</p>
              <h1 className="font-bold text-lg">{technicianName}</h1>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-black/10 shadow-sm">
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
              <LogOut size={20} className="text-rose-400" />
            </button>
          </div>
        </header>

        <div className="px-6 space-y-10 max-w-lg mx-auto mt-6 relative z-10">
          {/* Quick Actions */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 gap-5"
          >
            {/* Primary Action - Manual Selection */}
            <Link href="/assets" className="col-span-2">
              <button className="w-full gold-gradient p-10 rounded-[32px] shadow-gold flex flex-col items-center justify-center gap-5 group active:scale-95 transition-all relative overflow-hidden">
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="bg-black/20 p-5 rounded-3xl group-hover:scale-110 transition-transform shadow-inner">
                  <Package size={56} className="text-primary-foreground" strokeWidth={2.5} />
                </div>
                <div className="text-center">
                  <span className="text-3xl font-black tracking-tighter text-primary-foreground uppercase block leading-none">PINJAM MANUAL</span>
                  <span className="text-[10px] font-black text-primary-foreground/50 uppercase tracking-[0.3em] mt-2 block">Pilih dari Daftar Aset</span>
                </div>
              </button>
            </Link>

            {/* Secondary Action - QR Scan */}
            <Link href="/scan" className="col-span-1">
              <button className="w-full glass-card p-5 rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-all hover:bg-black/5 border-black/10 h-full">
                <QrCode size={24} className="text-primary animate-pulse" />
                <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest leading-none text-center">Scan QR<br />Cepat</span>
              </button>
            </Link>

            {/* Tertiary Action - Personal Assets */}
            <Link href="/personal-assets" className="col-span-1">
              <button className="w-full glass-card p-5 rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-all hover:bg-black/5 border-black/10 h-full relative overflow-hidden group">
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Wrench size={24} className="text-primary" />
                <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest leading-none text-center relative z-10">Toolkit<br />Pribadi</span>
              </button>
            </Link>
          </motion.section>

          {/* --- BAGIAN ASET PERSONEL (TOOLKIT) --- */}
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <span className="text-sgd-500">🧰</span>
                  Kotak Perkakas {technicianName ? technicianName.split(' ')[0] : 'Saya'}
                </h2>
                <p className="text-[10px] text-slate-400 mt-0.5 pl-5">Peralatan yang ditugaskan kepada Anda</p>
              </div>
              <Link href="/personal-assets">
                <div className="flex items-center gap-1 text-primary text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-primary/5 border border-primary/20 hover:bg-primary/10 active:scale-95 transition-all">
                  Lihat Semua
                  <ChevronRight size={12} strokeWidth={3} />
                </div>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {loading ? (
                <div className="glass-panel p-6 rounded-2xl border border-black/5 animate-pulse h-24" />
              ) : assignedAssets.length > 0 ? (
                assignedAssets.map((item, idx) => (
                  <motion.button
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    onClick={() => setSelectedAsset(item)}
                    className="w-full text-left bg-slate-100/50 backdrop-blur-sm border border-black/5 rounded-2xl p-4 flex gap-4 items-center shadow-premium hover:border-primary/20 hover:bg-primary/5 active:scale-[0.98] transition-all group"
                  >
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-white border border-black/10 shrink-0 flex items-center justify-center text-primary">
                      {item.foto_url ? (
                        <img src={item.foto_url} alt={item.nama_barang || item.nama} className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-2xl">🔧</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h3 className="text-slate-800 font-bold truncate pr-2">{item.nama_barang || item.nama}</h3>
                        {item.jumlah > 1 && (
                          <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md border border-black/10 shrink-0">
                            {item.jumlah}x
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{item.kode_alat || item.keterangan || '-'}</p>
                      <div className="mt-2 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md w-fit bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {item.kondisi || 'Baik'}
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-primary transition-colors shrink-0" />
                  </motion.button>
                ))
              ) : (
                <div className="bg-slate-100/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 text-center col-span-1 md:col-span-2 block w-full">
                  <p className="text-slate-400 text-sm">Belum ada alat permanen.</p>
                </div>
              )}
            </div>
          </section>

          {/* My Tools Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
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
                  <div className="glass-panel p-6 rounded-2xl border border-black/5 animate-pulse h-24" />
                ) : activeTools.length > 0 ? (
                  activeTools.map((tool, idx) => (
                    <motion.div
                      key={tool.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      onClick={() => router.push(`/handover/${tool.details.item_id || tool.id.toString().replace('static-', '')}`)}
                      className="glass-card p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden group cursor-pointer hover:border-primary/40 shadow-premium active:scale-[0.98]"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-primary/10 transition-colors" />
                      <div className="w-14 h-14 rounded-2xl bg-white border border-black/10 flex items-center justify-center text-primary relative z-10">
                        <Package size={28} strokeWidth={2.5} />
                      </div>
                      <div className="flex-1 relative z-10">
                        <h3 className="font-black text-slate-800 text-lg tracking-tight leading-tight">{tool.details.item_name}</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                          Terpakai • {new Date(tool.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-primary shadow-gold text-primary-foreground group-hover:translate-x-1 transition-transform">
                        <ArrowUpRight size={20} strokeWidth={3} />
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="glass-panel p-10 rounded-3xl text-center space-y-3 border-dashed border-black/10">
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
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <History size={14} className="text-primary" />
                Aktivitas Terakhir
              </h2>
              <button className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hover:text-primary transition-colors">
                Lihat Semua
              </button>
            </div>

            <div className="space-y-4">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2].map(i => (
                    <div key={i} className="glass-panel p-5 rounded-3xl border border-black/5 flex gap-4 animate-pulse">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100" />
                      <div className="flex-1 space-y-3">
                        <div className="h-4 bg-slate-100 rounded w-3/4" />
                        <div className="h-3 bg-slate-100 rounded w-1/2" />
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
                    className="glass-card p-5 rounded-[24px] flex gap-4 relative group hover:border-primary/20 transition-all active:scale-[0.98]"
                  >
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${log.details.type === 'Pinjam'
                      ? 'bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20'
                      }`}>
                      {log.details.type === 'Pinjam' ? <ArrowUpRight size={24} strokeWidth={3} /> : <ArrowDownLeft size={24} strokeWidth={3} />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1.5">
                        <h3 className="font-black text-slate-800 text-sm truncate uppercase tracking-tight">
                          {log.details.item_name}
                        </h3>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter shrink-0">
                          {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <div className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-[0.1em] ${log.details.type === 'Pinjam' ? 'bg-amber-500 text-black' : 'bg-emerald-500 text-black'
                          }`}>
                          {log.details.type}
                        </div>

                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/5 border border-black/5">
                          <User size={10} className="text-slate-400" />
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            {log.details.teknisi.split(' ')[0]}
                          </span>
                        </div>

                        <div className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-[0.1em] border ${log.details.condition === 'Baik' || log.details.condition === 'Bagus'
                          ? 'border-emerald-500/30 text-emerald-500'
                          : 'border-rose-500/30 text-rose-500'
                          }`}>
                          {log.details.condition}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="glass-panel p-10 rounded-3xl text-center border-dashed border-black/5">
                  <History size={32} className="mx-auto text-slate-700 mb-3" />
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Belum ada aktivitas</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div> {/* End Scrollable Content Wrapper */}

      {/* Floating Bottom Dock */}
      <div
        style={{ bottom: 'calc(2rem + var(--safe-bottom))' }}
        className="fixed left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-[400px] z-50"
      >
        <nav className="bg-white p-3 rounded-[32px] flex items-center justify-between border border-slate-200 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)]">
          <Link href="/scan" className="flex-1">
            <div className="flex flex-col items-center gap-1 py-2.5 rounded-2xl bg-primary text-white shadow-gold scale-105 active:scale-95 transition-all outline-none">
              <QrCode size={20} strokeWidth={3} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Scan</span>
            </div>
          </Link>
          <Link href="/assets" className="flex-1 group">
            <div className="flex flex-col items-center gap-1 py-2 text-slate-700 group-active:scale-90 transition-all hover:text-slate-900">
              <Package size={22} strokeWidth={2.5} />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 group-hover:text-slate-900">Semua</span>
            </div>
          </Link>
          <Link href="/personal-assets" className="flex-1 group">
            <div className="flex flex-col items-center gap-1 py-2 text-slate-700 group-active:scale-90 transition-all hover:text-slate-900">
              <Wrench size={22} strokeWidth={2.5} />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 group-hover:text-slate-900">Toolkit</span>
            </div>
          </Link>
          <Link href="/" className="flex-1 group">
            <div className="flex flex-col items-center gap-1 py-2 text-primary group-active:scale-90 transition-all hover:text-primary/80">
              <Home size={22} strokeWidth={2.5} />
              <span className="text-[10px] font-black uppercase tracking-widest text-primary group-hover:text-primary/80">Beranda</span>
            </div>
          </Link>
        </nav>
      </div>

      {/* === ASSET DETAIL BOTTOM SHEET === */}
      <AnimatePresence>
        {selectedAsset && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
            />

            {/* Sheet */}
            <motion.div
              key="sheet"
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] z-[70] shadow-2xl flex flex-col"
              style={{ maxHeight: '88vh', paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
            >
              {/* Handle Bar — outside scroll */}
              <div className="pt-4 pb-2 flex flex-col items-center shrink-0">
                <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
              </div>

              {/* Header — outside scroll */}
              <div className="flex items-start justify-between px-6 pb-4 shrink-0">
                <div className="flex-1 min-w-0 pr-4">
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Detail Perkakas</p>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tighter leading-tight">
                    {selectedAsset.nama_barang || selectedAsset.nama}
                  </h2>
                </div>
                <button
                  onClick={closeModal}
                  className="p-2.5 rounded-2xl bg-slate-100 border border-slate-200 text-slate-500 active:scale-90 transition-transform shrink-0"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="overflow-y-auto flex-1 px-6 pb-6 space-y-3">
                {/* Photo */}
                {selectedAsset.foto_url && (
                  <div className="w-full h-48 rounded-2xl overflow-hidden border border-black/10 mb-6 bg-slate-100">
                    <img src={selectedAsset.foto_url} alt={selectedAsset.nama_barang || selectedAsset.nama} className="w-full h-full object-cover" />
                  </div>
                )}

                {/* Keterangan */}
                {selectedAsset.keterangan && (
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText size={12} className="text-primary" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Keterangan</span>
                    </div>
                    <p className="text-slate-600 text-sm font-medium leading-relaxed">
                      {selectedAsset.keterangan}
                    </p>
                  </div>
                )}

                {/* Kondisi Picker */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Layers size={12} className="text-primary" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Kondisi Alat</span>
                  </div>

                  {/* Compact pill buttons */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {[
                      { value: 'baik', label: 'Baik', icon: CheckCircle2, color: 'emerald' },
                      { value: 'rusak ringan', label: 'Rusak Ringan', icon: AlertTriangle, color: 'amber' },
                      { value: 'rusak', label: 'Rusak Berat', icon: Skull, color: 'rose' },
                    ].map(({ value, label, icon: Icon, color }) => {
                      const current = selectedAsset.kondisi?.toLowerCase();
                      const isSelected = (pendingKondisi ?? current) === value;
                      return (
                        <button
                          key={value}
                          disabled={isUpdating}
                          onClick={() => setPendingKondisi(value === current ? null : value)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-full border-2 text-xs font-black tracking-wide transition-all active:scale-95 disabled:opacity-50 ${isSelected
                            ? color === 'emerald' ? 'border-emerald-500 bg-emerald-500 text-white'
                              : color === 'amber' ? 'border-amber-500 bg-amber-500 text-white'
                                : 'border-rose-500 bg-rose-500 text-white'
                            : 'border-slate-200 bg-white text-slate-500'
                            }`}
                        >
                          <Icon size={12} strokeWidth={isSelected ? 3 : 2} />
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Simpan button — hanya muncul kalau ada perubahan */}
                  {pendingKondisi && pendingKondisi !== selectedAsset.kondisi?.toLowerCase() && (
                    <motion.button
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      disabled={isUpdating}
                      onClick={async () => {
                        setIsUpdating(true);
                        const result = await updateAssetKondisi(selectedAsset.id, pendingKondisi);
                        if (result.success) {
                          const updated = { ...selectedAsset, kondisi: pendingKondisi };
                          setSelectedAsset(updated);
                          setAssignedAssets(prev => prev.map((a: any) => a.id === updated.id ? updated : a));
                          setPendingKondisi(null);
                          Swal.fire({ icon: 'success', title: 'Tersimpan!', text: `Kondisi diubah ke ${pendingKondisi}`, timer: 1500, showConfirmButton: false });
                        } else {
                          Swal.fire({ icon: 'error', title: 'Gagal', text: result.message, confirmButtonColor: '#C5A02D' });
                        }
                        setIsUpdating(false);
                      }}
                      className="w-full py-3 rounded-2xl bg-primary text-white font-black text-sm tracking-wide flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50"
                    >
                      {isUpdating ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                      {isUpdating ? 'Menyimpan...' : 'Simpan Kondisi'}
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}

