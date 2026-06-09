import {
  createDeepObjectDiffReport,
  createObjectCleanupReport,
  formatObjectDiff,
  getByPath,
  objectPathToString,
  pickByPaths,
  setByPath,
} from "../object";

export const objectUtilityBefore = {
  profile: {
    name: "monster",
    tags: ["desktop", "tool"],
    settings: {
      theme: "light",
      nested: {
        level: 1,
      },
    },
  },
  paths: {
    output: "C:\\workbench\\reports\\old.csv",
  },
};

export const objectUtilityAfter = {
  profile: {
    name: "monster",
    tags: ["desktop", "tauri", "tool"],
    settings: {
      theme: "dark",
      nested: {
        level: 2,
      },
    },
  },
  paths: {
    output: "C:\\workbench\\reports\\new.csv",
  },
};

export const objectUtilityExamples = {
  deepDiffReport: createDeepObjectDiffReport(objectUtilityBefore, objectUtilityAfter, {
    compareArraysByIndex: true,
    ignorePaths: ["paths.output"],
  }),
  pickedPaths: pickByPaths(objectUtilityAfter, [
    "profile.name",
    "profile.settings.theme",
    "profile.tags[1]",
  ]),
  updatedByPath: setByPath(objectUtilityBefore, "profile.settings.nested.level", 9),
  cleanupReport: createObjectCleanupReport({
    title: "  report  ",
    empty: "",
    nullable: null,
    count: 0,
    enabled: false,
  }, {
    trimStrings: true,
    removeEmptyValues: true,
  }),
};

export const objectUtilityBoundaryCases = [
  {
    key: "deep-diff",
    title: "deep object diff",
    input: "createDeepObjectDiffReport(before, after, { compareArraysByIndex: true })",
    expected: formatObjectDiff(objectUtilityExamples.deepDiffReport.entries),
  },
  {
    key: "path-access",
    title: "object path access",
    input: "getByPath(after, 'profile.tags[1]')",
    expected: String(getByPath(objectUtilityAfter, "profile.tags[1]", "")),
  },
  {
    key: "path-string",
    title: "object path text",
    input: "objectPathToString(['profile', 'settings', 'theme'])",
    expected: objectPathToString(["profile", "settings", "theme"]),
  },
  {
    key: "cleanup",
    title: "cleanup keeps false and 0",
    input: "createObjectCleanupReport({ empty: '', count: 0, enabled: false })",
    expected: Object.keys(objectUtilityExamples.cleanupReport.value).join(", "),
  },
];
