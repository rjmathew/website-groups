// Export and import of groups. Uses the storage functions from storage.js and
// icon() from icons.js.

const $ = id => document.getElementById(id);
const EXPORT_FORMAT = "website-groups";
let groups = [];
let pendingImport = null; // groups from a file, waiting for the replace confirmation
let saving = false; // ignore our own storage changes while an import is saving

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

function setStatus(msg, isError = false) {
  $("statusText").textContent = msg;
  $("status").classList.toggle("hidden", !msg);
  $("status").classList.toggle("error", isError);
  $("status").firstElementChild.innerHTML = icon(isError ? "alert" : "check");
}

function renderList() {
  const list = $("list");
  list.replaceChildren();
  if (!groups.length) {
    list.innerHTML = `<p style="margin:0">You don't have any groups yet.</p>`;
    return;
  }
  for (const g of groups) {
    const row = document.createElement("div");
    row.className = `row c-${g.color}`;
    row.innerHTML = `<div class="tile">${icon(g.icon)}</div><div class="name"></div><div class="sub"></div>`;
    row.querySelector(".name").textContent = g.name;
    row.querySelector(".sub").textContent = plural(g.entries.length, "site");
    list.append(row);
  }
}

$("export").onclick = () => {
  const data = {
    format: EXPORT_FORMAT,
    version: 1,
    exportedAt: new Date().toISOString(),
    groups: groups.map(({ name, icon, color, entries }) => ({ name, icon, color, entries }))
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  const d = new Date();
  const pad = n => String(n).padStart(2, "0");
  a.download = `website-groups-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  setStatus(`Exported ${plural(groups.length, "group")}`);
};

// Accepts this page's export format, or a bare list of groups.
function parseImport(text) {
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
  return valid.map((g, i) => normalizeGroup({ ...g, id: newGroupId() + i }, groups.length + i));
}

function mergeGroups(imported) {
  const result = groups.map(g => ({ ...g }));
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

async function applyImport(newGroups, message) {
  saving = true;
  try {
    await saveAllGroups(newGroups);
  } catch (err) {
    setStatus(storageErrorMessage(err), true);
    return;
  } finally {
    saving = false;
  }
  groups = newGroups;
  renderList();
  setStatus(message);
}

$("import").onclick = () => $("file").click();

$("file").onchange = async () => {
  const file = $("file").files[0];
  $("file").value = ""; // so choosing the same file again still triggers this
  if (!file) return;
  $("confirmReplace").classList.add("hidden");
  let imported;
  try {
    imported = parseImport(await file.text());
  } catch (err) {
    setStatus(err.message, true);
    return;
  }
  if ($("replace").checked) {
    // Replacing deletes groups, so ask first.
    pendingImport = imported;
    $("confirmText").textContent =
      `Replace your ${plural(groups.length, "group")} with the ${plural(imported.length, "group")} in ${file.name}? ` +
      "Groups that aren't in the file will be deleted.";
    $("confirmReplace").classList.remove("hidden");
    setStatus("");
    return;
  }
  const { result, added, updated } = mergeGroups(imported);
  const parts = [];
  if (added) parts.push(`added ${plural(added, "group")}`);
  if (updated) parts.push(`updated ${plural(updated, "group")}`);
  await applyImport(result, parts.length
    ? "Import complete: " + parts.join(" and ")
    : "Import complete: your groups already match the file");
};

$("confirmYes").onclick = async () => {
  $("confirmReplace").classList.add("hidden");
  const imported = pendingImport;
  pendingImport = null;
  await applyImport(imported, `Replaced your groups with ${plural(imported.length, "group")} from the file`);
};

$("confirmNo").onclick = () => {
  pendingImport = null;
  $("confirmReplace").classList.add("hidden");
};

// Keep the list current if groups change in the popup while this page is open.
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (saving || area !== "sync" || !Object.keys(changes).some(k => k === "groupOrder" || k.startsWith("group:"))) return;
  groups = await loadGroups();
  renderList();
});

fillIcons();
loadGroups()
  .then(loaded => { groups = loaded; renderList(); })
  .catch(err => setStatus(storageErrorMessage(err), true));
