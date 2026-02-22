CREATE TABLE IF NOT EXISTS public.asset_reports (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER NOT NULL REFERENCES public.inventaris_utama(id),
    technician_name TEXT NOT NULL,
    condition TEXT NOT NULL,
    description TEXT NOT NULL,
    photo_url TEXT,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Resolved', 'Rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Note: In Supabase, usually we have to run this via the SQL Editor in the Dashboard.
-- I'll create a script that tries to execute it via the REST API if possible, or I will instruct the user if RPC is needed.
