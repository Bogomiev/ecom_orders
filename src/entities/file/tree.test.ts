import { expect, it } from "vitest";
import { creationTarget, treeRows } from "./tree";
import type { FileEntry } from "./api/files";
const folder = { id: "folder", name: "Folder", parent_id: null, is_file: false, priority: 0 } as FileEntry;
const file = { id: "file", name: "File.pdf", parent_id: folder.id, is_file: true, priority: 10 } as FileEntry;
it("creates inside the selected folder, or beside the selected file with a later priority", () => {
  expect(creationTarget(folder, true)).toEqual({ parent: "folder", priority: 0 });
  expect(creationTarget(file, true)).toEqual({ parent: "folder", priority: 11 });
  expect(creationTarget(file, false)).toEqual({ parent: "folder", priority: 0 });
  expect(creationTarget(undefined, true)).toEqual({ parent: null, priority: 0 });
});
it("keeps children beneath their parents and filters with ancestor context", () => {
  expect(treeRows([file, folder], new Set(), "")).toEqual([{ entry: folder, depth: 0 }, { entry: file, depth: 1 }]);
  expect(treeRows([folder, file], new Set([folder.id]), "")).toEqual([{ entry: folder, depth: 0 }]);
  expect(treeRows([folder, file], new Set([folder.id]), "pdf")).toEqual([{ entry: folder, depth: 0 }, { entry: file, depth: 1 }]);
});
