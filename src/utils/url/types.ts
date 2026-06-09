

export type QueryPrimitiveValue = string | number | boolean | null | undefined;

export type QueryValue = QueryPrimitiveValue | readonly QueryPrimitiveValue[];

export type QueryParamValue = string | readonly string[] | null | undefined;

export type QueryParamArrayMode = "first" | "last" | "join" | "fallback";

export type SearchParamsInput = string | URLSearchParams | Record<string, QueryValue> | null | undefined;

export interface BuildUrlOptions {
  baseUrl?: string;
  params?: Record<string, QueryValue>;
}

export interface UrlParseOptions {
  baseUrl?: string;
}

export interface QueryParamValueOptions {
  fallback?: string;
  arrayMode?: QueryParamArrayMode;
  separator?: string;
}

export interface QueryRecordOptions extends QueryParamValueOptions {
  arrayMode?: QueryParamArrayMode;
}

export interface QueryParamArrayOptions {
  fallback?: string[];
  separator?: string | RegExp;
  trim?: boolean;
}

export interface NormalizeSearchParamsOptions {
  removeEmpty?: boolean;
  dedupeValues?: boolean;
  sortKeys?: boolean;
  sortValues?: boolean;
  trimKeys?: boolean;
  trimValues?: boolean;
}

export interface StringifyNormalizedQueryOptions extends NormalizeSearchParamsOptions {
  prefix?: boolean;
}

export type SearchParamPredicate = (key: string, value: string, index: number, values: readonly string[]) => boolean;

export interface FilterSearchParamsOptions {
  includeKeys?: readonly string[];
  excludeKeys?: readonly string[];
  predicate?: SearchParamPredicate;
}

export interface MergeQueryParamsOptions extends UrlParseOptions {
  removeEmpty?: boolean;
}

export interface NormalizeUrlQueryOptions extends UrlParseOptions, NormalizeSearchParamsOptions {}

export interface FilterUrlQueryParamsOptions extends UrlParseOptions, FilterSearchParamsOptions {}

export interface UrlPathSegmentOptions extends UrlParseOptions {
  decode?: boolean;
}

export interface UrlSummaryOptions extends UrlParseOptions, UrlPathSegmentOptions, QueryRecordOptions {
  includeQueryArrayRecord?: boolean;
}

export interface UrlSummary {
  valid: boolean;
  input: string;
  href: string;
  origin: string;
  protocol: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
  hashValue: string;
  pathSegments: string[];
  pathDepth: number;
  lastPathSegment: string;
  fileName: string;
  extension: string;
  queryRecord: Record<string, string>;
  queryArrayRecord: Record<string, string[]>;
  queryCount: number;
  hasQuery: boolean;
  hasHash: boolean;
  isHttp: boolean;
  isHttps: boolean;
}

export interface UrlQuerySummary {
  keys: string[];
  keyCount: number;
  valueCount: number;
  emptyValueCount: number;
  duplicatedKeys: string[];
  hasQuery: boolean;
  hasDuplicateKeys: boolean;
}

export interface UrlQueryDiffSummary {
  addedKeys: string[];
  removedKeys: string[];
  changedKeys: string[];
  unchangedKeys: string[];
  addedCount: number;
  removedCount: number;
  changedCount: number;
  unchangedCount: number;
  hasChanges: boolean;
}

export interface UrlQueryMutationPreview {
  beforeUrl: string;
  afterUrl: string;
  beforeQuery: UrlQuerySummary;
  afterQuery: UrlQuerySummary;
  diff: UrlQueryDiffSummary;
}

export interface UrlListSummary {
  totalCount: number;
  validCount: number;
  invalidCount: number;
  httpCount: number;
  httpsCount: number;
  queryCount: number;
  hashCount: number;
  hostnames: string[];
  hostnameCounts: Record<string, number>;
  protocols: string[];
  protocolCounts: Record<string, number>;
  extensions: string[];
  extensionCounts: Record<string, number>;
}

export interface FormatUrlQuerySummaryOptions {
  emptyText?: string;
  keyUnit?: string;
  valueUnit?: string;
  duplicateLabel?: string;
  separator?: string;
  includeValues?: boolean;
  includeDuplicates?: boolean;
}
