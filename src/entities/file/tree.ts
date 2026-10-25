import type { FileEntry } from "./api/files";

export function creationTarget(selected: FileEntry | undefined, isFile: boolean) {
  return {
    parent: selected ? selected.is_file ? selected.parent_id : selected.id : null,
    // RMS sorts ascending: a larger value places the new file below the selected file.
    priority: isFile && selected?.is_file ? selected.priority + 1 : 0
  };
}

export function treeRows(entries: FileEntry[], collapsed: Set<string>, search: string) {
  const children = new Map<string | null, FileEntry[]>();
  for (const entry of entries) {
    const list = children.get(entry.parent_id) ?? [];
    list.push(entry);
    children.set(entry.parent_id, list);
  }
  const query = search.trim().toLocaleLowerCase();
  const included = new Set<string>();
  const byId = new Map(entries.map(entry => [entry.id, entry]));
  if (query) for (const entry of entries) {
    if (!entry.name.toLocaleLowerCase().includes(query)) continue;
    let current: FileEntry | undefined = entry;
    while (current && !included.has(current.id)) {
      included.add(current.id);
      current = current.parent_id ? byId.get(current.parent_id) : undefined;
    }
  }
  const rows: { entry: FileEntry; depth: number }[] = [];
  const visited = new Set<string>();
  function walk(parent: string | null, depth: number) {
    for (const entry of children.get(parent) ?? []) {
      if (visited.has(entry.id) || (query && !included.has(entry.id))) continue;
      visited.add(entry.id);
      rows.push({ entry, depth });
      if (!entry.is_file && (query || !collapsed.has(entry.id))) walk(entry.id, depth + 1);
    }
  }
  walk(null, 0);
  return rows;
}
