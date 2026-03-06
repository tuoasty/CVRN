"use client";

import { createContext, useContext } from "react";

export const AdminReadyContext = createContext<boolean>(false);

export function useAdminReady() {
    return useContext(AdminReadyContext);
}