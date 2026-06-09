export interface FormatBytesOptions {
  base?: 1000 | 1024;
  decimals?: number;
  units?: readonly string[];
}

export interface FormatOptionalBytesOptions extends FormatBytesOptions {
  fallback?: string;
}

export interface FormatBytesProgressOptions extends FormatBytesOptions {
  separator?: string;
}

export interface FormatFileTypeSizeOptions extends FormatBytesOptions {
  separator?: string;
  fallback?: string;
}

export interface FormatPercentOptions {
  decimals?: number;
  fallback?: string;
}

export interface FormatRatioPercentOptions extends FormatPercentOptions {
  emptyTotalFallback?: string;
}

export interface FormatCountProgressOptions {
  unit?: string;
  separator?: string;
  showPercent?: boolean;
  percentDecimals?: number;
  fallback?: string;
}

export interface FormatDurationOptions {
  maxUnits?: number;
  fallback?: string;
}

export interface FormatRelativeTimeOptions {
  now?: number | Date;
  locale?: string;
  numeric?: Intl.RelativeTimeFormatNumeric;
  fallback?: string;
}

export interface FormatBooleanOptions {
  trueText?: string;
  falseText?: string;
  fallback?: string;
}

export interface FormatNumberRangeOptions extends Intl.NumberFormatOptions {
  locale?: string;
  separator?: string;
  fallback?: string;
}

export interface FormatNumberDeltaOptions extends Intl.NumberFormatOptions {
  locale?: string;
  fallback?: string;
  showPlusSign?: boolean;
  precision?: number;
}

export interface FormatPercentDeltaOptions extends FormatPercentOptions {
  fallback?: string;
  showPlusSign?: boolean;
}

export interface FormatOptionalNumberOptions extends Intl.NumberFormatOptions {
  locale?: string;
  fallback?: string;
}

export interface Dimensions {
  width: number;
  height: number;
}

export interface FormatAspectRatioOptions {
  fallback?: string;
  reduced?: boolean;
  separator?: string;
}

export interface FormatListSummaryOptions {
  maxItems?: number;
  separator?: string;
  fallback?: string;
  overflowFormatter?: (hiddenCount: number) => string;
}

export interface FormatMappedListOptions {
  separator?: string;
  fallback?: string;
}

export interface FormatKeyValueListOptions {
  separator?: string;
  pairSeparator?: string;
  fallback?: string;
  skipEmpty?: boolean;
}

export interface FormatListCountOptions {
  unit?: string;
  locale?: string;
  fallback?: string;
}

export interface FormatIdentifierOptions {
  maxLength?: number;
  fallback?: string;
  suffix?: string;
  normalizeWhitespace?: boolean;
}

export type TemplateParamValue = string | number | boolean | null | undefined;

export interface FormatTemplateOptions {
  keepMissing?: boolean;
  missingValue?: TemplateParamValue | ((key: string) => TemplateParamValue);
}

export interface TemplateSummary {
  template: string;
  keys: string[];
  keyCount: number;
  hasPlaceholders: boolean;
  duplicateKeys: string[];
}

export interface TemplateFormatReport {
  template: string;
  output: string;
  keys: string[];
  missingKeys: string[];
  hasMissingKeys: boolean;
  changed: boolean;
}

export interface SummaryItem<TMeta = unknown> {
  key: string;
  label: string;
  value: string;
  meta?: TMeta;
}

export interface SummaryItemInput<TMeta = unknown> {
  key: string;
  label: unknown;
  value: unknown;
  meta?: TMeta;
  visible?: boolean;
}

export type StatusTone = "neutral" | "success" | "warning" | "danger" | "info";

export interface StatusSummaryItem<TMeta = unknown> extends SummaryItem<TMeta> {
  tone: StatusTone;
  active: boolean;
}

export interface StatusSummaryItemInput<TMeta = unknown> extends SummaryItemInput<TMeta> {
  tone?: StatusTone;
  active?: boolean;
}

export interface CreateSummaryItemsOptions {
  skipEmpty?: boolean;
  fallback?: string;
}

export interface FormatSummaryItemsOptions<TMeta = unknown> extends FormatKeyValueListOptions {
  labelFormatter?: (item: SummaryItem<TMeta>, index: number) => unknown;
  valueFormatter?: (item: SummaryItem<TMeta>, index: number) => unknown;
}

export interface CreateSummaryItemsReportOptions<TMeta = unknown> extends CreateSummaryItemsOptions {
  format?: FormatSummaryItemsOptions<TMeta>;
}

export interface SummaryItemsSummary {
  sourceCount: number;
  itemCount: number;
  skippedCount: number;
  keys: string[];
  duplicateKeys: string[];
  hasDuplicateKeys: boolean;
  empty: boolean;
}

export interface SummaryItemsReport<TMeta = unknown> {
  items: Array<SummaryItem<TMeta>>;
  itemMap: Map<string, SummaryItem<TMeta>>;
  itemRecord: Record<string, string>;
  formattedText: string;
  summary: SummaryItemsSummary;
}

export interface StatusSummaryItemsSummary extends SummaryItemsSummary {
  activeCount: number;
  inactiveCount: number;
  toneCounts: Record<StatusTone, number>;
  activeToneCounts: Record<StatusTone, number>;
  hasActive: boolean;
  hasInactive: boolean;
}

export interface StatusSummaryItemsReport<TMeta = unknown> {
  items: Array<StatusSummaryItem<TMeta>>;
  activeItems: Array<StatusSummaryItem<TMeta>>;
  inactiveItems: Array<StatusSummaryItem<TMeta>>;
  itemsByTone: Record<StatusTone, Array<StatusSummaryItem<TMeta>>>;
  itemMap: Map<string, StatusSummaryItem<TMeta>>;
  itemRecord: Record<string, string>;
  formattedText: string;
  summary: StatusSummaryItemsSummary;
}
