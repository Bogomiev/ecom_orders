import { expect, it } from "vitest";
import type { FileEntry } from "../../../entities/file/api/files";
import { filesInFolder, folderPath, isFresh, documentTitle } from "./documents";
function entry(id: string, parent_id: string | null, is_file = false, name = id): FileEntry {
  return { id, parent_id, is_file, name, priority: 0, icon: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), deleted_at: null };
}
const root = entry("root", null);
const nested = entry("nested", "root");
const pdf = entry("pdf", "nested", true, "Бланк.pdf");
const html = entry("html", "root", true, "Инструкция.html");
const entries = [root, nested, pdf, html, entry("other", null, true, "Other.pdf"), { ...entry("deleted", "root", true, "Deleted.pdf"), deleted_at: "2026-01-01" }];
it("counts active documents recursively for each directory", () => {
  expect(filesInFolder(entries, "root").map(e => e.id)).toEqual(["pdf", "html"]);
  expect(filesInFolder(entries, "nested").map(e => e.id)).toEqual(["pdf"]);
  expect(filesInFolder(entries, null)).toHaveLength(3);
});
it("updates counts for case-insensitive search", () => {
  expect(filesInFolder(entries, "root", "БЛАНК")).toEqual([pdf]);
  expect(filesInFolder(entries, "nested", "инструкция")).toEqual([]);
});
it("resolves the complete ancestor path and stops cycles", () => {
  expect(folderPath(pdf, entries)).toEqual([root, nested]);
  expect(folderPath(pdf, [{ ...nested, parent_id: "nested" }, pdf])).toHaveLength(1);
});
it("marks documents updated within fourteen days, including the boundary", () => {
  const now = Date.parse("2026-10-25T00:00:00Z");
  expect(isFresh({ ...pdf, updated_at: "2026-10-24T00:00:00Z" }, now)).toBe(true);
  expect(isFresh({ ...pdf, updated_at: "2026-10-15T00:00:00Z" }, now)).toBe(true);
  expect(isFresh({ ...pdf, updated_at: "2026-10-11T00:00:00Z" }, now)).toBe(true);
  expect(isFresh({ ...pdf, updated_at: "2026-10-10T23:59:59Z" }, now)).toBe(false);
  expect(isFresh({ ...pdf, updated_at: "2026-10-26T00:00:00Z" }, now)).toBe(false);
});

it("hides only document extensions in the viewer title", () => {
  expect(documentTitle("Инструкция.html")).toBe("Инструкция");
  expect(documentTitle("Заявление.PDF")).toBe("Заявление");
  expect(documentTitle("Версия 1.2.pdf")).toBe("Версия 1.2");
});
