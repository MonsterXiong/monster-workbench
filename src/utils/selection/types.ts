export interface SelectionState<T> {
  selected: T[];
  selectedCount: number;
  totalCount: number;
  allSelected: boolean;
  partiallySelected: boolean;
  empty: boolean;
}

export interface ToggleSelectionKeyOptions {
  multiple?: boolean;
  allowDeselect?: boolean;
}

export interface SelectionSummary {
  selectedCount: number;
  totalCount: number;
  unselectedCount: number;
  allSelected: boolean;
  partiallySelected: boolean;
  empty: boolean;
  hasAvailableItems: boolean;
}

export interface SelectionRange<K extends PropertyKey> {
  keys: K[];
  startIndex: number;
  endIndex: number;
  found: boolean;
  reversed: boolean;
}

export interface SelectionDelta<K extends PropertyKey> {
  added: K[];
  removed: K[];
  unchanged: K[];
  addedCount: number;
  removedCount: number;
  unchangedCount: number;
  hasChanges: boolean;
}

export interface SelectionItemsSummary<T, K extends PropertyKey> extends SelectionSummary {
  selectedKeys: K[];
  unselectedKeys: K[];
  selectedItems: T[];
  unselectedItems: T[];
}

export interface SelectionPredicateSummary<T> extends SelectionSummary {
  selectedItems: T[];
  unselectedItems: T[];
}

export interface SelectionDisplaySummary extends SelectionSummary {
  label: string;
  selectedPercent: number;
  unselectedPercent: number;
}

export interface SelectionLimitSummary<K extends PropertyKey> {
  selectedKeys: K[];
  overflowKeys: K[];
  limit: number;
  selectedCount: number;
  overflowCount: number;
  limited: boolean;
}

export interface SelectionOperationSummary<K extends PropertyKey> {
  beforeKeys: K[];
  afterKeys: K[];
  delta: SelectionDelta<K>;
  beforeSummary: SelectionSummary;
  afterSummary: SelectionSummary;
}

export interface SelectionKeyReplacement<K extends PropertyKey> {
  currentKey: K;
  nextKey: K;
  replaced: boolean;
}

export interface SelectionKeyReplacementReport<K extends PropertyKey> extends SelectionOperationSummary<K> {
  replacements: Array<SelectionKeyReplacement<K>>;
  replacedKeys: K[];
  unchangedReplacementKeys: K[];
  replacementCount: number;
  changed: boolean;
}

export interface SelectionAvailabilitySummary<K extends PropertyKey> {
  availableKeys: K[];
  selectableKeys: K[];
  disabledKeys: K[];
  selectedKeys: K[];
  selectableSelectedKeys: K[];
  disabledSelectedKeys: K[];
  unavailableSelectedKeys: K[];
  totalCount: number;
  selectableCount: number;
  disabledCount: number;
  selectedCount: number;
  selectableSelectedCount: number;
  disabledSelectedCount: number;
  unavailableSelectedCount: number;
  empty: boolean;
  hasAvailableItems: boolean;
  hasSelectableItems: boolean;
  hasDisabledItems: boolean;
  hasDisabledSelected: boolean;
  hasUnavailableSelected: boolean;
  allSelectableSelected: boolean;
  partiallySelectableSelected: boolean;
}

export interface FormatSelectionSummaryOptions {
  unit?: string;
  emptyText?: string;
  allText?: string;
  partialText?: string;
  separator?: string;
}
