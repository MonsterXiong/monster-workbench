export interface UniqueFileNameOptions {
  ignoreCase?: boolean;
  separator?: string;
  startIndex?: number;
}

export interface PathCompareOptions {
  ignoreCase?: boolean;
}

export interface PathBreadcrumb {
  name: string;
  path: string;
  index: number;
  isLast: boolean;
}

export interface PathFileInfo {
  path: string;
  directory: string;
  fileName: string;
  baseName: string;
  extension: string;
  extensionWithDot: string;
  hasExtension: boolean;
}

export interface PathExtensionSummary {
  extensions: string[];
  counts: Record<string, number>;
  totalCount: number;
  emptyExtensionCount: number;
  uniqueExtensionCount: number;
}

export interface PathListSummary {
  totalCount: number;
  empty: boolean;
  absoluteCount: number;
  relativeCount: number;
  unsafeCount: number;
  maxDepth: number;
  commonAncestor: string;
  roots: string[];
  rootCounts: Record<string, number>;
  directories: string[];
  directoryCounts: Record<string, number>;
  extensionSummary: PathExtensionSummary;
}

export interface PathAncestorOptions {
  includeSelf?: boolean;
  includeRoot?: boolean;
}

export interface PathSafetySummary {
  path: string;
  normalizedPath: string;
  empty: boolean;
  absolute: boolean;
  relative: boolean;
  windowsDrive: boolean;
  unc: boolean;
  hasControlCharacters: boolean;
  hasTraversal: boolean;
  safeRelative: boolean;
}

export interface PathRelationSummary {
  basePath: string;
  targetPath: string;
  same: boolean;
  inside: boolean;
  insideOrSame: boolean;
  relativePath: string;
  commonAncestor: string;
}

export interface FileNameSanitizeSummary {
  originalName: string;
  sanitizedName: string;
  fallbackUsed: boolean;
  changed: boolean;
  safe: boolean;
}
