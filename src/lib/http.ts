import { NextResponse } from "next/server";

const URL_PATTERN = /\bhttps?:\/\/[^\s"'<>]+/gi;
const LONG_HEX_PATTERN = /\b(?:0x)?[a-f0-9]{64,}\b/gi;

export function redactErrorMessage(message: string) {
  return message.replace(URL_PATTERN, "[redacted-url]").replace(LONG_HEX_PATTERN, "[redacted-hex]");
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: redactErrorMessage(message) }, { status });
}

export function errorMessage(error: unknown) {
  return redactErrorMessage(error instanceof Error ? error.message : "Unexpected error.");
}
