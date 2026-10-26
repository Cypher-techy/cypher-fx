import { AppError } from "../errors";
export interface ExecutionProvider {
  submitOrder(
    input: unknown,
    idempotencyKey: string,
  ): Promise<{ reference: string; status: string }>;
  cancelOrder(reference: string): Promise<void>;
  health(): Promise<{ available: boolean; reason: string }>;
}
export const executionProvider: ExecutionProvider = {
  async submitOrder() {
    throw new AppError(
      503,
      "Live trading unavailable. No authorized execution provider is configured. No real order was submitted.",
    );
  },
  async cancelOrder() {
    throw new AppError(503, "Live trading unavailable");
  },
  async health() {
    return {
      available: false,
      reason:
        "Authorized execution provider, agreements and regulatory approval required",
    };
  },
};
