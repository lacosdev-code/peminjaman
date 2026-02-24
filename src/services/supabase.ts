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

/**
 * Fetch assets permanently assigned to a technician from inventaris_orang table
 */
export async function getAssignedAssets(technicianId: string, technicianName?: string) {
    // Real columns: id, orang, nama, jumlah, kondisi, keterangan, foto_url, technician_id
    const SELECT_COLS = 'id, nama, orang, jumlah, kondisi, keterangan, foto_url, technician_id';

    console.log('[getAssignedAssets] Looking up by technician_id:', technicianId);
    const { data, error } = await supabase
        .from('inventaris_orang')
        .select(SELECT_COLS)
        .eq('technician_id', technicianId);

    if (error) console.error('[getAssignedAssets] Error by ID:', error.message);
    console.log('[getAssignedAssets] Results by technician_id:', data?.length ?? 0, 'rows');

    if (data && data.length > 0) {
        return data.sort((a: any, b: any) => (a.nama || '').localeCompare(b.nama || ''));
    }

    // FALLBACK: match by name in 'orang' column
    if (technicianName) {
        console.warn('[getAssignedAssets] Falling back to name lookup for:', technicianName);
        const { data: byName, error: nameError } = await supabase
            .from('inventaris_orang')
            .select(SELECT_COLS)
            .ilike('orang', `%${technicianName}%`);

        if (nameError) {
            console.error('[getAssignedAssets] Name fallback error:', nameError.message);
            return [];
        }
        console.log('[getAssignedAssets] Results by name:', byName?.length ?? 0, 'rows');
        return (byName || []).sort((a: any, b: any) => (a.nama || '').localeCompare(b.nama || ''));
    }

    return [];
}

/**
 * Update kondisi of an asset in inventaris_orang
 */
export async function updateAssetKondisi(assetId: number, kondisi: string) {
    const { error } = await supabase
        .from('inventaris_orang')
        .update({ kondisi, updated_at: new Date().toISOString() })
        .eq('id', assetId);

    if (error) {
        console.error('[updateAssetKondisi] Error:', error.message);
        return { success: false, message: error.message };
    }
    return { success: true };
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
