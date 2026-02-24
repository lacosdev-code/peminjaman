'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { logToolHandover, getToolDetails } from '@/services/supabase';
import { uploadToImageKit } from '@/services/imagekit';
import Link from 'next/link';
import {
    X,
    Camera,
    Check,
    ChevronRight,
    Info,
    AlertTriangle,
    Loader2,
    Package,
    Wrench,
    ChevronLeft,
    Image as ImageIcon
} from 'lucide-react';

type Step = 'TYPE' | 'CONDITION' | 'PHOTO' | 'NOTES' | 'SUCCESS';
type HandoverType = 'Pinjam' | 'Kembali';
type Condition = 'Baik' | 'Rusak Ringan' | 'Rusak Berat' | 'Hilang';

export default function HandoverPage() {
    const { id } = useParams();
    const router = useRouter();

    const [step, setStep] = useState<Step>('TYPE');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [item, setItem] = useState<any>(null);
    const [technicianName, setTechnicianName] = useState('');
    const [error, setError] = useState<string | null>(null);

    const [type, setType] = useState<HandoverType | null>(null);
    const [condition, setCondition] = useState<Condition | null>(null);
    const [photo, setPhoto] = useState<string | null>(null);
    const [notes, setNotes] = useState('');

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const techData = localStorage.getItem('sgd_technician');
        if (!techData) {
            router.push('/login');
            return;
        }
        setTechnicianName(JSON.parse(techData).name);

        const fetchItem = async () => {
            if (!id) return;

            const data = await getToolDetails(id as string);
            if (data) {
                setItem(data);
            } else {
                setError('Alat tidak ditemukan di database.');
            }
            setLoading(false);
        };
        fetchItem();
    }, [id, router]);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Camera error:", err);
        }
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            if (context) {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
                context.drawImage(videoRef.current, 0, 0);
                const dataUrl = canvasRef.current.toDataURL('image/jpeg');
                setPhoto(dataUrl);
                // Stop camera
                const stream = videoRef.current.srcObject as MediaStream;
                stream?.getTracks().forEach(track => track.stop());
            }
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                setPhoto(event.target.result as string);
                // Stop camera if running
                if (videoRef.current && videoRef.current.srcObject) {
                    const stream = videoRef.current.srcObject as MediaStream;
                    stream.getTracks().forEach(track => track.stop());
                }
            }
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async () => {
        const finalId = id;
        const finalType = type;
        const finalCondition = condition;

        if (!finalId || !finalType || !finalCondition) {
            alert('Mohon lengkapi data serah terima!');
            return;
        }

        setSubmitting(true);
        try {
            let photoUrl = '';

            // 1. Upload to ImageKit if photo exists
            if (photo) {
                const uploadResult = await uploadToImageKit(photo, `handover_${id}_${Date.now()}.jpg`);
                if (uploadResult) {
                    photoUrl = uploadResult.url;
                } else {
                    console.warn("Failed to upload photo to ImageKit, proceeding with empty URL");
                }
            }

            const stringId = Array.isArray(finalId) ? finalId[0] : finalId;
            const result = await logToolHandover({
                item_id: parseInt(stringId),
                teknisi: technicianName,
                tipe: finalType,
                kondisi: finalCondition,
                catatan: notes,
                photo_url: photoUrl
            });

            if (result && result.success) {
                setStep('SUCCESS');
            } else {
                throw new Error(result?.message || 'Gagal memproses serah terima');
            }
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-slate-400 font-bold tracking-widest text-xs uppercase italic">Mengambil Data Alat...</p>
        </div>
    );

    return (
        <main className="min-h-screen bg-background text-foreground pb-12 flex flex-col relative overflow-hidden">
            {/* Dynamic Background Blobs */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] animate-blob" />
                <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-sgd-600/5 rounded-full blur-[100px] animate-blob" style={{ animationDelay: '2s' }} />
            </div>

            {/* Header */}
            <header
                style={{ paddingTop: 'calc(2rem + var(--safe-top))' }}
                className="px-6 pb-8 flex items-center justify-between border-b border-black/5 sticky top-0 bg-background/40 backdrop-blur-xl z-30"
            >
                <button
                    onClick={() => {
                        if (step === 'SUCCESS') {
                            router.push('/');
                        } else if (step === 'NOTES') {
                            setStep('PHOTO');
                        } else if (step === 'PHOTO') {
                            setStep('CONDITION');
                        } else if (step === 'CONDITION') {
                            setStep('TYPE');
                        } else {
                            router.push('/');
                        }
                    }}
                    className="p-3 rounded-2xl bg-black/5 border border-black/10 active:scale-90 transition-transform shadow-sm"
                >
                    <ChevronLeft size={24} className="text-slate-400" />
                </button>
                <div className="text-center flex-1 mx-4">
                    <p className="text-[10px] font-black tracking-[0.3em] text-primary uppercase mb-1">
                        {step === 'SUCCESS' ? 'TRANSACTION COMPLETE' : 'HANDOVER SETUP'}
                    </p>
                    <h1 className="font-black text-lg text-slate-800 truncate tracking-tight">{item.nama}</h1>
                </div>
                <div className="w-12 h-12" /> {/* Spacer */}
            </header>

            {/* Progress Bar */}
            <div className="px-6 py-6 flex gap-2 relative z-10">
                {(['TYPE', 'CONDITION', 'PHOTO', 'NOTES'] as Step[]).map((s, i) => (
                    <div
                        key={s}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${(['TYPE', 'CONDITION', 'PHOTO', 'NOTES'] as Step[]).indexOf(step) >= i
                            ? 'gold-gradient shadow-gold' : 'bg-black/5'
                            }`}
                    />
                ))}
            </div>

            <div className="flex-1 px-6 py-4 flex flex-col max-w-lg mx-auto w-full">
                <AnimatePresence mode="wait">
                    {step === 'TYPE' && (
                        <motion.div
                            key="step-type"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6 flex-1"
                        >
                            <div className="space-y-2">
                                <h2 className="text-3xl font-black text-slate-800 tracking-tighter">Pilih Aksi</h2>
                                <p className="text-sm text-slate-400 font-bold leading-relaxed">Pilih tipe transaksi yang ingin Anda lakukan.</p>
                            </div>

                            <div className="grid gap-5 pt-4">
                                <button
                                    onClick={() => { setType('Pinjam'); setStep('CONDITION'); }}
                                    className={`p-10 rounded-[40px] border-2 transition-all flex items-center justify-between group relative overflow-hidden active:scale-95 ${type === 'Pinjam' ? 'border-primary bg-primary/10 shadow-gold' : 'border-black/5 glass-card bg-white hover:bg-black/5 shadow-sm'
                                        }`}
                                >
                                    <div className="flex items-center gap-6 relative z-10">
                                        <div className="w-20 h-20 rounded-[28px] bg-amber-500/10 text-amber-500 flex items-center justify-center shadow-lg ring-1 ring-amber-500/20 group-hover:scale-110 transition-transform">
                                            <Wrench size={36} strokeWidth={2.5} />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-black text-2xl tracking-tighter text-slate-800 uppercase leading-none">PINJAM</p>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-2">Ambil dari Gudang</p>
                                        </div>
                                    </div>
                                    <ChevronRight className={`text-slate-600 group-hover:text-primary transition-transform group-hover:translate-x-1 ${type === 'Pinjam' ? 'text-primary' : ''}`} size={24} strokeWidth={3} />
                                </button>

                                <button
                                    onClick={() => { setType('Kembali'); setStep('CONDITION'); }}
                                    className={`p-10 rounded-[40px] border-2 transition-all flex items-center justify-between group relative overflow-hidden active:scale-95 ${type === 'Kembali' ? 'border-primary bg-primary/10 shadow-gold' : 'border-black/5 glass-card bg-white hover:bg-black/5 shadow-sm'
                                        }`}
                                >
                                    <div className="flex items-center gap-6 relative z-10">
                                        <div className="w-20 h-20 rounded-[28px] bg-emerald-500/10 text-emerald-500 flex items-center justify-center shadow-lg ring-1 ring-emerald-500/20 group-hover:scale-110 transition-transform">
                                            <Package size={36} strokeWidth={2.5} />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-black text-2xl tracking-tighter text-slate-800 uppercase leading-none">KEMBALI</p>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-2">Balikkan ke Stok</p>
                                        </div>
                                    </div>
                                    <ChevronRight className={`text-slate-600 group-hover:text-primary transition-transform group-hover:translate-x-1 ${type === 'Kembali' ? 'text-primary' : ''}`} size={24} strokeWidth={3} />
                                </button>
                            </div>

                            {/* Quick Info */}
                            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex gap-4 mt-8">
                                <Info size={20} className="text-primary shrink-0 mt-0.5" />
                                <p className="text-xs text-slate-400 font-medium leading-relaxed">
                                    Stok saat ini: <span className="font-black text-slate-200">{item.jumlah_tersedia} {item.satuan || 'Pcs'}</span>.
                                    Pastikan stok cukup untuk peminjaman.
                                </p>
                            </div>
                        </motion.div>
                    )}

                    {step === 'CONDITION' && (
                        <motion.div
                            key="step-condition"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6 flex-1"
                        >
                            <div className="space-y-2">
                                <h2 className="text-3xl font-black text-slate-800 tracking-tighter">Kondisi Alat</h2>
                                <p className="text-sm text-slate-400 font-bold leading-relaxed">Bagaimana kondisi fisik alat saat ini?</p>
                            </div>

                            <div className="grid grid-cols-2 gap-5 pt-4">
                                {(['Baik', 'Rusak Ringan', 'Rusak Berat', 'Hilang'] as Condition[]).map((c) => (
                                    <button
                                        key={c}
                                        onClick={() => { setCondition(c); setStep('PHOTO'); startCamera(); }}
                                        className={`p-8 rounded-[32px] border-2 transition-all flex flex-col items-center gap-4 active:scale-95 group relative overflow-hidden ${condition === c ? 'border-primary bg-primary/10 shadow-gold' : 'border-black/5 glass-card bg-white hover:bg-black/5 shadow-sm'
                                            }`}
                                    >
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${c === 'Baik' ? 'bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20' : 'bg-rose-500/10 text-rose-500 ring-1 ring-rose-500/20'
                                            }`}>
                                            {c === 'Baik' ? <Check size={32} strokeWidth={3} /> : <AlertTriangle size={32} strokeWidth={3} />}
                                        </div>
                                        <span className="font-black text-sm text-slate-800 uppercase tracking-widest">{c}</span>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {step === 'PHOTO' && (
                        <motion.div
                            key="step-photo"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="space-y-6 flex-1 flex flex-col relative z-10"
                        >
                            <div className="space-y-2">
                                <h2 className="text-3xl font-black text-slate-800 tracking-tighter">Bukti Foto</h2>
                                <p className="text-sm text-slate-400 font-bold leading-relaxed">Dokumentasikan kondisi alat saat ini.</p>
                            </div>

                            {!photo ? (
                                <>
                                    <div className="relative flex-1 rounded-[40px] overflow-hidden bg-black border-2 border-black/5 shadow-2xl min-h-[350px] group">
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            className="w-full h-full object-cover opacity-80"
                                        />

                                        {/* Camera Scanner Effect */}
                                        <div className="absolute inset-x-0 top-0 h-1 bg-primary/30 blur-sm animate-scan" style={{ top: 'unset', bottom: '100%', animation: 'scan 2.5s ease-in-out infinite' }} />

                                        <div className="absolute inset-x-0 bottom-10 flex justify-center gap-8 z-20">
                                            {/* Camera Capture Button */}
                                            <button
                                                onClick={capturePhoto}
                                                className="w-20 h-20 rounded-full bg-white p-1.5 shadow-gold active:scale-90 transition-transform"
                                            >
                                                <div className="w-full h-full rounded-full border-[6px] border-black/10 flex items-center justify-center">
                                                    <Camera size={32} className="text-black" strokeWidth={2.5} />
                                                </div>
                                            </button>

                                            {/* Gallery Upload Button */}
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="w-20 h-20 rounded-full bg-slate-100/80 backdrop-blur-md border-2 border-white/20 p-1 flex items-center justify-center active:scale-90 transition-transform"
                                            >
                                                <ImageIcon size={28} className="text-white" />
                                            </button>

                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                ref={fileInputRef}
                                                onChange={handleFileUpload}
                                            />
                                        </div>

                                        {/* Frame corners */}
                                        <div className="absolute inset-10 pointer-events-none">
                                            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary/40 rounded-tl-xl" />
                                            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary/40 rounded-tr-xl" />
                                            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary/40 rounded-bl-xl" />
                                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary/40 rounded-br-xl" />
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => {
                                            if (videoRef.current?.srcObject) {
                                                (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
                                            }
                                            setStep('NOTES');
                                        }}
                                        className="w-full py-5 rounded-[24px] bg-black/5 border border-black/10 text-slate-400 font-black text-xs uppercase tracking-widest hover:bg-black/10 transition-all flex items-center justify-center gap-2 group"
                                    >
                                        Skip Foto
                                        <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </>
                            ) : (
                                <div className="relative flex-1 rounded-[40px] overflow-hidden border-2 border-primary/20 shadow-gold group">
                                    <img src={photo || ''} alt="Captured" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                                    <button
                                        onClick={() => { setPhoto(null); startCamera(); }}
                                        className="absolute top-6 right-6 w-12 h-12 rounded-2xl bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center active:scale-90 transition-transform"
                                    >
                                        <X size={24} />
                                    </button>

                                    <div className="absolute bottom-10 left-0 right-0 px-10">
                                        <button
                                            onClick={() => setStep('NOTES')}
                                            className="w-full gold-gradient p-6 rounded-[28px] shadow-gold flex items-center justify-center gap-4 group active:scale-95 transition-all"
                                        >
                                            <span className="font-black text-xl tracking-tighter text-primary-foreground uppercase">LANJUTKAN</span>
                                            <ChevronRight size={24} className="text-primary-foreground group-hover:translate-x-1 transition-transform" strokeWidth={3} />
                                        </button>
                                    </div>
                                </div>
                            )}
                            <canvas ref={canvasRef} className="hidden" />
                        </motion.div>
                    )}

                    {step === 'NOTES' && (
                        <motion.div
                            key="step-notes"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="space-y-8 flex-1 flex flex-col relative z-10"
                        >
                            <div className="space-y-2">
                                <h2 className="text-3xl font-black text-slate-800 tracking-tighter">Catatan Akhir</h2>
                                <p className="text-sm text-slate-400 font-bold leading-relaxed">Tambahkan keterangan tambahan jika ada.</p>
                            </div>

                            <div className="flex-1 space-y-6">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary px-1">Keterangan Opsional</label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Ketik catatan di sini..."
                                        className="w-full bg-white border border-black/10 rounded-[32px] min-h-[180px] resize-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all p-6 text-slate-800 placeholder:text-slate-400 font-bold text-lg shadow-inner"
                                    />
                                </div>

                                <div className="glass-card p-6 rounded-[32px] border border-black/5 flex items-center gap-5">
                                    <div className="w-16 h-16 rounded-[20px] gold-gradient flex items-center justify-center text-primary-foreground font-black text-2xl shadow-gold">
                                        {technicianName.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Divalidasi Oleh</p>
                                        <p className="text-xl font-black text-slate-800 tracking-tight">{technicianName}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pb-8 space-y-5">
                                <button
                                    disabled={submitting}
                                    onClick={handleSubmit}
                                    className="w-full gold-gradient p-6 rounded-[32px] shadow-gold flex items-center justify-center gap-4 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 group"
                                >
                                    {submitting ? (
                                        <Loader2 className="animate-spin text-primary-foreground" size={28} />
                                    ) : (
                                        <>
                                            <span className="text-xl font-black tracking-tighter text-primary-foreground uppercase">SIMPAN TRANSAKSI</span>
                                            <Check size={28} className="text-primary-foreground transition-transform group-hover:scale-110" strokeWidth={4} />
                                        </>
                                    )}
                                </button>

                                <button
                                    onClick={() => router.push('/')}
                                    className="w-full p-4 rounded-2xl text-slate-600 font-black uppercase tracking-widest text-[11px] hover:text-slate-400 transition-all"
                                >
                                    Batalkan Proses
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {step === 'SUCCESS' && (
                        <motion.div
                            key="step-success"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex-1 flex flex-col items-center justify-center text-center space-y-10 py-12 relative z-10"
                        >
                            <div className="relative">
                                <motion.div
                                    initial={{ scale: 0, rotate: -45 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ type: "spring", damping: 10, stiffness: 100, delay: 0.2 }}
                                    className="w-40 h-40 rounded-[48px] gold-gradient flex items-center justify-center shadow-gold relative z-10"
                                >
                                    <Check size={80} className="text-primary-foreground" strokeWidth={5} />
                                </motion.div>
                                <div className="absolute inset-0 bg-primary/30 blur-[100px] rounded-full scale-150 animate-pulse" />
                            </div>

                            <div className="space-y-4">
                                <h2 className="text-4xl font-black text-slate-800 tracking-tighter">Berhasil!</h2>
                                <p className="text-slate-400 font-bold max-w-[280px] mx-auto leading-relaxed">
                                    Laporan untuk <span className="text-primary">{item.nama}</span> telah tersimpan di sistem.
                                </p>
                            </div>

                            <div className="w-full pt-10 space-y-5">
                                <button
                                    onClick={() => router.push('/')}
                                    className="w-full gold-gradient p-6 rounded-[32px] shadow-gold font-black tracking-tighter text-xl text-primary-foreground uppercase active:scale-95 transition-all"
                                >
                                    BALIK KE MENU
                                </button>

                                <button
                                    onClick={() => router.push('/assets')}
                                    className="w-full p-6 rounded-[32px] bg-white border border-black/10 text-slate-600 font-black tracking-widest text-xs uppercase hover:bg-black/5 transition-all shadow-sm"
                                >
                                    Lihat Daftar Alat
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </main>
    );
}
