import type {
  UtilityDocEntry,
  UtilityDocQualityReport,
  UtilityFunctionDoc,
} from "./utilsDocsContent";

export interface UtilityDocStats {
  moduleCount: number;
  splitCount: number;
  singleCount: number;
  functionCount: number;
  exampleCount: number;
  boundaryCaseCount: number;
  sandboxReadyCount: number;
  averageQualityScore: number;
}

export interface UtilityDocGroupView {
  groupName: string;
  docs: UtilityDocEntry[];
}

export type UtilityFunctionParam = NonNullable<UtilityFunctionDoc["params"]>[number];

export type UtilityDocQualityMap = Record<string, UtilityDocQualityReport>;
