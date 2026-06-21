import { NextResponse } from "next/server";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected error.";
}
