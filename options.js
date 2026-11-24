// The backup page: export and import of groups. Uses storage.js, backup.js,
// ui.js and icons.js.

let groups = [];
let pendingImport = null; // groups from a file, waiting for the replace confirmation
let saving = false; // ignore our own storage changes while an import is saving

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
  const { filename, data } = buildExport(groups);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  setStatus(`Exported ${plural(groups.length, "group")}`);
};

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
    imported = parseImport(await file.text(), groups.length);
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
  const { result, added, updated } = mergeGroups(groups, imported);
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
