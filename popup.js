// The toolbar popup. Uses storage.js, matching.js, ui.js and icons.js.

let groups = [];
let editingId = null;
let confirmingId = null; // group whose card is showing the delete confirmation
let editIcon, editColor;
statusAutoHideMs = 5000;

async function openGroup(group) {
  for (const entry of group.entries) {
    await chrome.tabs.create({ url: toUrl(entry), active: false });
  }
  setStatus(`Opened ${plural(group.entries.length, "tab")} from ${group.name}`);
  await renderList();
}

async function closeGroup(group) {
  const toClose = tabsInGroup(await chrome.tabs.query({}), group);
  if (toClose.length) await chrome.tabs.remove(toClose.map(t => t.id));
  setStatus(toClose.length
    ? `Closed ${plural(toClose.length, "tab")} from ${group.name}`
    : `No open tabs match ${group.name}`);
  await renderList();
}

// Moves the current window's tabs into group order. See sortPlan() in matching.js.
async function sortTabs() {
  if (!groups.length) {
    setStatus("Create a group first to sort tabs");
    return;
  }
  const plan = sortPlan(await chrome.tabs.query({ currentWindow: true }), groups);
  if (!plan) {
    setStatus("No open tabs match your groups");
    return;
  }
  if (plan.alreadySorted) {
    setStatus("Tabs are already sorted");
    return;
  }
  try {
    await chrome.tabs.move(plan.matchedIds, { index: plan.startIndex });
    setStatus(`Sorted ${plural(plan.matchedIds.length, "tab")}`);
  } catch (err) {
    setStatus("Couldn't sort tabs: " + (err && err.message || err), true);
  }
}

async function renderList() {
  const tabs = await chrome.tabs.query({});
  $("tabCount").textContent = plural(tabs.length, "tab") + " open";
  const container = $("groups");
  container.replaceChildren();
  if (!groups.length) {
    container.innerHTML = `
      <div class="empty">
        <b>Create your first group</b>
        A group is a list of sites you can open or close together.<br>
        <button class="btn primary">${icon("plus")}New group</button>
      </div>`;
    container.querySelector("button").onclick = () => showEdit(null);
  }
  groups.forEach((group, i) => container.append(renderCard(group, i, tabs)));
  $("listView").classList.remove("hidden");
  $("editView").classList.add("hidden");
}

// One group's card: icon, name, open count, Open and Close, and the ⋮ menu.
function renderCard(group, index, tabs) {
  const card = document.createElement("div");
  card.className = `group c-${group.color}`;
  if (group.id === confirmingId) {
    renderConfirm(card, group);
    return card;
  }
  const open = countOpen(group, tabs);
  const total = group.entries.length;
  card.innerHTML = `
    <div class="top">
      <div class="tile">${icon(group.icon)}</div>
      <div class="info">
        <div class="name"></div>
        <div class="sub ${open ? "" : "none"}">${open ? `${open} of ${total} open` : "None open"}</div>
      </div>
      <button class="btn open">${icon("browserPlus")}Open</button>
      <button class="btn close">${icon("browserX")}Close</button>
      <button class="btn icon ghost more" aria-label="More options" title="More options">${icon("dots")}</button>
    </div>
    <div class="bar"><div style="width:${total ? Math.round(open / total * 100) : 0}%"></div></div>
    <div class="menu hidden">
      <button class="edit">${icon("pencil")}Edit</button>
      ${index > 0 ? `<button class="moveUp">${icon("arrowUp")}Move up</button>` : ""}
      ${index < groups.length - 1 ? `<button class="moveDown">${icon("arrowDown")}Move down</button>` : ""}
      <button class="delete danger">${icon("trash")}Delete</button>
    </div>`;
  card.querySelector(".name").textContent = group.name;
  card.querySelector(".info").title = group.entries.join("\n");
  card.querySelector(".open").title = `Open all ${plural(total, "site")}`;
  card.querySelector(".close").title = "Close tabs on these sites";

  const on = (selector, handler) => {
    const el = card.querySelector(selector);
    if (el) el.onclick = handler;
  };
  on(".open", () => openGroup(group));
  on(".close", () => closeGroup(group));
  on(".more", e => {
    e.stopPropagation();
    const menu = card.querySelector(".menu");
    const wasHidden = menu.classList.contains("hidden");
    closeMenus();
    menu.classList.toggle("hidden", !wasHidden);
  });
  on(".edit", () => showEdit(group.id));
  on(".moveUp", () => moveGroup(group.id, -1));
  on(".moveDown", () => moveGroup(group.id, 1));
  on(".delete", () => askDelete(group.id));
  return card;
}

function closeMenus() {
  document.querySelectorAll(".menu").forEach(m => m.classList.add("hidden"));
}
document.addEventListener("click", e => {
  if (!e.target.closest(".menu")) closeMenus();
});

// Inline confirmation instead of confirm(), which can close an extension popup.
function renderConfirm(card, group) {
  card.classList.add("confirm");
  card.innerHTML = `
    <div class="top">
      ${icon("trash")}
      <div class="info name"></div>
      <button class="btn danger yes">Delete</button>
      <button class="btn no">Cancel</button>
    </div>`;
  card.querySelector(".name").textContent = `Delete "${group.name}"?`;
  card.querySelector(".yes").onclick = () => deleteGroup(group.id);
  card.querySelector(".no").onclick = () => askDelete(null);
}

function askDelete(id) {
  confirmingId = id;
  renderList();
}

async function moveGroup(id, delta) {
  const i = groups.findIndex(g => g.id === id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= groups.length) return;
  const updated = [...groups];
  [updated[i], updated[j]] = [updated[j], updated[i]];
  try {
    await saveGroupOrder(updated);
    groups = updated;
  } catch (err) {
    setStatus(storageErrorMessage(err), true);
  }
  renderList();
}

async function deleteGroup(id) {
  const group = groups.find(g => g.id === id);
  const remaining = groups.filter(g => g.id !== id);
  confirmingId = null;
  try {
    await removeGroup(id, remaining);
    groups = remaining;
    setStatus(`Deleted ${group.name}`);
  } catch (err) {
    setStatus(storageErrorMessage(err), true);
  }
  renderList();
}

function renderPickers() {
  $("iconPicker").innerHTML = GROUP_ICONS.map(n =>
    `<button class="opt c-${editColor} ${n === editIcon ? "sel" : ""}" data-v="${n}" title="${n}" aria-label="${n}">${icon(n)}</button>`
  ).join("");
  $("colorPicker").innerHTML = COLORS.map(c =>
    `<button class="swatch c-${c} ${c === editColor ? "sel" : ""}" data-v="${c}" title="${c}" aria-label="${c}"></button>`
  ).join("");
}

$("iconPicker").onclick = e => {
  const b = e.target.closest("button");
  if (b) { editIcon = b.dataset.v; renderPickers(); }
};
$("colorPicker").onclick = e => {
  const b = e.target.closest("button");
  if (b) { editColor = b.dataset.v; renderPickers(); }
};

function showEdit(id) {
  editingId = id;
  confirmingId = null;
  setStatus("");
  const group = groups.find(g => g.id === id);
  $("editTitle").textContent = group ? "Edit group" : "New group";
  $("editName").value = group ? group.name : "";
  $("editEntries").value = group ? group.entries.join("\n") : "";
  editIcon = group ? group.icon : "star";
  editColor = group ? group.color : COLORS[groups.length % COLORS.length];
  renderPickers();
  $("deleteGroup").classList.toggle("hidden", !group);
  $("listView").classList.add("hidden");
  $("editView").classList.remove("hidden");
  $("editName").focus();
}

$("sortTabs").onclick = sortTabs;
$("addGroup").onclick = () => showEdit(null);
$("cancelEdit").onclick = renderList;
$("backEdit").onclick = renderList;
$("openBackup").onclick = () => chrome.runtime.openOptionsPage();

$("saveGroup").onclick = async () => {
  const existing = groups.find(g => g.id === editingId);
  const group = {
    id: existing ? existing.id : newGroupId(),
    name: $("editName").value.trim() || "Untitled",
    icon: editIcon,
    color: editColor,
    entries: $("editEntries").value.split("\n").map(s => s.trim()).filter(Boolean)
  };
  const updated = existing
    ? groups.map(g => g.id === group.id ? group : g)
    : [...groups, group];
  try {
    await saveGroup(group, updated);
  } catch (err) {
    // Stay on the edit screen so nothing typed is lost.
    setStatus(storageErrorMessage(err), true);
    return;
  }
  groups = updated;
  setStatus(`Saved ${group.name}`);
  renderList();
};

// Back to the list, with this group's card asking for confirmation.
$("deleteGroup").onclick = () => askDelete(editingId);

fillIcons();
loadGroups()
  .then(loaded => { groups = loaded; })
  .catch(err => setStatus(storageErrorMessage(err), true))
  .then(renderList);
