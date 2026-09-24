"use client";

import type { FormEvent, ReactNode } from "react";
import { useState, useTransition } from "react";
import type { ActionState } from "@/lib/actionState";
import { FormPendingProvider } from "./FormPendingContext";

export type { ActionState } from "@/lib/actionState";

export type Action = (stateOrFormData: ActionState | FormData, formData?: FormData) => Promise<ActionState>;

export type ActionFormProps = {
  action: Action;
  className?: string;
  children: ReactNode;
  successMessage?: string;
  resetOnSuccess?: boolean;
};

const initialState: ActionState = { status: "idle" };

export default function ActionForm({ action, className = "", children, successMessage, resetOnSuccess = false }: ActionFormProps) {
  const [state, setState] = useState<ActionState>(initialState);
  const [formVersion, setFormVersion] = useState(0);
  const [pending, startTransition] = useTransition();
  const nativeAction = action as unknown as (formData: FormData) => void;
  const feedback =
    state.status === "error"
      ? state.message ?? "Something went wrong. Please try again."
      : state.status === "success"
        ? state.message ?? successMessage
        : undefined;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        const nextState = await action(state, formData);
        setState(nextState);
        if (nextState.status === "success" && resetOnSuccess) {
          setFormVersion((value) => value + 1);
        }
      } catch {
        setState({ status: "error", message: "Something went wrong. Please try again." });
      }
    });
  };

  return (
    <FormPendingProvider pending={pending}>
      <form key={formVersion} action={nativeAction} method="post" onSubmit={handleSubmit} className={className} aria-busy={pending}>
        {children}
      </form>
      {feedback && (
        <p
          role={state.status === "error" ? "alert" : "status"}
          aria-live={state.status === "error" ? "assertive" : "polite"}
          className={`mt-2 rounded-control border px-3 py-2 text-xs leading-5 ${
            state.status === "error"
              ? "border-accent/35 bg-accent/10 text-red-200"
              : "border-highlight/25 bg-highlight-soft text-highlight"
          }`}
        >
          {feedback}
        </p>
      )}
    </FormPendingProvider>
  );
}
