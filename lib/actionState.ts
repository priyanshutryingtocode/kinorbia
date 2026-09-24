export type ActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export function resolveActionArgs(
  stateOrFormData: ActionState | FormData,
  formData?: FormData
): { state: ActionState; formData: FormData } {
  if (formData) {
    return { state: stateOrFormData as ActionState, formData };
  }

  return { state: { status: "idle" }, formData: stateOrFormData as FormData };
}
