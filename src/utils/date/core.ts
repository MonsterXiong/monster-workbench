import { isNaNNumber } from "../number";
import type { DateInput } from "./types";

export function toDate(value: DateInput): Date | null {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return isNaNNumber(date.getTime()) ? null : date;
}

export function getCurrentDate(): Date {
  return new Date();
}

export function isValidDate(value: unknown): value is DateInput {
  return value instanceof Date || typeof value === "string" || typeof value === "number"
    ? toDate(value) !== null
    : false;
}

export function isDateValuePresent(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}
