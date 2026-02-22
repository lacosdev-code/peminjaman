import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface HandoverParams {
    item_id: number;
    teknisi: string;
    tipe: 'Pinjam' | 'Kembali';
    kondisi: string;
    catatan: string;
    photo_url?: string;
}

/**
 * Wrapper for the log_tool_handover RPC function.
 * Handles stock updates and activity logging atomically.
 */
export async function logToolHandover(params: HandoverParams) {
    const { data, error } = await supabase.rpc('log_tool_handover', {
        p_item_id: params.item_id,
        p_teknisi: params.teknisi,
        p_tipe: params.tipe,
        p_kondisi: params.kondisi,
        p_catatan: params.catatan,
        p_photo_url: params.photo_url || ''
    });

    if (error) {
        console.error('RPC Error:', error);
        return { success: false, message: error.message };
    }

    return data;
}

/**
 * Fetch tool details from inventaris_utama
 */
export async function getToolDetails(id: string) {
    const { data, error } = await supabase
        .from('inventaris_utama')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching tool:', error);
        return null;
    }

    return data;
}

/**
 * Fetch all assets from inventaris_utama
 */
export async function getAllAssets() {
    const { data, error } = await supabase
        .from('inventaris_utama')
        .select('*')
        .order('nama', { ascending: true });

    if (error) {
        console.error('Error fetching assets:', error);
        return null;
    }

    return data;
}

export interface Technician {
    id: string;
    name: string;
    whatsapp: string;
    avatar_url?: string;
}

/**
 * Custom authentication via WhatsApp number OR technician name.
 * Tries WA number first; if that fails, falls back to name search.
 */
export async function authenticateTechnician(input: string) {
    // First attempt: authenticate by WhatsApp number via RPC
    const { data, error } = await supabase.rpc('authenticate_technician', {
        p_whatsapp: input
    });

    if (!error && data && data.success) {
        return data as { success: boolean; technician?: Technician; message?: string };
    }

    // Fallback: try to find technician by name (case-insensitive)
    const { data: byName, error: nameError } = await supabase
        .from('technicians')
        .select('id, name, whatsapp_number, avatar_url')
        .ilike('name', input.trim())
        .maybeSingle();

    if (nameError || !byName) {
        return { success: false, message: 'Nomor WA atau nama tidak ditemukan. Hubungi admin.' };
    }

    return {
        success: true,
        technician: {
            id: byName.id,
            name: byName.name,
            whatsapp: byName.whatsapp_number,
            avatar_url: byName.avatar_url
        } as Technician
    };
}
