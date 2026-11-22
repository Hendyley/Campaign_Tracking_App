import { HttpErrorResponse } from '@angular/common/http';

/** Turns an ASP.NET Core validation response ({ errors: { Field: [msg] } }) into one readable line. */
export function apiErrorMessage(e: HttpErrorResponse, fallback: string): string {
  const errors = e.error?.errors as Record<string, string[]> | undefined;
  if (errors) {
    return Object.values(errors).flat().join(' ');
  }
  return fallback;
}