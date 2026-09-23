import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, publicComplaints } from "@/db/schema";
import type { PublicComplaintInput } from "@/lib/public-complaint-validation";

function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function ticketNumber(sequence: number) {
  const year = new Date().getUTCFullYear();
  return `LR-${year}-${String(sequence).padStart(8, "0")}`;
}

export async function createPublicComplaint(input: PublicComplaintInput) {
  return getDb().transaction(async (tx) => {
    const [existing] = await tx.select({ id: publicComplaints.id, ticketNumber: publicComplaints.ticketNumber }).from(publicComplaints).where(eq(publicComplaints.requestId, input.requestId)).limit(1);
    if (existing) return { idempotent: true as const, ...existing };
    const sequenceResult = await tx.execute(sql`select nextval('public_complaint_ticket_number_seq') as sequence`);
    const sequence = Number((sequenceResult.rows[0] as { sequence?: string | number } | undefined)?.sequence ?? 0);
    if (!sequence) throw new Error("ColdPower: no se pudo asignar el correlativo del reclamo.");

    const complaint = (await tx.insert(publicComplaints).values({
      id: id("public-complaint"),
      ticketNumber: ticketNumber(sequence),
      requestId: input.requestId,
      complainantName: input.name,
      documentType: input.documentType,
      documentNumber: input.documentNumber,
      email: input.email,
      phone: input.phone,
      address: input.address,
      complaintType: input.complaintType,
      detail: input.detail,
      productReference: input.productReference || null,
      status: "RECEIVED",
    }).returning({ id: publicComplaints.id, ticketNumber: publicComplaints.ticketNumber }))[0];

    await tx.insert(auditLogs).values({
      id: id("audit"),
      actorId: null,
      actorRole: "PUBLIC",
      action: "public.complaint_submitted",
      entityType: "public_complaint",
      entityId: complaint.id,
      module: "PUBLIC",
      origin: "PUBLIC_COMPLAINTS_BOOK",
      requestId: input.requestId,
      before: null,
      after: { ticketNumber: complaint.ticketNumber, status: "RECEIVED", complaintType: input.complaintType },
      metadata: { documentType: input.documentType, hasProductReference: Boolean(input.productReference), emailDomain: input.email.split("@")[1] ?? null },
    });

    return { idempotent: false as const, ...complaint };
  });
}
