/**
 * Restricts a client-supplied "redirect" query parameter to same-origin
 * app paths. Prevents open redirects (https://evil.tld, //evil.tld,
 * "javascript:") while keeping in-app destinations and query strings.
 */
export function sanitizeRedirect(
  param: string | null | undefined,
): string | undefined {
  if (!param || !param.startsWith("/")) return undefined;
  if (
    param.startsWith("//") ||
    param.includes("\\") ||
    /[\r\n]/.test(param) ||
    param.toLowerCase().includes("javascript:")
  ) {
    return undefined;
  }
  return param;
}
