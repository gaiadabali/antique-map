/**
 * Untrusted data in, framed as data (AI.md §3.1). Trusted: the system prompt, the tool
 * definitions and the server's operator notes. Untrusted: the visitor's text, every tool result,
 * page paths. Untrusted content reaches the model only as the user turn or inside a tool result
 * wrapped in `<catalogue_data>` tags, which the system prompt names as data to quote, never
 * instructions to follow.
 *
 * Neither can close the frame early: a tool result is JSON with `<`, `>` and `&` written as
 * `<`, `>`, `&` (still valid JSON, so the model reads the same strings), and in
 * the visitor's text any tag naming one of our frames is defused.
 */
import 'server-only'

export const DATA_TAG = 'catalogue_data'

/** The JSON of a tool result, safe to place inside the frame. */
export function frameJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
}

/** One tool result as the model receives it: data, inside the frame. */
export function frameToolResult(value: unknown): string {
  return `<${DATA_TAG}>\n${frameJson(value)}\n</${DATA_TAG}>`
}

const FRAME_TAG =
  /<\s*\/?\s*(catalogue_data|system|operator|operator_note|tool_result|tool_use|instructions?|assistant|user)\b/gi

/** The visitor's text with any tag naming one of our frames defused (`<` becomes `‹`). */
export function defuseVisitorText(text: string): string {
  return text.replace(FRAME_TAG, (tag) => tag.replace('<', '‹'))
}

/** Control and bidi-override characters (but newlines and tabs): exactly what this strips. */
/* eslint-disable no-control-regex */
const INVISIBLE =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g
/* eslint-enable no-control-regex */

/** Control characters out (but newlines and tabs), Unicode normalised: before any check runs. */
export function cleanVisitorText(text: string): string {
  return text.normalize('NFC').replace(INVISIBLE, '').trim()
}
