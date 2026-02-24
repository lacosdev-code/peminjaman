'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { getAllAssets } from '@/services/supabase';
import {
    Package,
    Search,
    ChevronRight,
    ChevronLeft,
    RefreshCw,
    AlertTriangle,
    Wrench,
    CheckCircle2,
    XCircle,
    QrCode,
    History,
    User,
    LogOut,
    Home
} from 'lucide-react';
import Link from 'next/link';
import Swal from 'sweetalert2';

interface Asset {
    id: number;
    nama: string;
    kategori?: string;
    satuan?: string;
    jumlah_tersedia: number;
    jumlah_total?: number;
    lokasi?: string;
    kondisi?: string;
}

export default function AssetsPage() {
    const router = useRouter();
    const [assets, setAssets] = useState<Asset[]>([]);
    const [filtered, setFiltered] = useState<Asset[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

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

    const fetchAssets = async (showRefresh = false) => {
        if (showRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        const data = await getAllAssets();
        if (data) {
            setAssets(data);
            setFiltered(data);
        } else {
            setError('Gagal memuat data aset. Periksa koneksi Anda.');
        }
        setLoading(false);
        setRefreshing(false);
    };

    useEffect(() => {
        const techData = localStorage.getItem('sgd_technician');
        if (!techData) {
            router.push('/login');
            return;
        }
        fetchAssets();
    }, [router]);

    useEffect(() => {
        const q = search.toLowerCase();
        setFiltered(
            assets.filter(a =>
                a.nama?.toLowerCase().includes(q) ||
                a.kategori?.toLowerCase().includes(q) ||
                a.lokasi?.toLowerCase().includes(q)
            )
        );
    }, [search, assets]);

    const getStatusInfo = (asset: Asset) => {
        if (asset.jumlah_tersedia <= 0)
            return { label: 'Habis', color: 'text-rose-600', bg: 'bg-rose-100 ring-rose-200', icon: <XCircle size={12} className="shrink-0" /> };
        if (asset.jumlah_tersedia <= 2)
            return { label: 'Terbatas', color: 'text-amber-600', bg: 'bg-amber-100 ring-amber-200', icon: <AlertTriangle size={12} className="shrink-0" /> };
        return { label: 'Tersedia', color: 'text-emerald-600', bg: 'bg-emerald-100 ring-emerald-200', icon: <CheckCircle2 size={12} className="shrink-0" /> };
    };

    return (
        <main className="min-h-screen bg-background text-foreground pb-10 relative overflow-x-hidden">
            {/* Dynamic Background Blobs */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[120px] animate-blob" />
                <div className="absolute bottom-[20%] right-[-10%] w-[50%] h-[50%] bg-sgd-600/5 rounded-full blur-[100px] animate-blob" style={{ animationDelay: '2s' }} />
            </div>

            {/* Scrollable Content Wrapper */}
            <div style={{ paddingBottom: '160px' }}>
                {/* Header & Search Group (Sticky) */}
                <div
                    style={{ paddingTop: 'var(--safe-top)' }}
                    className="sticky top-0 z-30 pb-4 px-6 bg-background/40 backdrop-blur-xl border-b border-black/5"
                >
                    <header className="flex items-center justify-between mb-6 max-w-lg mx-auto">
                        <Link href="/">
                            <button className="p-3 rounded-2xl bg-black/5 border border-black/10 text-slate-400 hover:text-slate-800 hover:bg-slate-200/50 active:scale-95 transition-all shadow-sm group">
                                <ChevronLeft size={20} className="transition-transform group-hover:-translate-x-0.5" />
                            </button>
                        </Link>
                        <div className="text-center flex-1 mx-4">
                            <p className="text-[10px] font-black tracking-[0.3em] text-primary uppercase mb-1 drop-shadow-sm">CARI PERALATAN</p>
                            <h1 className="font-black text-2xl text-slate-800 tracking-tighter leading-none">Daftar Aset</h1>
                        </div>
                        <button
                            onClick={() => fetchAssets(true)}
                            disabled={refreshing}
                            className="p-3 rounded-2xl bg-black/5 border border-black/10 text-slate-400 hover:text-slate-800 hover:bg-slate-200/50 active:scale-95 transition-all shadow-sm group"
                        >
                            <RefreshCw size={20} className={`${refreshing ? 'animate-spin text-primary' : ''}`} />
                        </button>
                    </header>

                    {/* Search Bar */}
                    <div className="relative group max-w-lg mx-auto">
                        <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"></div>
                        <div className="relative flex items-center bg-white border border-black/10 rounded-2xl shadow-xl ring-4 ring-transparent group-focus-within:ring-primary/10 group-focus-within:border-primary/30 transition-all overflow-hidden z-10">
                            <div className="pl-4 pr-3 text-slate-400 group-focus-within:text-primary transition-colors">
                                <Search size={18} strokeWidth={2.5} />
                            </div>
                            <input
                                type="search"
                                placeholder="Ketik nama alat atau kategori..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full py-4 pr-4 bg-transparent text-slate-800 text-sm font-bold focus:outline-none placeholder:text-slate-600 truncate"
                            />
                            {search && (
                                <button onClick={() => setSearch('')} className="pr-4 text-slate-600 hover:text-slate-400 transition-colors">
                                    <XCircle size={16} strokeWidth={2.5} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="px-6 pt-6 space-y-4 max-w-lg mx-auto relative z-10">
                    {/* Summary Row */}
                    {!loading && assets.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center justify-between px-1 mb-2"
                        >
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-black/5 shadow-sm px-3 py-1.5 rounded-full border border-black/5">
                                {filtered.length} DARI {assets.length} ASET
                            </span>
                            <div className="flex gap-2 text-[9px] font-black uppercase tracking-widest">
                                <span className="bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20 px-2 py-1.5 rounded-lg shadow-sm">
                                    {assets.filter(a => a.jumlah_tersedia > 0).length} TERSEDIA
                                </span>
                                <span className="bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20 px-2 py-1.5 rounded-lg shadow-sm">
                                    {assets.filter(a => a.jumlah_tersedia <= 0).length} HABIS
                                </span>
                            </div>
                        </motion.div>
                    )}

                    <AnimatePresence mode="popLayout">
                        {loading ? (
                            // Light Skeleton Loader
                            [...Array(6)].map((_, i) => (
                                <motion.div
                                    key={`skeleton-${i}`}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="bg-black/5 p-5 rounded-[24px] border border-black/5 flex gap-5 overflow-hidden relative"
                                >
                                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-black/5 to-transparent z-10" />
                                    <div className="w-14 h-14 rounded-2xl bg-black/5 shrink-0" />
                                    <div className="flex-1 space-y-3 py-1">
                                        <div className="flex gap-2">
                                            <div className="h-4 bg-black/5 rounded-full w-24" />
                                            <div className="h-4 bg-black/5 rounded-full w-12" />
                                        </div>
                                        <div className="h-5 bg-black/5 rounded-lg w-3/4" />
                                        <div className="h-4 bg-black/10 rounded-md w-1/2" />
                                    </div>
                                </motion.div>
                            ))
                        ) : error ? (
                            // Error State
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-rose-50 p-10 rounded-[2rem] text-center space-y-5 border border-rose-200 shadow-sm"
                            >
                                <div className="w-20 h-20 mx-auto bg-white rounded-full flex items-center justify-center text-rose-500 shadow-sm mb-2">
                                    <AlertTriangle size={32} />
                                </div>
                                <h3 className="text-lg font-black text-rose-600">Terjadi Kesalahan</h3>
                                <p className="text-slate-600 text-sm font-medium leading-relaxed">{error}</p>
                                <button
                                    onClick={() => fetchAssets()}
                                    className="bg-rose-500 hover:bg-rose-600 text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-colors shadow-md active:scale-95"
                                >
                                    Muat Ulang
                                </button>
                            </motion.div>
                        ) : filtered.length === 0 ? (
                            // Empty State
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white p-12 rounded-[2.5rem] text-center space-y-4 border border-slate-100 shadow-sm mt-8"
                            >
                                <div className="w-24 h-24 mx-auto rounded-[2rem] bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mb-6">
                                    <Search size={40} />
                                </div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">Tidak Ditemukan</h3>
                                <p className="text-sm text-slate-400 font-medium pb-2">Tidak ada aset yang cocok dengan "{search}". Coba kata kunci lain.</p>
                                <button
                                    onClick={() => setSearch('')}
                                    className="text-sgd-600 text-xs font-black uppercase tracking-widest hover:text-sgd-500 hover:underline transition-all"
                                >
                                    Hapus Pencarian
                                </button>
                            </motion.div>
                        ) : (
                            // Asset List
                            <div className="space-y-5 pb-10">
                                {filtered.map((asset, idx) => {
                                    const status = getStatusInfo(asset);
                                    const isAvailable = asset.jumlah_tersedia > 0;

                                    return (
                                        <motion.div
                                            key={asset.id}
                                            initial={{ opacity: 0, y: 15 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.03, ease: 'easeOut' }}
                                        >
                                            <button
                                                onClick={() => router.push(`/handover/${asset.id}`)}
                                                className={`relative w-full group overflow-hidden cursor-pointer active:scale-[0.98] transition-all duration-300 transform-gpu ${!isAvailable ? 'opacity-60 grayscale-[0.5]' : ''}`}
                                            >
                                                <div className={`glass-card p-5 rounded-[28px] flex items-center gap-5 relative z-10 border border-black/5 hover:border-primary/40 shadow-premium active:bg-white/[0.02]`}
                                                >
                                                    {/* Icon Container */}
                                                    <div className={`w-16 h-16 rounded-[22px] flex items-center justify-center shrink-0 border transition-all duration-300 ${isAvailable
                                                        ? 'bg-white text-primary shadow-sm group-hover:bg-primary group-hover:text-primary-foreground border-black/10 group-hover:border-primary'
                                                        : 'bg-black/5 border-black/5 text-slate-400'
                                                        }`}
                                                    >
                                                        {asset.kategori?.toLowerCase().includes('tangga') || asset.nama?.toLowerCase().includes('tangga') ? (
                                                            <Wrench size={28} strokeWidth={2.5} />
                                                        ) : (
                                                            <Package size={28} strokeWidth={2.5} />
                                                        )}
                                                    </div>

                                                    {/* Details */}
                                                    <div className="flex-1 min-w-0 text-left py-1">
                                                        {/* Top Row: Category & Status */}
                                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                            <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ring-1 shadow-sm ${status.color.replace('rose-600', 'rose-400').replace('amber-600', 'amber-400').replace('emerald-600', 'emerald-400')} ${status.bg.replace('rose-100', 'rose-500/10').replace('amber-100', 'amber-500/10').replace('emerald-100', 'emerald-500/10')} ${status.bg.replace('ring-rose-200', 'ring-rose-500/20').replace('ring-amber-200', 'ring-amber-500/20').replace('ring-emerald-200', 'ring-emerald-500/20')}`}>
                                                                {status.icon}
                                                                {status.label}
                                                            </span>

                                                            {asset.kategori && (
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-black/5 px-2.5 py-1 rounded-lg border border-black/5 truncate max-w-[100px]">
                                                                    {asset.kategori}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Title */}
                                                        <h3 className={`font-black text-lg truncate mb-1.5 leading-tight ${isAvailable ? 'text-slate-800' : 'text-slate-400'}`}>
                                                            {asset.nama}
                                                        </h3>

                                                        {/* Bottom Row: Stock & Location */}
                                                        <div className="flex items-center gap-x-4 gap-y-1 text-[12px] font-bold flex-wrap">
                                                            <span className={`${isAvailable ? 'text-primary' : 'text-slate-600'}`}>
                                                                {asset.jumlah_tersedia} <span className="text-slate-400 font-medium ml-1">{asset.satuan || 'Pcs'}</span>
                                                            </span>

                                                            {asset.lokasi && (
                                                                <span className="text-slate-400 flex items-center gap-2 truncate max-w-[120px]">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-700 animate-pulse"></span>
                                                                    {asset.lokasi}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Action Arrow */}
                                                    <div className={`p-2 rounded-xl bg-black/5 text-slate-400 transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:translate-x-1 group-hover:shadow-gold ${!isAvailable ? 'opacity-0' : ''}`}>
                                                        <ChevronRight size={20} strokeWidth={3} />
                                                    </div>
                                                </div>
                                            </button>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div> {/* End Scrollable Content Wrapper */}

            {/* Floating Bottom Dock */}
            <div
                style={{ bottom: 'calc(2rem + var(--safe-bottom))' }}
                className="fixed left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-[400px] z-50"
            >
                <nav className="bg-white p-3 rounded-[32px] flex items-center justify-between border border-slate-200 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)]">
                    <Link href="/scan" className="flex-1">
                        <div className="flex flex-col items-center gap-1 py-2 text-slate-700 group-active:scale-90 transition-all hover:text-slate-900">
                            <QrCode size={22} strokeWidth={2.5} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 group-hover:text-slate-900">Scan</span>
                        </div>
                    </Link>
                    <Link href="/assets" className="flex-1 group">
                        <div className="flex flex-col items-center gap-1 py-2.5 rounded-2xl bg-primary text-white shadow-gold scale-105 active:scale-95 transition-all outline-none">
                            <Package size={20} strokeWidth={3} />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Semua</span>
                        </div>
                    </Link>
                    <Link href="/personal-assets" className="flex-1 group">
                        <div className="flex flex-col items-center gap-1 py-2 text-slate-700 group-active:scale-90 transition-all hover:text-slate-900">
                            <Wrench size={22} strokeWidth={2.5} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 group-hover:text-slate-900">Toolkit</span>
                        </div>
                    </Link>
                    <Link href="/" className="flex-1 group">
                        <div className="flex flex-col items-center gap-1 py-2 text-slate-700 group-active:scale-90 transition-all hover:text-slate-900">
                            <Home size={22} strokeWidth={2.5} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 group-hover:text-slate-900">Beranda</span>
                        </div>
                    </Link>
                </nav>
            </div>
        </main>
    );
}
