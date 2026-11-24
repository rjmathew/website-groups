// Deciding which tabs belong to a group. These functions only work on plain
// data (groups and tab objects), so the test page can check them directly.

// "https://www.intouch.org/read" -> "intouch.org/read", so matching works whether
// the entry was typed as a full URL or a bare keyword.
function toKeyword(entry) {
  return entry.trim().toLowerCase().replace(/^[a-z]+:\/\//, "").replace(/^www\./, "");
}

// Returns a function that tests whether a URL matches the entry, or null for a
// blank entry. Entries that look like a web address ("x.com", "bbc.com/news")
// match that site and its subdomains only, so "x.com" doesn't also match
// dropbox.com. Anything else ("bible") matches anywhere in the address.
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

// The address Open uses for an entry.
function toUrl(entry) {
  const e = entry.trim();
  return /^[a-z]+:\/\//i.test(e) ? e : "https://" + e;
}

// A tab's address. pendingUrl covers tabs that were just created and haven't
// started loading yet, so Close and the counts see them straight away.
function tabUrl(tab) {
  return tab.url || tab.pendingUrl || "";
}

// One matcher per non-blank entry, in the group's entry order.
function groupMatchers(group) {
  return group.entries.map(makeMatcher).filter(Boolean);
}

function tabMatches(tab, matcher) {
  const url = tabUrl(tab);
  return Boolean(url) && matcher(url);
}

// The tabs that Close would close for this group.
function tabsInGroup(tabs, group) {
  const matchers = groupMatchers(group);
  return tabs.filter(t => matchers.some(m => tabMatches(t, m)));
}

// How many of the group's entries have at least one matching tab open.
function countOpen(group, tabs) {
  return groupMatchers(group).filter(m => tabs.some(t => tabMatches(t, m))).length;
}

// Works out how Sort should rearrange one window's tabs: groups in order, each
// group's tabs in entry order, then tabs that match no group. Pinned tabs keep
// their slots at the start. Returns null when no tab matches any group.
//   startIndex:    where the matched tabs go (just after the pinned tabs)
//   matchedIds:    the matched tab ids, in their new order
//   alreadySorted: true when the tabs are already in that order
function sortPlan(tabs, groups) {
  const ordered = [...tabs].sort((a, b) => a.index - b.index);
  const unpinned = ordered.filter(t => !t.pinned);
  const claimed = new Set();
  const matchedIds = [];
  for (const group of groups) {
    for (const m of groupMatchers(group)) {
      for (const tab of unpinned) {
        if (!claimed.has(tab.id) && tabMatches(tab, m)) {
          claimed.add(tab.id);
          matchedIds.push(tab.id);
        }
      }
    }
  }
  if (!matchedIds.length) return null;
  const desiredIds = [...matchedIds, ...unpinned.filter(t => !claimed.has(t.id)).map(t => t.id)];
  return {
    startIndex: ordered.length - unpinned.length,
    matchedIds,
    alreadySorted: unpinned.every((t, i) => t.id === desiredIds[i])
  };
}
