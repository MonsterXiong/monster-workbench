export type SortDirection = "asc" | "desc";
export type ComparableValue = string | number | boolean | Date | null | undefined;
export type NullSortPosition = "auto" | "first" | "last";
export type AriaSortValue = "none" | "ascending" | "descending" | "other";

export interface SortRule<T> {
  getValue: (item: T) => ComparableValue;
  direction?: SortDirection;
  nulls?: NullSortPosition;
}

export interface CompareValueOptions {
  direction?: SortDirection;
  nulls?: NullSortPosition;
}

export interface SortState<K extends PropertyKey = string> {
  key: K;
  direction: SortDirection;
}

export interface SortStateSummary<K extends PropertyKey = string> {
  active: boolean;
  key: K | null;
  direction: SortDirection | null;
  label: string;
}

export interface ToggleSortStateOptions {
  defaultDirection?: SortDirection;
  resetDirection?: SortDirection;
}

export interface FormatSortStateOptions<K extends PropertyKey = string> {
  fallback?: string;
  separator?: string;
  ascText?: string;
  descText?: string;
  formatKey?: (key: K) => string;
}

export interface SortControlSummaryOptions<K extends PropertyKey = string> extends FormatSortStateOptions<K>, ToggleSortStateOptions {
  clearOnDesc?: boolean;
}

export interface SortControlSummary<K extends PropertyKey = string> {
  key: K;
  active: boolean;
  direction: SortDirection | null;
  ariaSort: AriaSortValue;
  label: string;
  nextDirection: SortDirection | null;
  nextState: SortState<K> | null;
  nextLabel: string;
  clearable: boolean;
}

export interface SortControlsSummary<K extends PropertyKey = string> {
  keyCount: number;
  activeKey: K | null;
  activeDirection: SortDirection | null;
  activeIndex: number;
  hasActive: boolean;
  clearable: boolean;
}

export interface SortControlsReport<K extends PropertyKey = string> {
  state: SortState<K> | null;
  controls: Array<SortControlSummary<K>>;
  controlMap: Map<K, SortControlSummary<K>>;
  ariaSortByKey: Map<K, AriaSortValue>;
  nextStateByKey: Map<K, SortState<K> | null>;
  summary: SortControlsSummary<K>;
}

export interface SortRulesSummary {
  totalCount: number;
  ascCount: number;
  descCount: number;
  autoNullCount: number;
  firstNullCount: number;
  lastNullCount: number;
  active: boolean;
}
