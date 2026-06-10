export interface RandomStringOptions {
  length?: number;
  alphabet?: string;
}

export interface SequentialIdFactoryOptions {
  prefix?: string;
  start?: number;
  separator?: string;
}

export interface IndexedIdOptions {
  prefix?: string;
  start?: number;
  separator?: string;
}

export interface StableIdMapOptions {
  prefix?: string;
  separator?: string;
}

export interface UniqueIdEntry {
  index: number;
  input: string;
  id: string;
  changed: boolean;
}

export interface UniqueIdsSummary {
  entries: UniqueIdEntry[];
  ids: string[];
  changedIds: string[];
  totalCount: number;
  changedCount: number;
  hasChanges: boolean;
}
