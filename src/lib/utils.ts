import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converte uma string de data (YYYY-MM-DD) para um objeto Date corretamente,
 * evitando o problema de timezone que causa "um dia a menos".
 */
export function parseDate(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;
  try {
    // parseISO trata a string como local time, não UTC
    return parseISO(dateString);
  } catch {
    return null;
  }
}
