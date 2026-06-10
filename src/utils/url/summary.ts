import { getFileExtension, getFileName } from "../path";
import { tryCreateUrl } from "./core";
import { decodeUrlPathSegment } from "./path";
import { normalizeHash } from "./hash";
import { searchParamsToArrayRecord, searchParamsToRecord } from "./search-params";
import type { UrlListSummary, UrlSummary, UrlSummaryOptions } from "./types";

export function summarizeUrl(input: string, options: UrlSummaryOptions = {}): UrlSummary {
  const nextUrl = tryCreateUrl(input, { baseUrl: options.baseUrl });

  if (!nextUrl) {
    return {
      valid: false,
      input,
      href: "",
      origin: "",
      protocol: "",
      hostname: "",
      port: "",
      pathname: "",
      search: "",
      hash: "",
      hashValue: "",
      pathSegments: [],
      pathDepth: 0,
      lastPathSegment: "",
      fileName: "",
      extension: "",
      queryRecord: {},
      queryArrayRecord: {},
      queryCount: 0,
      hasQuery: false,
      hasHash: false,
      isHttp: false,
      isHttps: false,
    };
  }

  const pathSegments = nextUrl.pathname
    .split("/")
    .map((segment) => segment.trim())
    .map((segment) => (options.decode ? decodeUrlPathSegment(segment) : segment))
    .filter(Boolean);
  const fileName = getFileName(nextUrl.pathname);
  const queryArrayRecord = options.includeQueryArrayRecord === false ? {} : searchParamsToArrayRecord(nextUrl.searchParams);
  const queryRecord = searchParamsToRecord(nextUrl.searchParams, options);
  let queryCount = 0;
  nextUrl.searchParams.forEach(() => {
    queryCount += 1;
  });
  const hashValue = normalizeHash(nextUrl.hash, false);

  return {
    valid: true,
    input,
    href: nextUrl.href,
    origin: nextUrl.origin,
    protocol: nextUrl.protocol,
    hostname: nextUrl.hostname,
    port: nextUrl.port,
    pathname: nextUrl.pathname,
    search: nextUrl.search,
    hash: nextUrl.hash,
    hashValue,
    pathSegments,
    pathDepth: pathSegments.length,
    lastPathSegment: pathSegments[pathSegments.length - 1] ?? "",
    fileName,
    extension: getFileExtension(fileName),
    queryRecord,
    queryArrayRecord,
    queryCount,
    hasQuery: queryCount > 0,
    hasHash: hashValue.length > 0,
    isHttp: nextUrl.protocol === "http:" || nextUrl.protocol === "https:",
    isHttps: nextUrl.protocol === "https:",
  };
}

export function summarizeUrls(inputs: readonly string[], options: UrlSummaryOptions = {}): UrlListSummary {
  const summaries = inputs.map((input) => summarizeUrl(input, options));
  const validSummaries = summaries.filter((summary) => summary.valid);
  const hostnameCounts: Record<string, number> = {};
  const protocolCounts: Record<string, number> = {};
  const extensionCounts: Record<string, number> = {};

  validSummaries.forEach((summary) => {
    if (summary.hostname) {
      hostnameCounts[summary.hostname] = (hostnameCounts[summary.hostname] ?? 0) + 1;
    }

    if (summary.protocol) {
      protocolCounts[summary.protocol] = (protocolCounts[summary.protocol] ?? 0) + 1;
    }

    if (summary.extension) {
      extensionCounts[summary.extension] = (extensionCounts[summary.extension] ?? 0) + 1;
    }
  });

  return {
    totalCount: inputs.length,
    validCount: validSummaries.length,
    invalidCount: inputs.length - validSummaries.length,
    httpCount: validSummaries.filter((summary) => summary.isHttp).length,
    httpsCount: validSummaries.filter((summary) => summary.isHttps).length,
    queryCount: validSummaries.filter((summary) => summary.hasQuery).length,
    hashCount: validSummaries.filter((summary) => summary.hasHash).length,
    hostnames: Object.keys(hostnameCounts),
    hostnameCounts,
    protocols: Object.keys(protocolCounts),
    protocolCounts,
    extensions: Object.keys(extensionCounts),
    extensionCounts,
  };
}
