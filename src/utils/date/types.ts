

export type DateInput = Date | string | number;

export interface DateRangeLike<T = DateInput | null | undefined> {
  start?: T;
  end?: T;
}

export interface NormalizedDateRange {
  start: string;
  end: string;
}

export interface DateRangeBoundaryDates {
  start: Date | null;
  end: Date | null;
}

export interface DateRangeSummary {
  range: NormalizedDateRange;
  boundaryDates: DateRangeBoundaryDates;
  formatted: string;
  durationDays: number | null;
  complete: boolean;
  empty: boolean;
  partial: boolean;
  ordered: boolean;
}

export interface DateListSummary {
  totalCount: number;
  validCount: number;
  invalidCount: number;
  empty: boolean;
  earliest: Date | null;
  latest: Date | null;
  earliestValue: string;
  latestValue: string;
  rangeDays: number | null;
  dates: Date[];
}

export interface DateStatusSummary {
  value: string;
  valid: boolean;
  timestamp: number | null;
  today: boolean;
  past: boolean;
  future: boolean;
  weekend: boolean;
  sameWeek: boolean;
  sameMonth: boolean;
  sameYear: boolean;
  daysFromToday: number | null;
}

export interface FormatDateRangeSummaryOptions {
  emptyText?: string;
  partialPrefix?: string;
  unorderedSuffix?: string;
  durationUnit?: string;
  separator?: string;
  includeDuration?: boolean;
}

export interface FormatCompactDateRangeOptions {
  separator?: string;
  fallback?: string;
  sameDayPattern?: string;
  sameMonthStartPattern?: string;
  sameYearStartPattern?: string;
  endPattern?: string;
  fullPattern?: string;
}

export type DateRangePresetKey = "today" | "yesterday" | "last7Days" | "last30Days" | "thisWeek" | "thisMonth" | "thisQuarter" | "thisYear";

export type DateGranularity = "day" | "week" | "month" | "quarter" | "year";

export interface DateRangePresetDefinition {
  key: DateRangePresetKey;
  label: string;
  range: NormalizedDateRange;
}

export interface DateBoundaryRange {
  start: Date;
  end: Date;
}

export interface DateRangeDurationOptions {
  inclusive?: boolean;
  absolute?: boolean;
}

export interface DateGranularityOptions {
  firstDayOfWeek?: number;
}

export interface EnumerateDateRangeOptions {
  inclusive?: boolean;
  maxDays?: number;
}

export interface WeekdayLabelOptions {
  firstDayOfWeek?: number;
  stripZhWeekPrefix?: boolean;
  format?: Intl.DateTimeFormatOptions["weekday"];
}

export interface FormatOptionalUnixTimestampOptions {
  unit?: "second" | "millisecond";
  pattern?: string;
  fallback?: string;
  zeroAsMissing?: boolean;
}

export type TimestampMsFallback = number | (() => number);
