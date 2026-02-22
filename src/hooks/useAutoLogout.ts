'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

const DEFAULT_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

export function useAutoLogout(timeoutMs: number = DEFAULT_TIMEOUT) {
    const router = useRouter();
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const logout = useCallback(() => {
        console.log('Auto Logout: Inactivity detected.');
        localStorage.removeItem('sgd_technician');
        // Clear other session-related cache if any
        localStorage.removeItem('sgd_active_tools');
        localStorage.removeItem('sgd_recent_logs');

        router.push('/login');
    }, [router]);

    const resetTimer = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(logout, timeoutMs);
    }, [logout, timeoutMs]);

    useEffect(() => {
        const events = [
            'mousedown',
            'mousemove',
            'keypress',
            'scroll',
            'touchstart',
            'click'
        ];

        // Initial set
        resetTimer();

        const handleActivity = () => resetTimer();

        events.forEach(event => {
            window.addEventListener(event, handleActivity);
        });

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            events.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
        };
    }, [resetTimer]);
}
