import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { quoteConfig } from "@/lib/env";
import { checkPublicRateLimit } from "@/lib/public-rate-limit";
import { createPublicContactLead } from "@/lib/crm-service";
import { contactAttachmentStorageKey, removeContactAttachment, validateContactAttachment, writeContactAttachment } from "@/lib/contact-attachments";
import { validatePublicContactPayload } from "@/lib/public-contact-validation";

export const runtime = "nodejs";

const maxRequestBytes = 10 * 1024 * 1024 + 256 * 1024;
const rateLimitMessage = "Recibimos varias solicitudes. Intenta nuevamente en unos minutos.";

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > maxRequestBytes) {
    return NextResponse.json({ success: false, message: "La solicitud es demasiado grande. Reduce el archivo e intenta nuevamente." }, { status: 413 });
  }

  const clientIp = getClientIp(request);
  const rateLimit = checkPublicRateLimit(`contact:${clientIp}`, quoteConfig.quoteRateLimit);
  const headers = {
    "X-RateLimit-Limit": String(quoteConfig.quoteRateLimit.max),
    "X-RateLimit-Remaining": String(rateLimit.remaining),
  };
  if (!rateLimit.allowed) {
    return NextResponse.json({ success: false, message: rateLimitMessage }, { status: 429, headers: { ...headers, "Retry-After": String(rateLimit.retryAfterSeconds) } });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ success: false, message: "No se pudo leer la solicitud. Intenta nuevamente." }, { status: 400, headers });
  }

  // Honeypot requests receive the same public response as a real submission,
  // but never reach the CRM or attachment storage.
  if (String(form.get("website") ?? "").trim()) {
    return NextResponse.json({ success: true, message: "Consulta enviada correctamente." }, { status: 201, headers });
  }

  const validation = validatePublicContactPayload({
    name: form.get("name"),
    company: form.get("company"),
    phone: form.get("phone"),
    email: form.get("email"),
    message: form.get("message"),
    consent: form.get("consent"),
    requestId: form.get("requestId"),
  });
  if (!validation.ok) {
    return NextResponse.json({ success: false, message: "Revisa los datos marcados antes de enviar la consulta.", errors: validation.errors }, { status: 400, headers });
  }

  let storageKey = "";
  try {
    const rawFile = form.get("attachment");
    let attachment: Parameters<typeof createPublicContactLead>[0]["attachment"];
    if (rawFile instanceof File && rawFile.size > 0) {
      const bytes = new Uint8Array(await rawFile.arrayBuffer());
      const fileValidation = validateContactAttachment({ filename: rawFile.name, mimeType: rawFile.type, size: rawFile.size, bytes });
      if (!fileValidation.ok) return NextResponse.json({ success: false, message: fileValidation.error, errors: { attachment: fileValidation.error } }, { status: 400, headers });
      const attachmentId = `crm-attachment-${crypto.randomUUID()}`;
      storageKey = contactAttachmentStorageKey(attachmentId, fileValidation.extension);
      await writeContactAttachment(storageKey, bytes);
      const safeFilename = rawFile.name.split(/[\\/]/).pop()?.replace(/[\u0000-\u001f]/g, "").trim().slice(0, 255) || attachmentId;
      attachment = {
        id: attachmentId,
        originalFilename: safeFilename,
        storageKey,
        mimeType: fileValidation.mimeType,
        byteSize: bytes.byteLength,
        contentHash: createHash("sha256").update(bytes).digest("hex"),
      };
    }

    const result = await createPublicContactLead({ ...validation.data, attachment });
    if (result.idempotent && storageKey) await removeContactAttachment(storageKey);
    try {
      if (!result.idempotent) {
        const attachmentLabel = result.attachment ? " con archivo adjunto" : "";
        const { notifyStaffOnce } = await import("@/lib/notifications-service");
        await notifyStaffOnce({
          type: "CONTACT_SUBMITTED",
          title: "Nueva consulta de contacto",
          body: `Se recibió una consulta desde la página Contacto${attachmentLabel}.`,
          link: "/admin/crm",
          recipientIds: result.assignedSellerId ? [result.assignedSellerId] : undefined,
          metadata: { customerId: result.customerId, opportunityId: result.opportunityId, attachmentId: result.attachment?.id ?? null, source: "CONTACT_PAGE" },
          dedupeKey: `contact:${validation.data.requestId}:created`,
        });
      }
    } catch (error) {
      console.error("ColdPower: no se pudo notificar la consulta de contacto", error);
    }
    return NextResponse.json({ success: true, message: "Consulta enviada correctamente. Nuestro equipo comercial se pondrá en contacto contigo.", requestId: validation.data.requestId }, { status: 201, headers });
  } catch (error) {
    if (storageKey) await removeContactAttachment(storageKey).catch(() => undefined);
    console.error("ColdPower: fallo al persistir la consulta de contacto", error);
    return NextResponse.json({ success: false, message: "No pudimos enviar tu consulta. Revisa tus datos o intenta nuevamente." }, { status: 503, headers });
  }
}

function getClientIp(request: Request) {
  return request.headers.get("cf-connecting-ip")?.trim() || request.headers.get("x-real-ip")?.trim() || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
}
