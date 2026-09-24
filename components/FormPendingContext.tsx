"use client";

import { createContext, useContext } from "react";

const FormPendingContext = createContext(false);

export function FormPendingProvider({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return <FormPendingContext.Provider value={pending}>{children}</FormPendingContext.Provider>;
}

export function useFormPending() {
  return useContext(FormPendingContext);
}
