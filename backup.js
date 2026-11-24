// The export file format and the rules for importing one. Uses normalizeGroup()
// and newGroupId() from storage.js. These functions don't touch the page or
// storage, so the test page can check them directly.

const EXPORT_FORMAT = "website-groups";

// The export file's contents and its suggested name (with the local date).
function buildExport(groups, now = new Date()) {
  const pad = n => String(n).padStart(2, "0");
  return {
    filename: `website-groups-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`,
    data: {
      format: EXPORT_FORMAT,
      version: 1,
      exportedAt: now.toISOString(),
      groups: groups.map(({ name, icon, color, entries }) => ({ name, icon, color, entries }))
    }
  };
}

// Reads an export file's text. Accepts the export format above, or a bare list
// of groups. existingCount is how many groups there are already, so imported
// groups without a colour carry on the colour rotation. Throws an Error with a
// message for the user when the file can't be used.
function parseImport(text, existingCount = 0) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("That file isn't a Website Groups export. Choose a .json file exported from Website Groups.");
  }
  const list = Array.isArray(data) ? data : data && data.groups;
  if (!Array.isArray(list)) {
    throw new Error("That file doesn't contain any groups. Choose a file exported from Website Groups.");
  }
  const valid = list.filter(g => g && typeof g === "object" && Array.isArray(g.entries));
  if (!valid.length) throw new Error("No groups were found in that file.");
  // Imported groups always get new ids so they can't clash with existing ones.
  return valid.map((g, i) => normalizeGroup({ ...g, id: newGroupId() + i }, existingCount + i));
}

// Adds imported groups to the existing ones. A group with the same name
// (ignoring case) is updated in place, keeping its id; the rest are added.
// Counts only groups that actually changed as updated.
function mergeGroups(existing, imported) {
  const result = existing.map(g => ({ ...g }));
  let added = 0, updated = 0;
  for (const g of imported) {
    const match = result.find(r => r.name.toLowerCase() === g.name.toLowerCase());
    if (match) {
      const before = JSON.stringify(match);
      Object.assign(match, { icon: g.icon, color: g.color, entries: g.entries });
      if (JSON.stringify(match) !== before) updated++;
    } else {
      result.push(g);
      added++;
    }
  }
  return { result, added, updated };
}
