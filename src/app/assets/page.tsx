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
    XCircle
} from 'lucide-react';
import Link from 'next/link';

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
        <main className="min-h-screen bg-slate-50 text-slate-900 pb-28 font-['Outfit'] selection:bg-sgd-500/30">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-0 -left-1/4 w-[500px] h-[500px] bg-sgd-100 rounded-full mix-blend-multiply filter blur-[100px] opacity-70"></div>
                <div className="absolute bottom-1/4 -right-1/4 w-[600px] h-[600px] bg-amber-100 rounded-full mix-blend-multiply filter blur-[150px] opacity-60"></div>
            </div>

            {/* Header & Search Group (Sticky) */}
            <div className="sticky top-0 z-30 pt-8 pb-4 px-6 bg-white/70 backdrop-blur-2xl border-b border-slate-200/80 shadow-sm">
                <header className="flex items-center justify-between mb-6">
                    <Link href="/">
                        <button className="p-3 rounded-[1rem] bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition-all shadow-sm group">
                            <ChevronLeft size={20} className="text-slate-600 group-hover:text-slate-900 transition-colors" />
                        </button>
                    </Link>
                    <div className="text-center flex-1 mx-4">
                        <p className="text-[9px] font-black tracking-[0.25em] text-sgd-600 uppercase mb-1 drop-shadow-sm">Pilih Alat</p>
                        <h1 className="font-black text-xl text-slate-900 tracking-tight leading-none">Daftar Aset</h1>
                    </div>
                    <button
                        onClick={() => fetchAssets(true)}
                        disabled={refreshing}
                        className="p-3 rounded-[1rem] bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition-all shadow-sm group"
                    >
                        <RefreshCw size={20} className={`text-slate-600 group-hover:text-slate-900 transition-colors ${refreshing ? 'animate-spin text-sgd-500' : ''}`} />
                    </button>
                </header>

                {/* Search Bar */}
                <div className="relative group max-w-lg mx-auto">
                    <div className="absolute inset-0 bg-gradient-to-r from-sgd-200 to-amber-200 rounded-2xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative flex items-center bg-white border border-slate-200 rounded-2xl shadow-sm ring-4 ring-transparent group-focus-within:ring-sgd-100 group-focus-within:border-sgd-300 transition-all overflow-hidden z-10">
                        <div className="pl-4 pr-3 text-slate-400 group-focus-within:text-sgd-500 transition-colors">
                            <Search size={18} />
                        </div>
                        <input
                            type="search"
                            placeholder="Cari nama alat, kategori, lokasi..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full py-4 pr-4 bg-transparent text-slate-800 text-sm font-semibold focus:outline-none placeholder:text-slate-400 truncate"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="pr-4 text-slate-400 hover:text-slate-600 transition-colors">
                                <XCircle size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="px-6 pt-6 pb-6 space-y-4 max-w-lg mx-auto relative z-10">
                {/* Summary Row */}
                {!loading && assets.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between px-1 mb-2"
                    >
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white shadow-sm px-3 py-1.5 rounded-full border border-slate-200">
                            {filtered.length} DARI {assets.length}
                        </span>
                        <div className="flex gap-2 text-[9px] font-black uppercase tracking-widest">
                            <span className="bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 px-2 py-1.5 rounded-lg shadow-sm">
                                {assets.filter(a => a.jumlah_tersedia > 0).length} TERSEDIA
                            </span>
                            <span className="bg-rose-100 text-rose-700 ring-1 ring-rose-200 px-2 py-1.5 rounded-lg shadow-sm">
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
                                className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex gap-5 overflow-hidden relative"
                            >
                                <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-slate-50/50 to-transparent z-10" />
                                <div className="w-14 h-14 rounded-2xl bg-slate-100 shrink-0" />
                                <div className="flex-1 space-y-3 py-1">
                                    <div className="flex gap-2">
                                        <div className="h-4 bg-slate-100 rounded-full w-24" />
                                        <div className="h-4 bg-slate-100 rounded-full w-12" />
                                    </div>
                                    <div className="h-5 bg-slate-100 rounded-lg w-3/4" />
                                    <div className="h-4 bg-slate-100 rounded-md w-1/2" />
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
                            <p className="text-sm text-slate-500 font-medium pb-2">Tidak ada aset yang cocok dengan "{search}". Coba kata kunci lain.</p>
                            <button
                                onClick={() => setSearch('')}
                                className="text-sgd-600 text-xs font-black uppercase tracking-widest hover:text-sgd-500 hover:underline transition-all"
                            >
                                Hapus Pencarian
                            </button>
                        </motion.div>
                    ) : (
                        // Asset List
                        <div className="space-y-4 pb-4">
                            {filtered.map((asset, idx) => {
                                const status = getStatusInfo(asset);
                                const isAvailable = asset.jumlah_tersedia > 0;

                                return (
                                    <motion.div
                                        key={asset.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.03, ease: 'easeOut' }}
                                    >
                                        <button
                                            onClick={() => router.push(`/handover/${asset.id}`)}
                                            className={`relative w-full group overflow-hidden cursor-pointer active:scale-[0.98] transition-all duration-300 transform-gpu ${!isAvailable ? 'opacity-80 grayscale-[0.2]' : ''}`}
                                        >
                                            <div className={`bg-white p-5 rounded-[24px] border transition-all duration-300 flex items-center gap-5 relative z-10 ${isAvailable
                                                ? 'border-slate-200 group-hover:border-sgd-300 group-hover:shadow-[0_12px_40px_-10px_rgba(197,160,45,0.2)]'
                                                : 'border-slate-100 bg-slate-50 shadow-none'
                                                }`}
                                            >
                                                {/* Icon Container bg-slate-50 */}
                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border transition-all duration-300 ${isAvailable
                                                    ? 'bg-slate-50 text-slate-700 border-slate-200 group-hover:text-sgd-600 group-hover:border-sgd-200 group-hover:bg-sgd-50/50'
                                                    : 'bg-slate-100 border-slate-200 text-slate-400'
                                                    }`}
                                                >
                                                    {asset.kategori?.toLowerCase().includes('tangga') || asset.nama?.toLowerCase().includes('tangga') ? (
                                                        <Wrench size={24} strokeWidth={isAvailable ? 2.5 : 2} />
                                                    ) : (
                                                        <Package size={24} strokeWidth={isAvailable ? 2.5 : 2} />
                                                    )}
                                                </div>

                                                {/* Details */}
                                                <div className="flex-1 min-w-0 text-left py-0.5">
                                                    {/* Top Row: Category & Status */}
                                                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                                        <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ring-1 shadow-sm ${status.bg} ${status.color}`}>
                                                            {status.icon}
                                                            <span className="mt-[1px]">{status.label}</span>
                                                        </span>

                                                        {asset.kategori && (
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 truncate max-w-[100px]">
                                                                {asset.kategori}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Title */}
                                                    <h3 className={`font-black text-base truncate mb-1.5 transition-colors ${isAvailable ? 'text-slate-800 group-hover:text-sgd-700' : 'text-slate-500'}`}>
                                                        {asset.nama}
                                                    </h3>

                                                    {/* Bottom Row: Stock & Location */}
                                                    <div className="flex items-center gap-x-4 gap-y-1 text-[11px] font-bold flex-wrap">
                                                        <span className={`${isAvailable ? 'text-sgd-600' : 'text-slate-500'}`}>
                                                            {asset.jumlah_tersedia} <span className="text-slate-500 font-medium ml-0.5">{asset.satuan || 'Pcs'}</span>
                                                        </span>

                                                        {asset.lokasi && (
                                                            <span className="text-slate-500 flex items-center gap-1.5 truncate max-w-[120px]">
                                                                <span className="w-1 h-1 rounded-full bg-slate-400"></span>
                                                                {asset.lokasi}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Action Arrow */}
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${isAvailable
                                                    ? 'bg-slate-100 text-slate-400 group-hover:bg-sgd-500 group-hover:text-white group-hover:scale-110 group-hover:shadow-md'
                                                    : 'opacity-0'
                                                    }`}>
                                                    <ChevronRight size={16} strokeWidth={3} className={isAvailable ? 'group-hover:translate-x-0.5 transition-transform' : ''} />
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
        </main>
    );
}
