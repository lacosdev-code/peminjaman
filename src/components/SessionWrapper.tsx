'use client';

import { useAutoLogout } from "@/hooks/useAutoLogout";
import React from "react";

export default function SessionWrapper({ children }: { children: React.ReactNode }) {
    // Global auto logout after 30 minutes of inactivity
    useAutoLogout();

    return <>{children}</>;
}
