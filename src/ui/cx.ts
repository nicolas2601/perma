export type ClassValue = string | false | null | undefined;

export function cx(...parts: ClassValue[]): string {
  return parts.filter((part): part is string => Boolean(part)).join(' ');
}
