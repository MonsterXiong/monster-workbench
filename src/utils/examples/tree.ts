import {
  createTreeDiffByKeyReport,
  createTreeLookup,
  diagnoseListTreeItems,
  listToTree,
  summarizeTreeByKey,
  treeToListWithoutChildren,
  treeToParentIdList,
} from "../tree";

interface DemoTreeNode {
  id: string;
  parentId?: string | null;
  label: string;
  children?: DemoTreeNode[];
}

export const treeUtilityNodes: DemoTreeNode[] = [
  {
    id: "root",
    parentId: null,
    label: "Root",
    children: [
      { id: "docs", parentId: "root", label: "Docs" },
      {
        id: "src",
        parentId: "root",
        label: "Src",
        children: [
          { id: "utils", parentId: "src", label: "Utils" },
        ],
      },
    ],
  },
];

export const treeUtilityListRows: DemoTreeNode[] = [
  { id: "root", parentId: null, label: "Root" },
  { id: "src", parentId: "root", label: "Src" },
  { id: "utils", parentId: "src", label: "Utils" },
  { id: "missing", parentId: "ghost", label: "Missing parent" },
  { id: "loop", parentId: "loop", label: "Self loop" },
];

const treeOptions = {
  getId: (item: DemoTreeNode) => item.id,
  getChildren: (item: DemoTreeNode) => item.children,
};

const getTreeChildren = (item: DemoTreeNode) => item.children;
const getTreeKey = (item: DemoTreeNode) => item.id;

const listOptions = {
  getId: (item: DemoTreeNode) => item.id,
  getParentId: (item: DemoTreeNode) => item.parentId,
};

export const treeUtilityExamples = {
  flatList: treeToListWithoutChildren(treeUtilityNodes, (item) => item.children),
  parentIdList: treeToParentIdList(treeUtilityNodes, treeOptions),
  rebuiltTree: listToTree(treeUtilityListRows.slice(0, 3), listOptions),
  diagnostic: diagnoseListTreeItems(treeUtilityListRows, listOptions),
  summary: summarizeTreeByKey(treeUtilityNodes, getTreeChildren, getTreeKey),
  lookup: createTreeLookup(treeUtilityNodes, getTreeChildren, getTreeKey),
  diffReport: createTreeDiffByKeyReport(
    treeUtilityNodes,
    [
      {
        id: "root",
        parentId: null,
        label: "Root",
        children: [
          {
            id: "src",
            parentId: "root",
            label: "Source",
            children: [
              { id: "utils", parentId: "src", label: "Utils" },
              { id: "views", parentId: "src", label: "Views" },
            ],
          },
        ],
      },
    ],
    getTreeChildren,
    getTreeKey,
    {
      isEqual: (before, after) => before.label === after.label,
    }
  ),
};

export const treeUtilityBoundaryCases = [
  {
    key: "tree-to-list",
    title: "tree to list",
    input: "treeToListWithoutChildren(nodes)",
    expected: treeUtilityExamples.flatList.map((item) => item.id).join(", "),
  },
  {
    key: "list-diagnostic",
    title: "list to tree diagnostic",
    input: "diagnoseListTreeItems(rows)",
    expected: `missing=${treeUtilityExamples.diagnostic.stats.missingParent}, self=${treeUtilityExamples.diagnostic.stats.selfParent}`,
  },
  {
    key: "lookup-summary",
    title: "tree lookup summary",
    input: "summarizeTreeByKey(nodes)",
    expected: `nodes=${treeUtilityExamples.summary.stats.nodeCount}, leaves=${treeUtilityExamples.summary.stats.leafCount}`,
  },
  {
    key: "tree-diff",
    title: "tree diff by key",
    input: "createTreeDiffByKeyReport(before, after)",
    expected: treeUtilityExamples.diffReport.summary.changedKeys.join(", "),
  },
];
