import { eq, inArray } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { products, quoteCarts, type QuoteCartItem } from "@/db/schema";
import { isAuthConfigured } from "@/lib/env";
import { parseStoredCart } from "@/lib/cart";

const sessionCookieName = "coldpower-quote-session";
const sessionTtlMs = 1000 * 60 * 60 * 24 * 30;

export async function GET() {
  const context = await getSessionContext();
  try {
    const items = await readCart(context.sessionToken, context.userId);
    const response = NextResponse.json({ success: true, items });
    setSessionCookie(response, context.sessionToken);
    return response;
  } catch (error) {
    return databaseError(error);
  }
}

export async function POST(request: Request) {
  const context = await getSessionContext();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "El carrito debe enviarse como JSON." }, { status: 400 });
  }

  try {
    const inputItems = body && typeof body === "object" && "items" in body ? body.items : [];
    const items = await sanitizeItems(inputItems);
    await writeCart(context.sessionToken, context.userId, items);
    const response = NextResponse.json({ success: true, items });
    setSessionCookie(response, context.sessionToken);
    return response;
  } catch (error) {
    return databaseError(error);
  }
}

export async function DELETE() {
  const context = await getSessionContext();
  try {
    await writeCart(context.sessionToken, context.userId, []);
    const response = NextResponse.json({ success: true, items: [] });
    setSessionCookie(response, context.sessionToken);
    return response;
  } catch (error) {
    return databaseError(error);
  }
}

async function getSessionContext() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(sessionCookieName)?.value || crypto.randomUUID();
  let userId: string | null = null;

  if (isAuthConfigured) {
    try {
      userId = (await auth()).userId;
    } catch {
      userId = null;
    }
  }

  return { sessionToken, userId };
}

async function readCart(sessionToken: string, userId: string | null) {
  const db = getDb();
  const sessionRows = await db.select().from(quoteCarts).where(eq(quoteCarts.id, sessionToken)).limit(1);
  let row = sessionRows[0];

  if ((!row || row.expiresAt.getTime() <= Date.now()) && userId) {
    const userRows = await db.select().from(quoteCarts).where(eq(quoteCarts.userId, userId)).limit(1);
    row = userRows[0];
  }

  if (!row || row.expiresAt.getTime() <= Date.now()) return [];
  if (userId && row.userId !== userId) {
    await db.update(quoteCarts).set({ userId, updatedAt: new Date() }).where(eq(quoteCarts.id, row.id));
  }
  return sanitizeItems(row.items);
}

async function writeCart(sessionToken: string, userId: string | null, items: QuoteCartItem[]) {
  const db = getDb();
  const expiresAt = new Date(Date.now() + sessionTtlMs);
  const values = { id: sessionToken, userId, items, expiresAt, updatedAt: new Date() };
  if (userId) {
    await db.insert(quoteCarts).values(values).onConflictDoUpdate({
      target: quoteCarts.id,
      set: { userId, items, expiresAt, updatedAt: new Date() },
    });
  } else {
    await db.insert(quoteCarts).values(values).onConflictDoUpdate({
      target: quoteCarts.id,
      set: { items, expiresAt, updatedAt: new Date() },
    });
  }
}

async function sanitizeItems(value: unknown): Promise<QuoteCartItem[]> {
  const parsed = parseStoredCart(JSON.stringify(Array.isArray(value) ? value : []));
  if (parsed.length === 0) return [];
  const db = getDb();
  const validRows = await db.select({ id: products.id }).from(products).where(inArray(products.id, parsed.map((item) => item.productId)));
  const validProductIds = new Set(validRows.map((row) => row.id));
  return parsed.filter((item) => validProductIds.has(item.productId));
}

function databaseError(error: unknown) {
  console.error("ColdPower: operación de carrito no persistida", error);
  return NextResponse.json({ success: false, message: "El catálogo persistente no está disponible. Configura la base de datos e inténtalo nuevamente." }, { status: 503 });
}

function setSessionCookie(response: NextResponse, sessionToken: string) {
  response.cookies.set({
    name: sessionCookieName,
    value: sessionToken,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: sessionTtlMs / 1000,
    path: "/",
  });
}
