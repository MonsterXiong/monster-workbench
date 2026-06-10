export interface SafeDecodeBase64Options {
  fallback?: string;
}

export interface DataUrlInfo {
  mimeType: string;
  encoding: "base64" | "text";
  data: string;
}

export interface DataUrlSummary extends DataUrlInfo {
  valid: boolean;
  dataLength: number;
  byteLength: number;
  textLength: number;
}

export interface EncodedTextSummary {
  text: string;
  normalizedText: string;
  textLength: number;
  byteLength: number;
  hexLength: number;
  base64Length: number;
  base64UrlLength: number;
  isHex: boolean;
  isBase64: boolean;
  isBase64Url: boolean;
  empty: boolean;
}

export interface DataUrlListSummary {
  totalCount: number;
  validCount: number;
  invalidCount: number;
  base64Count: number;
  textCount: number;
  byteLength: number;
  textLength: number;
  mimeTypes: string[];
  allValid: boolean;
  hasInvalid: boolean;
  empty: boolean;
}
