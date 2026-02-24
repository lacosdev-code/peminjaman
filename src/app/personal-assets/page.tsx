'use client';

import { useEffect, useState } from 'react';
import { getAssignedAssets, updateAssetKondisi } from '@/services/supabase';
import {
    Package,
    History,
    QrCode,
    ArrowLeft,
    Settings,
    User,
    LogOut,
    Wrench,
    Home,
    X,
    Tag,
    Layers,
    FileText,
    ChevronRight,
    CheckCircle2,
    AlertTriangle,
    Skull,
    RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

export default function PersonalAssetsPage() {
    const [assets, setAssets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [technicianName, setTechnicianName] = useState('');
    const [technicianId, setTechnicianId] = useState<string | null>(null);
    const router = useRouter();

    // Highlight specific items briefly to show interaction
    const [selectedAsset, setSelectedAsset] = useState<any | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [pendingKondisi, setPendingKondisi] = useState<string | null>(null);

    const closeModal = () => { setSelectedAsset(null); setPendingKondisi(null); };

    useEffect(() => {
        const techData = localStorage.getItem('sgd_technician');
        if (!techData) {
            router.push('/login');
            return;
        }
        const tech = JSON.parse(techData);
        setTechnicianName(tech.name);
        setTechnicianId(tech.id || null);
    }, [router]);

    useEffect(() => {
        async function fetchAssets() {
            if (!technicianId && !technicianName) return;
            try {
                const data = await getAssignedAssets(technicianId || '', technicianName);
                setAssets(data || []);
            } catch (error) {
                console.error('Error fetching personal assets:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchAssets();
    }, [technicianId, technicianName]);

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

    const conditionColors: Record<string, string> = {
        'Baik': 'text-emerald-500 border-emerald-500/30',
        'Bagus': 'text-emerald-500 border-emerald-500/30',
        'Rusak Ringan': 'text-amber-500 border-amber-500/30',
        'Rusak Berat': 'text-rose-500 border-rose-500/30',
        'Hilang': 'text-slate-400 border-slate-500/30',
    };

    return (
        <main className="min-h-screen bg-background text-foreground pb-10 relative overflow-x-hidden">
            {/* Background Blobs */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-sgd-600/10 rounded-full blur-[100px]" />
            </div>

            {/* Scrollable Content Wrapper */}
            <div style={{ paddingBottom: '160px' }}>
                {/* Header */}
                <header
                    style={{ paddingTop: 'calc(1.5rem + var(--safe-top))' }}
                    className="px-6 pb-4 sticky top-0 bg-background/60 backdrop-blur-xl z-30 border-b border-black/5 flex items-center justify-between"
                >
                    <Link href="/">
                        <button className="p-2 rounded-full glass-panel active:scale-95 transition-transform hover:bg-black/5">
                            <ArrowLeft size={20} className="text-slate-600" />
                        </button>
                    </Link>
                    <div className="text-center">
                        <h1 className="font-black text-lg text-slate-800 tracking-tight">Daftar Perkakas Lengkap</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Semua Peralatan Ditugaskan</p>
                    </div>
                    <div className="w-10" /> {/* Spacer for centering */}
                </header>

                <div className="px-6 pt-6 space-y-4 max-w-lg mx-auto relative z-10">
                    <div className="glass-panel p-5 rounded-[24px] border-primary/20 bg-primary/5 flex items-start gap-4 mb-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />
                        <div className="w-12 h-12 rounded-full gold-gradient shadow-gold flex items-center justify-center shrink-0 text-primary-foreground font-black text-xl">
                            <Wrench size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="font-bold text-base text-slate-800 mb-1">Peralatan Permanen Anda</h2>
                            <p className="text-xs text-slate-400 font-medium">Berikut adalah <span className="font-black text-primary">{assets.length} peralatan</span> yang secara resmi ditugaskan kepada <span className="font-black text-slate-600">{technicianName || 'Anda'}</span>. Halaman ini menampilkan daftar lengkap.</p>
                        </div>
                    </div>

                    {/* Asset List */}
                    <div className="space-y-3">
                        <AnimatePresence mode="popLayout">
                            {loading ? (
                                [1, 2, 3, 4].map(i => (
                                    <div key={i} className="glass-panel p-5 rounded-2xl border border-black/5 flex gap-4 animate-pulse">
                                        <div className="w-14 h-14 rounded-xl bg-slate-100 shrink-0" />
                                        <div className="flex-1 space-y-3 w-full">
                                            <div className="h-4 bg-slate-100 rounded w-3/4" />
                                            <div className="h-3 bg-slate-100 rounded w-1/2" />
                                            <div className="flex gap-2">
                                                <div className="h-4 bg-slate-100 rounded-full w-16" />
                                                <div className="h-4 bg-slate-100 rounded-full w-12" />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : assets.length > 0 ? (
                                assets.map((asset, idx) => (
                                    <motion.button
                                        key={asset.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        onClick={() => setSelectedAsset(asset)}
                                        className="w-full text-left glass-card p-5 rounded-[20px] flex gap-4 transition-all overflow-hidden hover:border-primary/20 hover:bg-primary/5 active:scale-[0.98] group"
                                    >
                                        <div className="w-14 h-14 rounded-xl shrink-0 overflow-hidden bg-white border border-black/10 flex items-center justify-center text-primary">
                                            {asset.foto_url ? (
                                                <img src={asset.foto_url} alt={asset.nama} className="w-full h-full object-cover" loading="lazy" />
                                            ) : (
                                                <Package size={24} className="text-slate-600" strokeWidth={1.5} />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <h3 className="font-black text-slate-800 text-sm tracking-tight leading-snug">
                                                    {asset.nama || asset.nama_barang}
                                                </h3>
                                                {asset.jumlah > 1 && (
                                                    <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md border border-black/10 shrink-0">
                                                        {asset.jumlah}x
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-auto flex-wrap">
                                                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${conditionColors[asset.kondisi] || 'text-slate-400 border-slate-200'}`}>
                                                    {asset.kondisi || 'N/A'}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-mono truncate">
                                                    {asset.kode_alat || asset.keterangan || '-'}
                                                </span>
                                            </div>
                                        </div>
                                        <ChevronRight size={16} className="text-slate-300 group-hover:text-primary transition-colors shrink-0 self-center" />
                                    </motion.button>
                                ))
                            ) : (
                                <div className="glass-panel p-10 rounded-3xl text-center border-dashed border-black/5">
                                    <Wrench size={32} className="mx-auto text-slate-700 mb-3" />
                                    <h3 className="font-bold text-slate-600 text-sm mb-1">Belum Ada Aset Terkait</h3>
                                    <p className="text-slate-400 text-xs font-medium">Tidak ada aset permanen yang tercatat atas nama Anda.</p>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
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
                        <div className="flex flex-col items-center gap-1 py-2 text-slate-700 group-active:scale-90 transition-all hover:text-slate-900">
                            <Package size={22} strokeWidth={2.5} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 group-hover:text-slate-900">Semua</span>
                        </div>
                    </Link>
                    <Link href="/personal-assets" className="flex-1 group">
                        <div className="flex flex-col items-center gap-1 py-2.5 rounded-2xl bg-primary text-white shadow-gold scale-105 active:scale-95 transition-all outline-none">
                            <Wrench size={20} strokeWidth={3} />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Toolkit</span>
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
                                        {selectedAsset.nama || selectedAsset.nama_barang}
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
                                        <img src={selectedAsset.foto_url} alt={selectedAsset.nama || selectedAsset.nama_barang} className="w-full h-full object-cover" />
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
                                                    setAssets(prev => prev.map(a => a.id === updated.id ? updated : a));
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
