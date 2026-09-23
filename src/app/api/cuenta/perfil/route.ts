import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { and, desc, eq } from "drizzle-orm";
import { ApiAuthorizationError, requireApiUser } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { getDb } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { customerAddresses, customers } from "@/db/crm-schema";
import { normalizePhone, sanitizeText } from "@/lib/quote";

const contactPreferences = new Set(["email", "phone", "whatsapp"]);

class ProfileInputError extends Error {}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasField(input: Record<string, unknown>, field: string) {
  return Object.prototype.hasOwnProperty.call(input, field);
}

function optionalString(input: Record<string, unknown>, field: string, maxLength: number) {
  if (!hasField(input, field)) return undefined;
  const value = input[field];
  if (value !== null && typeof value !== "string") {
    throw new ProfileInputError(`El campo ${field} no es válido.`);
  }
  return value === null ? "" : sanitizeText(value, maxLength);
}

function optionalPhone(input: Record<string, unknown>) {
  if (!hasField(input, "phone")) return undefined;
  const value = input.phone;
  if (value !== null && typeof value !== "string") {
    throw new ProfileInputError("El teléfono no es válido.");
  }
  return value === null ? "" : normalizePhone(value, 24);
}

function optionalContactPreference(input: Record<string, unknown>) {
  if (!hasField(input, "contactPreference")) return undefined;
  const value = input.contactPreference;
  if (value === null || value === "") return "";
  if (typeof value !== "string" || !contactPreferences.has(value.trim().toLowerCase())) {
    throw new ProfileInputError("El medio de contacto no es válido.");
  }
  return value.trim().toLowerCase();
}

async function currentProfile(userId: string) {
  const db = getDb();
  const [row] = await db
    .select({
      email: users.email,
      name: users.name,
      phone: users.phone,
      customerId: customers.id,
      companyName: customers.legalName,
      address: customers.address,
      contactPreference: customers.contactPreference,
    })
    .from(users)
    .leftJoin(customers, eq(customers.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);
  return row ?? null;
}

export async function GET() {
  let userId: string;
  try {
    ({ userId } = await requireApiUser());
  } catch (error) {
    if (error instanceof ApiAuthorizationError) {
      return apiError("AUTH_REQUIRED", "Debes iniciar sesión para consultar tu perfil.", 401);
    }
    throw error;
  }

  try {
    return NextResponse.json({ success: true, profile: await currentProfile(userId) });
  } catch (error) {
    console.error("ColdPower: no se pudo cargar el perfil", error);
    return NextResponse.json({ success: false, message: "No se pudo cargar el perfil." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  let userId: string;
  try {
    ({ userId } = await requireApiUser());
  } catch (error) {
    if (error instanceof ApiAuthorizationError) {
      return apiError("AUTH_REQUIRED", "Debes iniciar sesión para actualizar tu perfil.", 401);
    }
    throw error;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "JSON inválido." }, { status: 400 });
  }

  if (!isObject(body)) {
    return NextResponse.json({ success: false, message: "Solicitud inválida." }, { status: 400 });
  }

  let name: string | undefined;
  let phone: string | undefined;
  let companyName: string | undefined;
  let address: string | undefined;
  let contactPreference: string | undefined;

  try {
    name = optionalString(body, "name", 120);
    phone = optionalPhone(body);
    companyName = optionalString(body, "companyName", 180);
    address = optionalString(body, "address", 300);
    contactPreference = optionalContactPreference(body);
  } catch (error) {
    if (error instanceof ProfileInputError) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }
    throw error;
  }

  if (![name, phone, companyName, address, contactPreference].some((value) => value !== undefined)) {
    return NextResponse.json({ success: false, message: "No hay cambios para guardar." }, { status: 400 });
  }
  if (name !== undefined && !name) {
    return NextResponse.json({ success: false, message: "El nombre es obligatorio." }, { status: 400 });
  }

  try {
    const db = getDb();
    const result = await db.transaction(async (tx) => {
      const [current] = await tx
        .select({
          userName: users.name,
          userPhone: users.phone,
          customerId: customers.id,
          customerName: customers.name,
          customerPhone: customers.phone,
          customerWhatsapp: customers.whatsapp,
          companyName: customers.legalName,
          customerAddress: customers.address,
          contactPreference: customers.contactPreference,
        })
        .from(users)
        .leftJoin(customers, eq(customers.userId, users.id))
        .where(eq(users.id, userId))
        .for("update")
        .limit(1);

      if (!current) throw new ProfileInputError("No encontramos tu cuenta local.");
      if (!current.customerId && [companyName, address, contactPreference].some((value) => value !== undefined)) {
        throw new ProfileInputError("Los datos comerciales requieren un perfil de cliente vinculado.");
      }

      const changedFields: string[] = [];
      const nextName = name !== undefined ? name : current.userName;
      const nextPhone = phone !== undefined ? phone || null : current.userPhone;
      if (!nextName) throw new ProfileInputError("El nombre es obligatorio.");

      if (name !== undefined && name !== current.userName) changedFields.push("name");
      if (phone !== undefined && (phone || null) !== current.userPhone) changedFields.push("phone");

      if (name !== undefined || phone !== undefined) {
        await tx
          .update(users)
          .set({ name: nextName, phone: nextPhone, updatedAt: new Date() })
          .where(eq(users.id, userId));
      }

      if (current.customerId) {
        const [primaryAddress] = await tx
          .select({ id: customerAddresses.id, address: customerAddresses.address })
          .from(customerAddresses)
          .where(and(eq(customerAddresses.customerId, current.customerId), eq(customerAddresses.isPrimary, true)))
          .orderBy(desc(customerAddresses.updatedAt))
          .for("update")
          .limit(1);

        if (address !== undefined && !address && (primaryAddress?.address || current.customerAddress)) {
          throw new ProfileInputError("La dirección actual no puede quedar vacía desde este formulario.");
        }

        const customerUpdates: Partial<typeof customers.$inferInsert> = {};
        if (name !== undefined && name !== current.customerName) customerUpdates.name = name;
        if (phone !== undefined && (phone || null) !== current.customerPhone) {
          if (!changedFields.includes("phone")) changedFields.push("phone");
          customerUpdates.phone = nextPhone;
          if ((contactPreference ?? current.contactPreference)?.toLowerCase() === "whatsapp") {
            customerUpdates.whatsapp = nextPhone;
          }
        }
        if (companyName !== undefined && (companyName || null) !== current.companyName) {
          customerUpdates.legalName = companyName || null;
          changedFields.push("companyName");
        }
        if (contactPreference !== undefined && (contactPreference || null) !== (current.contactPreference?.toLowerCase() || null)) {
          customerUpdates.contactPreference = contactPreference || null;
          changedFields.push("contactPreference");
        }
        if (address !== undefined && address && address !== current.customerAddress) {
          customerUpdates.address = address;
          changedFields.push("address");
          if (primaryAddress) {
            await tx
              .update(customerAddresses)
              .set({ address, updatedAt: new Date() })
              .where(eq(customerAddresses.id, primaryAddress.id));
          } else {
            await tx.insert(customerAddresses).values({
              id: `customer-address-${crypto.randomUUID()}`,
              customerId: current.customerId,
              label: "Principal",
              address,
              isPrimary: true,
            });
          }
        }

        if (Object.keys(customerUpdates).length > 0) {
          await tx
            .update(customers)
            .set({ ...customerUpdates, updatedAt: new Date() })
            .where(eq(customers.id, current.customerId));
        }

        if (name !== undefined && name !== current.customerName && !changedFields.includes("name")) changedFields.push("name");

        if (changedFields.length > 0) {
          await tx.insert(auditLogs).values({
            id: `audit-${crypto.randomUUID()}`,
            actorId: userId,
            actorRole: "customer",
            action: "customer.profile_updated",
            entityType: "customer",
            entityId: current.customerId,
            module: "account",
            severity: "INFO",
            origin: "public-account",
            before: null,
            after: null,
            metadata: { changedFields: Array.from(new Set(changedFields)) },
          });
        }
      } else if (changedFields.length > 0) {
        await tx.insert(auditLogs).values({
          id: `audit-${crypto.randomUUID()}`,
          actorId: userId,
          actorRole: "customer",
          action: "account.profile_updated",
          entityType: "user",
          entityId: userId,
          module: "account",
          severity: "INFO",
          origin: "public-account",
          before: null,
          after: null,
          metadata: { changedFields: Array.from(new Set(changedFields)) },
        });
      }

      return { customerLinked: Boolean(current.customerId) };
    });

    revalidatePath("/cuenta");
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof ProfileInputError) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }
    console.error("ColdPower: no se pudo actualizar el perfil", error);
    return NextResponse.json({ success: false, message: "No se pudo actualizar el perfil." }, { status: 503 });
  }
}
