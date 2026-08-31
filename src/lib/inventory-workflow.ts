export const transferStatuses = ["DRAFT", "REQUESTED", "IN_TRANSIT", "RECEIVED", "CANCELLED"] as const;
export type TransferStatus = (typeof transferStatuses)[number];

const transitions: Record<TransferStatus, readonly TransferStatus[]> = {
  DRAFT: ["REQUESTED", "CANCELLED"],
  REQUESTED: ["IN_TRANSIT", "CANCELLED"],
  IN_TRANSIT: ["RECEIVED", "CANCELLED"],
  RECEIVED: [],
  CANCELLED: [],
};

export function canTransitionTransfer(from: string, to: string): to is TransferStatus {
  return transferStatuses.includes(from as TransferStatus) && (transitions[from as TransferStatus] as readonly string[]).includes(to);
}
