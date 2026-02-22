'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { X, Zap, Camera, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function ScanPage() {
    const router = useRouter();
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Basic scanner configuration
        const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
        };

        scannerRef.current = new Html5QrcodeScanner('qr-reader', config, false);

        scannerRef.current.render(
            (decodedText) => {
                // Haptic Feedback for Field Confidence
                if (navigator.vibrate) {
                    navigator.vibrate(200);
                }

                // Stop scanner and navigate to handover page
                if (scannerRef.current) {
                    scannerRef.current.clear().then(() => {
                        router.push(`/handover/${decodedText}`);
                    }).catch(console.error);
                }
            },
            (errorMessage) => {
                // Quietly handle scan errors
            }
        );

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(console.error);
            }
        };
    }, [router]);

    return (
        <main className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-between relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-primary/5 blur-[120px] -z-10" />

            {/* Header */}
            <div className="w-full flex justify-between items-center z-10">
                <Link href="/">
                    <button className="p-3 rounded-2xl glass-panel bg-white/5 active:scale-90 transition-transform">
                        <X size={24} className="text-slate-400" />
                    </button>
                </Link>
                <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2 text-primary font-black tracking-widest text-xs uppercase italic">
                        <Zap size={14} fill="currentColor" />
                        Scanner Aktif
                    </div>
                </div>
                <button className="p-3 rounded-2xl glass-panel bg-white/5 active:scale-90 transition-transform">
                    <Camera size={24} className="text-slate-400" />
                </button>
            </div>

            {/* Scanner Container */}
            <div className="flex-1 w-full max-w-sm flex flex-col items-center justify-center gap-8 relative">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full aspect-square relative rounded-[40px] overflow-hidden border-2 border-primary/20 gold-glow"
                >
                    {/* Custom Scanner UI Overlay */}
                    <div className="absolute inset-0 z-20 pointer-events-none">
                        {/* Corners */}
                        <div className="absolute top-8 left-8 w-12 h-12 border-t-4 border-l-4 border-primary rounded-tl-2xl" />
                        <div className="absolute top-8 right-8 w-12 h-12 border-t-4 border-r-4 border-primary rounded-tr-2xl" />
                        <div className="absolute bottom-8 left-8 w-12 h-12 border-b-4 border-l-4 border-primary rounded-bl-2xl" />
                        <div className="absolute bottom-8 right-8 w-12 h-12 border-b-4 border-r-4 border-primary rounded-br-2xl" />

                        {/* Scanning Line */}
                        <motion.div
                            animate={{ top: ['15%', '85%', '15%'] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                            className="absolute left-8 right-8 h-1 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_15px_rgba(197,160,45,0.8)]"
                        />
                    </div>

                    <div id="qr-reader" className="w-full h-full object-cover grayscale" />
                </motion.div>

                <div className="text-center space-y-2">
                    <p className="font-bold text-lg tracking-tight text-slate-100">Arahkan ke QR Alat</p>
                    <p className="text-xs text-slate-500 font-medium max-w-[200px] mx-auto leading-relaxed">
                        Pastikan kode QR berada di dalam kotak scanner untuk identifikasi otomatis.
                    </p>
                </div>
            </div>

            {/* Footer / Status */}
            <div className="w-full pb-8 z-10 px-4">
                <div className="glass-panel p-4 rounded-3xl border border-white/5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-primary border border-white/5">
                        <ShieldAlert size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-300">Tips Lapangan</p>
                        <p className="text-[10px] text-slate-500 truncate font-medium">Gunakan cahaya yang cukup saat scanning.</p>
                    </div>
                </div>
            </div>

            {/* Custom Global Styles for html5-qrcode UI Hide */}
            <style jsx global>{`
        #qr-reader {
          border: none !important;
          background: transparent !important;
        }
        #qr-reader__dashboard, #qr-reader__status_span {
          display: none !important;
        }
        #qr-reader video {
          height: 100% !important;
          object-fit: cover !important;
          border-radius: 40px !important;
        }
      `}</style>
        </main>
    );
}
