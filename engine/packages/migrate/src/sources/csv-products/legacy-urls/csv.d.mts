/**
 * Type declarations for the dependency-free RFC 4180 CSV reader/writer.
 */

export function parseCsv(text: string): string[][]
export function toCsv(
  header: readonly string[],
  records: Array<Record<string, string | number>>,
): string
export function readCsvRecords(text: string): Array<Record<string, string>>
