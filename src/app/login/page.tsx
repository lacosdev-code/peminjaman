'use client';

import React, { useState } from 'react';
import { authenticateTechnician } from '@/services/supabase';
import { FaWhatsapp, FaUser, FaTools, FaEye, FaEyeSlash, FaQrcode } from 'react-icons/fa';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';

const TechnicianLogin = () => {
    const [whatsapp, setWhatsapp] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!whatsapp || whatsapp.trim() === '') {
            Swal.fire({
                icon: 'warning',
                title: 'Data Belum Lengkap',
                text: 'Mohon masukan nomor WhatsApp atau nama Anda.',
                confirmButtonColor: '#C5A02D'
            });
            return;
        }

        setLoading(true);
        try {
            const result = await authenticateTechnician(whatsapp);

            if (result.success && result.technician) {
                // Save session to localStorage
                localStorage.setItem('sgd_technician', JSON.stringify(result.technician));

                Swal.fire({
                    icon: 'success',
                    title: 'Akses Diterima',
                    text: `Selamat bertugas, ${result.technician.name}!`,
                    timer: 1500,
                    showConfirmButton: false,
                });

                router.push('/');
            } else {
                throw new Error(result.message || 'Nomor WA tidak terdaftar.');
            }
        } catch (error: any) {
            Swal.fire({
                icon: 'error',
                title: 'Gagal',
                text: error.message || 'Terjadi kesalahan saat login.',
                confirmButtonColor: '#C5A02D'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden font-['Outfit']">
            {/* Animated Mesh Gradient Background (Matched with Admin Web) */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100">
                <div className="absolute inset-0 opacity-30">
                    <div className="absolute top-0 -left-4 w-72 h-72 bg-sgd-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
                    <div className="absolute top-0 -right-4 w-72 h-72 bg-sgd-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob [animation-delay:2000ms]"></div>
                    <div className="absolute -bottom-8 left-20 w-72 h-72 bg-sgd-600 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob [animation-delay:4000ms]"></div>
                </div>
            </div>

            <div className="relative z-10 w-full max-w-md">
                <div className="bg-white/40 backdrop-blur-3xl rounded-[2.5rem] p-1 border border-slate-200/50 shadow-2xl">
                    <div className="bg-white rounded-[2.3rem] p-10 shadow-sm border border-slate-100">

                        {/* Logo Section */}
                        <div className="text-center mb-6">
                            <div className="relative inline-block mb-4">
                                <div className="absolute inset-0 gold-gradient rounded-3xl blur-xl opacity-30 animate-pulse"></div>
                                <div className="relative w-16 h-16 bg-white rounded-3xl flex items-center justify-center shadow-xl border border-gray-100 p-3">
                                    <img src="https://ik.imagekit.io/Sgd/Logo%20Potrait.png" alt="Logo" className="w-full h-full object-contain" />
                                </div>
                            </div>
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">INVENTARIS SGD</h1>
                            <div className="inline-block px-3 py-1 bg-sgd-50 rounded-full mt-1.5 border border-sgd-200">
                                <p className="text-[9px] font-black text-sgd-600 uppercase tracking-widest">Peminjaman Alat Inventaris SGD</p>
                            </div>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleLogin} className="space-y-4" noValidate>
                            <div className="relative group">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center group-focus-within:bg-green-500 group-focus-within:text-white transition-all text-green-600 z-10 border border-green-100 group-focus-within:border-green-500 shadow-sm">
                                    <FaWhatsapp className="text-xl" />
                                </div>
                                <input
                                    type="text"
                                    required
                                    placeholder="Nomor WhatsApp atau Nama"
                                    className="w-full !pl-20 pr-5 py-5 !bg-slate-50 !border-slate-200 !text-slate-900 rounded-2xl focus:!border-green-500 focus:!bg-white outline-none transition-all text-sm font-bold placeholder:text-slate-400 shadow-sm"
                                    value={whatsapp}
                                    onChange={(e) => setWhatsapp(e.target.value)}
                                />
                                <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase tracking-tighter pointer-events-none">
                                    0812 / Nama
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-400 font-medium px-1 -mt-1">
                                💡 Bisa masukan <span className="font-black text-slate-500">nomor WA</span> atau <span className="font-black text-slate-500">nama lengkap</span> yang terdaftar
                            </p>


                            <button type="submit" disabled={loading} className="relative w-full group pt-2">
                                <div className="absolute inset-0 bg-sgd-500 rounded-2xl blur-lg opacity-40 group-hover:opacity-60 transition-opacity"></div>
                                <div className="relative bg-primary border border-primary/20 text-white font-black py-4 rounded-2xl shadow-gold flex items-center justify-center gap-3 active:scale-95 transition-transform overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-r from-sgd-500/10 to-sgd-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-white">
                                        {loading ? <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <FaQrcode size={14} />}
                                    </div>
                                    <span className="uppercase tracking-widest text-xs">
                                        {loading ? "Memverifikasi..." : "Masuk Sekarang"}
                                    </span>
                                </div>
                            </button>

                        </form>

                        <p className="text-center text-[9px] text-gray-400 mt-8 font-bold uppercase tracking-widest">
                            © 2026 PT. Sunggiardi Corp
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TechnicianLogin;
