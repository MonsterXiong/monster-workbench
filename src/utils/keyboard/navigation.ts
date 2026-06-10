import { getNextCircularIndex, getNextClampedIndex } from "../array";
import type {
  KeyboardEventLike,
  KeyboardIndexNavigationHandlerOptions,
  KeyboardIndexNavigationOptions,
} from "./types";
import { getKeyboardBoundaryPosition, getKeyboardNavigationDirection } from "./core";

export function getKeyboardNavigationIndex(
  event: KeyboardEventLike,
  length: number,
  currentIndex: number,
  options: KeyboardIndexNavigationOptions = {}
): number | null {
  if (length <= 0) {
    return null;
  }

  const includeBoundary = options.includeBoundary ?? true;
  const boundary = includeBoundary ? getKeyboardBoundaryPosition(event) : null;

  if (boundary === "first") {
    return 0;
  }

  if (boundary === "last") {
    return length - 1;
  }

  const direction = getKeyboardNavigationDirection(event, options);

  if (!direction) {
    return null;
  }

  const fallbackIndex = options.fallbackIndex ?? 0;
  return options.wrap ?? true
    ? getNextCircularIndex(length, currentIndex, direction, fallbackIndex)
    : getNextClampedIndex(length, currentIndex, direction, fallbackIndex);
}

export function handleKeyboardIndexNavigation(
  event: KeyboardEvent,
  length: number,
  currentIndex: number,
  onChange: (nextIndex: number, event: KeyboardEvent) => void,
  options: KeyboardIndexNavigationHandlerOptions = {}
): boolean {
  const nextIndex = getKeyboardNavigationIndex(event, length, currentIndex, options);

  if (nextIndex === null) {
    return false;
  }

  if (options.preventDefault ?? true) {
    event.preventDefault();
  }

  if (options.stopPropagation) {
    event.stopPropagation();
  }

  onChange(nextIndex, event);
  return true;
}
