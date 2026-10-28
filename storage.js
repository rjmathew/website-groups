// Group storage shared by the popup and the backup page.
//
// Each group is saved as its own chrome.storage.sync item ("group:<id>"), with
// "groupOrder" holding the ids in display order. Sync storage allows about 8 KB
// per item, so this keeps the limit per group instead of for all groups together.

// The group new installs start with. Installs that already have groups keep them.
const DEFAULT_GROUPS = [
  {
    id: "social-media",
    name: "Social media",
    icon: "message",
    color: "coral",
    entries: [
      "x.com",
      "facebook.com"
    ]
  }
];

const GROUP_ICONS = ["book", "news", "briefcase", "message", "star", "home", "code", "heart", "music", "cart"];
const COLORS = ["purple", "teal", "coral", "pink", "blue", "green", "amber", "gray"];

const groupKey = id => "group:" + id;
const newGroupId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// Fills in a missing icon or colour (groups saved before icons existed, or
// imported from a file) and drops anything that isn't a usable entry.
function normalizeGroup(g, index) {
  const def = DEFAULT_GROUPS.find(d => d.id === g.id);
  return {
    id: g.id || newGroupId(),
    name: String(g.name || "Untitled").trim() || "Untitled",
    icon: GROUP_ICONS.includes(g.icon) ? g.icon : def ? def.icon : "star",
    color: COLORS.includes(g.color) ? g.color : def ? def.color : COLORS[index % COLORS.length],
    entries: (Array.isArray(g.entries) ? g.entries : [])
      .filter(e => typeof e === "string").map(e => e.trim()).filter(Boolean)
  };
}

async function loadGroups() {
  const all = await chrome.storage.sync.get(null);
  const seededIds = all.seededIds || [];
  let groups;
  let changed = false;

  if (Array.isArray(all.groups) && !all.groupOrder) {
    // Version 3.0 and earlier saved every group in one "groups" item. Once
    // groupOrder exists the conversion has happened, and a "groups" item still
    // there is only waiting to be cleaned up.
    groups = all.groups;
    changed = true;
  } else {
    // groupOrder decides which groups exist; a "group:" item not listed there is
    // left over from a delete or replace that's still finishing, so it's ignored.
    groups = (all.groupOrder || []).map(id => all[groupKey(id)]).filter(Boolean);
  }

  // Add any default group not seeded before, so new examples show up on existing
  // installs without bringing back defaults the user deleted.
  const unseeded = DEFAULT_GROUPS.filter(d => !seededIds.includes(d.id));
  if (unseeded.length) {
    groups.push(...unseeded.filter(d => !groups.some(g => g.id === d.id)));
    changed = true;
  }

  const normalized = groups.map(normalizeGroup);
  if (JSON.stringify(normalized) !== JSON.stringify(groups)) changed = true;

  if (changed) {
    await saveAllGroups(normalized, [...new Set([...seededIds, ...DEFAULT_GROUPS.map(d => d.id)])]);
  }
  return normalized;
}

// Saves one group plus the order of all groups.
async function saveGroup(group, groups) {
  await chrome.storage.sync.set({
    [groupKey(group.id)]: group,
    groupOrder: groups.map(g => g.id)
  });
}

async function removeGroup(id, groups) {
  await chrome.storage.sync.set({ groupOrder: groups.map(g => g.id) });
  await chrome.storage.sync.remove(groupKey(id));
}

// Replaces everything that's saved with this list of groups.
async function saveAllGroups(groups, seededIds) {
  const items = { groupOrder: groups.map(g => g.id) };
  if (seededIds) items.seededIds = seededIds;
  for (const g of groups) items[groupKey(g.id)] = g;
  // Write first, then clean up, so a failed write never loses the old data.
  await chrome.storage.sync.set(items);
  const keep = new Set(Object.keys(items));
  const existing = Object.keys(await chrome.storage.sync.get(null));
  const stale = existing.filter(k => k === "groups" || (k.startsWith("group:") && !keep.has(k)));
  if (stale.length) await chrome.storage.sync.remove(stale);
}

// Turns a storage error into something the user can act on.
function storageErrorMessage(err) {
  const msg = String(err && err.message || err);
  if (msg.includes("QUOTA_BYTES_PER_ITEM")) return "This group is too big to save. Try splitting it into two groups.";
  if (msg.includes("QUOTA_BYTES")) return "There isn't enough room to save. Try removing some groups.";
  if (msg.includes("MAX_ITEMS")) return "You've reached the maximum number of groups.";
  if (msg.includes("MAX_WRITE_OPERATIONS")) return "Too many changes in a short time. Wait a minute and try again.";
  return "Couldn't save: " + msg;
}
