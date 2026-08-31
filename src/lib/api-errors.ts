import { NextResponse } from "next/server";

export type ApiErrorDetails = Record<string, unknown>;

export function apiError(code: string, message: string, status = 400, details: ApiErrorDetails = {}) {
  return NextResponse.json({ error: { code, message, details } }, { status });
}

export function apiSuccess<T extends Record<string, unknown>>(payload: T, status = 200) {
  return NextResponse.json(payload, { status });
}
