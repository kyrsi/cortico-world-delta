const stripWhitespace = (text: string) => text.replace(/\s+/gu, '');

/** NFKC with whitespace removed. Case stays as written. */
export function compact(text: string): string {
  return stripWhitespace(text.normalize('NFKC'));
}

/** NFKC, whitespace removed, then en-US uppercase. */
export function compactUpper(text: string): string {
  return compact(text).toLocaleUpperCase('en-US');
}

/** NFKC, whitespace removed, then lowercase. */
export function compactLower(text: string): string {
  return compact(text).toLowerCase();
}

/** NFKC, then the default uppercase mapping. Whitespace stays. */
export function upperNFKC(text: string): string {
  return text.normalize('NFKC').toUpperCase();
}

export { stripWhitespace };
