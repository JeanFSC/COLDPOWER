import { validateCustomerInput } from "@/lib/crm-validation";

export function customerCreateStepError(input: Record<string, unknown>, step: number): string | null {
  try {
    if (step === 1) {
      validateCustomerInput({ name: input.name, customerType: input.customerType, ruc: input.ruc });
    } else if (step === 2) {
      validateCustomerInput({ email: input.email, phone: input.phone }, true);
    }
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "Revisa los datos antes de continuar.";
  }
}
