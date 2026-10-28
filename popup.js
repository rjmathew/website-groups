// Uses DEFAULT_GROUPS, COLORS, GROUP_ICONS and the storage functions from
// storage.js, and icon() from icons.js.

const $ = id => document.getElementById(id);
let groups = [];
let editingId = null;
let confirmingId = null; // group whose card is showing the delete confirmation
let editIcon, editColor;
let statusTimer;

function setStatus(msg, isError = false) {
  clearTimeout(statusTimer);
  $("statusText").textContent = msg;
  $("status").classList.toggle("hidden", !msg);
  $("status").classList.toggle("error", isError);
  $("status").firstElementChild.innerHTML = icon(isError ? "alert" : "check");
  if (msg && !isError) statusTimer = setTimeout(() => setStatus(""), 5000);
}

// "https://www.intouch.org/read" -> "intouch.org/read", so matching works whether
// the entry was typed as a full URL or a bare keyword.
function toKeyword(entry) {
  return entry.trim().toLowerCase().replace(/^[a-z]+:\/\//, "").replace(/^www\./, "");
}

// Returns a function that tests whether a tab's URL matches the entry.
// Entries that look like a web address ("x.com", "bbc.com/news") match that site
// and its subdomains only, so "x.com" doesn't also match dropbox.com. Anything
// else ("bible") matches anywhere in the address.
function makeMatcher(entry) {
  const k = toKeyword(entry);
  if (!k) return null;
  const site = k.match(/^([a-z0-9-]+(?:\.[a-z0-9-]+)+)(\/.*)?$/);
  if (!site) return url => url.toLowerCase().includes(k);
  const [, domain, path = ""] = site;
  return url => {
    let u;
    try { u = new URL(url); } catch { return false; }
    const host = u.hostname.replace(/^www\./, "");
    if (host !== domain && !host.endsWith("." + domain)) return false;
    return (u.pathname + u.search).toLowerCase().startsWith(path);
  };
}

function toUrl(entry) {
  const e = entry.trim();
  return /^[a-z]+:\/\//i.test(e) ? e : "https://" + e;
}

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

async function openGroup(group) {
  for (const entry of group.entries) {
    await chrome.tabs.create({ url: toUrl(entry), active: false });
  }
  setStatus(`Opened ${plural(group.entries.length, "tab")} from ${group.name}`);
  await renderList();
}

async function closeGroup(group) {
  const matchers = group.entries.map(makeMatcher).filter(Boolean);
  const tabs = await chrome.tabs.query({});
  const toClose = tabs.filter(t => t.url && matchers.some(m => m(t.url)));
  if (toClose.length) await chrome.tabs.remove(toClose.map(t => t.id));
  setStatus(toClose.length
    ? `Closed ${plural(toClose.length, "tab")} from ${group.name}`
    : `No open tabs match ${group.name}`);
  await renderList();
}

// How many of the group's entries have at least one matching tab open.
function countOpen(group, urls) {
  return group.entries.filter(entry => {
    const m = makeMatcher(entry);
    return m && urls.some(m);
  }).length;
}

async function renderList() {
  const tabs = await chrome.tabs.query({});
  // pendingUrl covers tabs we just created that haven't started loading yet.
  const urls = tabs.map(t => (t.url || t.pendingUrl || "").toLowerCase());
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
  for (const group of groups) {
    const card = document.createElement("div");
    card.className = `group c-${group.color}`;
    if (group.id === confirmingId) {
      renderConfirm(card, group);
      container.append(card);
      continue;
    }
    const open = countOpen(group, urls);
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
        <button class="delete danger">${icon("trash")}Delete</button>
      </div>`;
    const name = card.querySelector(".name");
    name.textContent = group.name;
    card.querySelector(".info").title = group.entries.join("\n");
    card.querySelector(".open").title = `Open all ${plural(total, "site")}`;
    card.querySelector(".close").title = "Close tabs on these sites";
    card.querySelector(".open").onclick = () => openGroup(group);
    card.querySelector(".close").onclick = () => closeGroup(group);
    card.querySelector(".more").onclick = e => {
      e.stopPropagation();
      const menu = card.querySelector(".menu");
      const wasHidden = menu.classList.contains("hidden");
      closeMenus();
      menu.classList.toggle("hidden", !wasHidden);
    };
    card.querySelector(".edit").onclick = () => showEdit(group.id);
    card.querySelector(".delete").onclick = () => askDelete(group.id);
    container.append(card);
  }
  $("listView").classList.remove("hidden");
  $("editView").classList.add("hidden");
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
