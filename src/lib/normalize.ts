/**
 * Client-side string normalization for display hints only (e.g. comparing a
 * typed answer to the correct one when highlighting a near miss). The
 * authoritative grading lives in the Rust backend (`domain/grading.rs`);
 * this mirror must never be treated as the source of truth.
 */

/**
 * Combining diacritical marks range (U+0300-U+036F), built from char codes
 * to keep the source free of literal combining characters. Stripped after
 * NFD decomposition so accented letters fold to their base form.
 */
const COMBINING_MARKS = new RegExp(
  `[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}]`,
  "g",
);

/** Lowercases, strips diacritics, trims, and collapses internal whitespace. */
export function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}
