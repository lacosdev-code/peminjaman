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
        <main className="min-h-screen bg-background text-foreground pb-12 flex flex-col">
            {/* Header */}
            <header className="p-6 flex items-center justify-between border-b border-white/5 sticky top-0 bg-background/80 backdrop-blur-md z-30">
                <button
                    onClick={() => step === 'TYPE' ? router.push('/') : setStep('TYPE')}
                    className="p-3 rounded-2xl glass-panel bg-white/5 active:scale-90 transition-transform"
                >
                    <ChevronLeft size={24} className="text-slate-400" />
                </button>
                <div className="text-center flex-1">
                    <p className="text-[10px] font-black tracking-[0.2em] text-primary uppercase italic">Setup Handover</p>
                    <h1 className="font-bold text-base truncate max-w-[180px] mx-auto">{item.nama}</h1>
                </div>
                <div className="w-12 h-12" /> {/* Spacer */}
            </header>

            {/* Progress Bar */}
            <div className="px-6 py-4 flex gap-2">
                {(['TYPE', 'CONDITION', 'PHOTO', 'NOTES'] as Step[]).map((s, i) => (
                    <div
                        key={s}
                        className={`h-1 flex-1 rounded-full transition-colors ${(['TYPE', 'CONDITION', 'PHOTO', 'NOTES'] as Step[]).indexOf(step) >= i
                            ? 'gold-gradient' : 'bg-slate-800'
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
                            <div className="space-y-1">
                                <h2 className="text-2xl font-black text-slate-100">Pilih Aksi</h2>
                                <p className="text-sm text-slate-500 font-medium leading-relaxed">Pilih tipe transaksi yang ingin Anda lakukan pada alat ini.</p>
                            </div>

                            <div className="grid gap-4">
                                <button
                                    onClick={() => { setType('Pinjam'); setStep('CONDITION'); }}
                                    className={`p-8 rounded-[32px] border-2 transition-all flex items-center justify-between group ${type === 'Pinjam' ? 'border-primary bg-primary/10 shadow-gold' : 'border-white/5 glass-panel hover:bg-white/5'
                                        }`}
                                >
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/10 group-active:scale-90 transition-transform">
                                            <Wrench size={32} />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-black text-xl tracking-tight text-slate-100">PINJAM</p>
                                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Mengambil dari stok</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="text-slate-600" />
                                </button>

                                <button
                                    onClick={() => { setType('Kembali'); setStep('CONDITION'); }}
                                    className={`p-8 rounded-[32px] border-2 transition-all flex items-center justify-between group ${type === 'Kembali' ? 'border-primary bg-primary/10 shadow-gold' : 'border-white/5 glass-panel hover:bg-white/5'
                                        }`}
                                >
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/10 group-active:scale-90 transition-transform">
                                            <Package size={32} />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-black text-xl tracking-tight text-slate-100">KEMBALI</p>
                                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Mengembalikan ke stok</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="text-slate-600" />
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
                            <div className="space-y-1">
                                <h2 className="text-2xl font-black text-slate-100">Kondisi Alat</h2>
                                <p className="text-sm text-slate-500 font-medium leading-relaxed">Bagaimana kondisi fisik alat saat ini?</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {(['Baik', 'Rusak Ringan', 'Rusak Berat', 'Hilang'] as Condition[]).map((c) => (
                                    <button
                                        key={c}
                                        onClick={() => { setCondition(c); setStep('PHOTO'); startCamera(); }}
                                        className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 active:scale-95 ${condition === c ? 'border-primary bg-primary/10 shadow-gold' : 'border-white/5 glass-panel'
                                            }`}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c === 'Baik' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'
                                            }`}>
                                            {c === 'Baik' ? <Check size={24} /> : <AlertTriangle size={24} />}
                                        </div>
                                        <span className="font-bold text-sm text-slate-200">{c}</span>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {step === 'PHOTO' && (
                        <motion.div
                            key="step-photo"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6 flex-1 flex flex-col"
                        >
                            <div className="space-y-1">
                                <h2 className="text-2xl font-black text-slate-100">Bukti Foto</h2>
                                <p className="text-sm text-slate-500 font-medium leading-relaxed">Ambil foto alat untuk dokumentasi kondisi.</p>
                            </div>

                            {!photo ? (
                                <div className="relative flex-1 rounded-[40px] overflow-hidden bg-black border-2 border-white/5 shadow-2xl min-h-[300px]">
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-x-0 bottom-8 flex flex-col items-center gap-4 z-20">
                                        <div className="flex justify-center gap-6">
                                            {/* Camera Capture Button */}
                                            <button
                                                onClick={capturePhoto}
                                                title="Ambil Foto"
                                                className="w-16 h-16 rounded-full bg-white p-1 shadow-2xl active:scale-90 transition-transform"
                                            >
                                                <div className="w-full h-full rounded-full border-4 border-black/10 flex items-center justify-center">
                                                    <Camera size={28} className="text-black" />
                                                </div>
                                            </button>

                                            {/* Gallery Upload Button */}
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                title="Upload dari Galeri"
                                                className="w-16 h-16 rounded-full bg-slate-800 border-2 border-white/20 p-1 shadow-2xl active:scale-90 transition-transform flex items-center justify-center"
                                            >
                                                <ImageIcon size={24} className="text-white" />
                                            </button>

                                            {/* Hidden File Input */}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                ref={fileInputRef}
                                                onChange={handleFileUpload}
                                            />
                                        </div>

                                        {/* Skip Button */}
                                        <button
                                            onClick={() => {
                                                // Stop camera before skipping
                                                if (videoRef.current && videoRef.current.srcObject) {
                                                    const stream = videoRef.current.srcObject as MediaStream;
                                                    stream.getTracks().forEach(track => track.stop());
                                                }
                                                setStep('NOTES');
                                            }}
                                            className="text-white/70 hover:text-white text-xs font-bold uppercase tracking-widest bg-black/40 px-6 py-2 rounded-full backdrop-blur-md transition-colors"
                                        >
                                            Lewati Foto
                                        </button>
                                    </div>
                                    {/* Overlay for Camera */}
                                    <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none">
                                        <div className="w-full h-full border border-white/20 rounded-2xl" />
                                    </div>
                                </div>
                            ) : (
                                <div className="relative flex-1 rounded-[40px] overflow-hidden border-2 border-primary/20 shadow-gold">
                                    <img src={photo} alt="Captured" className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => { setPhoto(null); startCamera(); }}
                                        className="absolute top-6 right-6 p-3 rounded-2xl glass-panel bg-black/50 text-white active:scale-90 transition-transform"
                                    >
                                        <X size={20} />
                                    </button>
                                    <div className="absolute bottom-8 left-0 right-0 px-8">
                                        <button
                                            onClick={() => setStep('NOTES')}
                                            className="w-full btn-primary shadow-gold flex items-center justify-center gap-2 group"
                                        >
                                            <span>LANJUTKAN</span>
                                            <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
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
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6 flex-1 flex flex-col"
                        >
                            <div className="space-y-1">
                                <h2 className="text-2xl font-black text-slate-100">Catatan & Simpan</h2>
                                <p className="text-sm text-slate-500 font-medium leading-relaxed">Tambahkan keterangan tambahan jika diperlukan.</p>
                            </div>

                            <div className="flex-1 space-y-4">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Keterangan Opsional</label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Contoh: Alat sudah dibersihkan, baterai penuh..."
                                        className="w-full glass-panel min-h-[160px] resize-none focus:ring-2 focus:ring-primary/20 transition-all p-4"
                                    />
                                </div>

                                <div className="glass-panel p-4 rounded-2xl border border-white/5 flex gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center text-primary italic font-black">
                                        {technicianName.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Pelaksana</p>
                                        <p className="text-sm font-bold text-slate-200">{technicianName}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pb-8">
                                <button
                                    disabled={submitting}
                                    onClick={handleSubmit}
                                    className="w-full gold-gradient p-5 rounded-[24px] shadow-gold flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
                                >
                                    {submitting ? (
                                        <Loader2 className="animate-spin" size={24} />
                                    ) : (
                                        <>
                                            <Check size={24} className="text-primary-foreground" strokeWidth={3} />
                                            <span className="text-lg font-black tracking-tight text-primary-foreground uppercase">KONFIRMASI SELESAI</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </main>
    );
}
