// Tests for matching.js, backup.js and storage.js. Run them with
// "python tests/run.py", or open tests/test.html in Chrome.

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

function assertEqual(actual, expected, label = "") {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${label ? label + ": " : ""}expected ${e}, got ${a}`);
}

async function assertRejects(promiseOrFn, messagePart) {
  try {
    await (typeof promiseOrFn === "function" ? promiseOrFn() : promiseOrFn);
  } catch (err) {
    if (messagePart && !String(err.message).includes(messagePart)) {
      throw new Error(`expected an error containing "${messagePart}", got "${err.message}"`);
    }
    return;
  }
  throw new Error("expected an error, but none was thrown");
}

const tab = (id, url, extra = {}) => ({ id, url, index: id, pinned: false, ...extra });
const group = (name, entries, extra = {}) => ({ id: name.toLowerCase(), name, icon: "star", color: "blue", entries, ...extra });

// ---- matching.js ----

test("toKeyword strips the scheme, www and case", () => {
  assertEqual(toKeyword("  https://www.Intouch.org/Read "), "intouch.org/read");
  assertEqual(toKeyword("bible"), "bible");
});

test("site entries match the site and its subdomains only", () => {
  const cases = [
    ["x.com", "https://x.com/home", true],
    ["x.com", "https://www.dropbox.com/", false],
    ["x.com", "https://www.netflix.com/", false],
    ["X.COM", "https://x.com/", true],
    ["facebook.com", "https://m.facebook.com/x", true],
    ["facebook.com", "https://notfacebook.com/", false],
    ["https://www.bbc.com/news", "https://www.bbc.com/news/world-123", true],
    ["https://www.bbc.com/news", "https://www.bbc.com/sport", false],
    ["desiringgod.org/solid-joys", "https://www.desiringgod.org/solid-joys/abc", true],
    ["desiringgod.org/solid-joys", "https://www.desiringgod.org/articles", false]
  ];
  for (const [entry, url, expected] of cases) assertEqual(makeMatcher(entry)(url), expected, `${entry} vs ${url}`);
});

test("keyword entries match anywhere in the address", () => {
  assertEqual(makeMatcher("bible")("https://www.BibleGateway.com/"), true);
  assertEqual(makeMatcher("bible")("https://example.com/"), false);
});

test("blank entries have no matcher", () => {
  assertEqual(makeMatcher("   "), null);
});

test("toUrl adds https:// only when there's no scheme", () => {
  assertEqual(toUrl("cnbc.com"), "https://cnbc.com");
  assertEqual(toUrl(" http://example.com/a "), "http://example.com/a");
});

test("tabsInGroup includes tabs that haven't started loading", () => {
  const tabs = [tab(1, "https://x.com/"), tab(2, "", { pendingUrl: "https://facebook.com/" }), tab(3, "https://cnbc.com/")];
  assertEqual(tabsInGroup(tabs, group("Social", ["x.com", "facebook.com"])).map(t => t.id), [1, 2]);
});

test("countOpen counts entries with a tab open, not tabs", () => {
  const tabs = [tab(1, "https://facebook.com/a"), tab(2, "https://m.facebook.com/b"), tab(3, "https://cnbc.com/")];
  assertEqual(countOpen(group("Social", ["x.com", "facebook.com"]), tabs), 1);
});

test("sortPlan orders by group, then entry, keeping pinned tabs first", () => {
  const tabs = [
    tab(0, "https://pinned.example/", { pinned: true }), tab(1, "https://github.com/"), tab(2, "https://facebook.com/feed"),
    tab(3, "https://www.wsj.com/a"), tab(4, "https://mail.google.com/"), tab(5, "https://x.com/home"),
    tab(6, "https://www.cnbc.com/b"), tab(7, "https://docs.google.com/")
  ];
  const groups = [group("News", ["cnbc.com", "wsj.com"]), group("Social", ["x.com", "facebook.com"]), group("Work", ["mail.google.com"])];
  assertEqual(sortPlan(tabs, groups), { startIndex: 1, matchedIds: [6, 3, 5, 2, 4], alreadySorted: false });
});

test("sortPlan notices when tabs are already sorted", () => {
  const tabs = [tab(0, "https://cnbc.com/"), tab(1, "https://x.com/"), tab(2, "https://github.com/")];
  const plan = sortPlan(tabs, [group("News", ["cnbc.com"]), group("Social", ["x.com"])]);
  assertEqual(plan.alreadySorted, true);
});

test("sortPlan gives a tab to the first group that matches it", () => {
  const tabs = [tab(0, "https://github.com/"), tab(1, "https://cnbc.com/")];
  const plan = sortPlan(tabs, [group("A", ["cnbc.com"]), group("B", ["cnbc.com", "github.com"])]);
  assertEqual(plan.matchedIds, [1, 0]);
});

test("sortPlan returns null when no tab matches", () => {
  assertEqual(sortPlan([tab(0, "https://github.com/")], [group("News", ["cnbc.com"])]), null);
});

// ---- backup.js ----

test("buildExport uses the local date and leaves out ids", () => {
  const { filename, data } = buildExport([group("News", ["cnbc.com"])], new Date(2026, 0, 5, 23, 30));
  assertEqual(filename, "website-groups-2026-01-05.json");
  assertEqual(data.format, "website-groups");
  assertEqual(data.groups, [{ name: "News", icon: "star", color: "blue", entries: ["cnbc.com"] }]);
});

test("parseImport rejects files that aren't exports", async () => {
  await assertRejects(() => parseImport("not json"), "isn't a Website Groups export");
  await assertRejects(() => parseImport('{"hello": 1}'), "doesn't contain any groups");
  await assertRejects(() => parseImport('{"groups": [{"name": "No entries"}]}'), "No groups were found");
});

test("parseImport accepts a bare list, fills in missing details and gives new ids", () => {
  const imported = parseImport('[{"name": " News ", "entries": ["cnbc.com", " ", 5]}, {"entries": []}]', 2);
  assertEqual(imported.map(g => [g.name, g.icon, g.color, g.entries]),
    [["News", "star", "coral", ["cnbc.com"]], ["Untitled", "star", "pink", []]]);
  assertEqual(new Set(imported.map(g => g.id)).size, 2, "ids are unique");
});

test("mergeGroups updates groups with the same name and adds the rest", () => {
  const existing = [group("News", ["cnbc.com"]), group("Work", ["mail.google.com"])];
  const imported = [group("news", ["cnbc.com", "wsj.com"], { id: "new1" }), group("Work", ["mail.google.com"], { id: "new2" }),
    group("Shopping", ["amazon.com"], { id: "new3" })];
  const { result, added, updated } = mergeGroups(existing, imported);
  assertEqual([added, updated], [1, 1]);
  assertEqual(result.map(g => [g.id, g.name, g.entries.length]), [["news", "News", 2], ["work", "Work", 1], ["new3", "Shopping", 1]]);
  assertEqual(existing[0].entries.length, 1, "existing groups aren't changed");
});

// ---- storage.js ----

test("a fresh install starts with only Social media", async () => {
  fakeChrome.reset();
  const groups = await loadGroups();
  assertEqual(groups.map(g => [g.name, g.entries]), [["Social media", ["x.com", "facebook.com"]]]);
  assertEqual(fakeChrome.sync.seededIds, ["social-media"]);
});

test("a deleted default group doesn't come back", async () => {
  fakeChrome.reset({ groupOrder: [], seededIds: ["social-media"] });
  assertEqual(await loadGroups(), []);
});

test("old single-list storage is converted to one item per group", async () => {
  fakeChrome.reset({ groups: [{ id: "a", name: "Mine", entries: ["cnbc.com"] }], seededIds: ["social-media"] });
  const groups = await loadGroups();
  assertEqual(groups.map(g => g.name), ["Mine"]);
  assertEqual(Object.keys(fakeChrome.sync).sort(), ["group:a", "groupOrder", "seededIds"]);
  assertEqual(fakeChrome.sync["group:a"].icon, "star", "missing icon is filled in");
});

test("a leftover old list is ignored once converted", async () => {
  fakeChrome.reset({ groups: [{ id: "old", name: "Old", entries: [] }], groupOrder: ["a"], seededIds: ["social-media"],
    "group:a": group("A", ["cnbc.com"], { id: "a" }) });
  assertEqual((await loadGroups()).map(g => g.name), ["A"]);
});

test("saveGroup, saveGroupOrder and removeGroup keep storage in step", async () => {
  fakeChrome.reset({ groupOrder: [], seededIds: ["social-media"] });
  const a = group("A", ["a.com"], { id: "a" }), b = group("B", ["b.com"], { id: "b" });
  await saveGroup(a, [a]);
  await saveGroup(b, [a, b]);
  await saveGroupOrder([b, a]);
  assertEqual((await loadGroups()).map(g => g.id), ["b", "a"]);
  await removeGroup("b", [a]);
  assertEqual(fakeChrome.sync.groupOrder, ["a"]);
  assertEqual("group:b" in fakeChrome.sync, false);
});

test("saveAllGroups replaces everything and cleans up old items", async () => {
  fakeChrome.reset({ groupOrder: ["a"], "group:a": group("A", [], { id: "a" }), seededIds: ["social-media"] });
  await saveAllGroups([group("B", [], { id: "b" })]);
  assertEqual(Object.keys(fakeChrome.sync).sort(), ["group:b", "groupOrder", "seededIds"]);
});

test("a group over 8 KB is refused with a clear message", async () => {
  fakeChrome.reset({ groupOrder: [], seededIds: ["social-media"] });
  const huge = group("Huge", Array.from({ length: 400 }, (_, i) => `https://example${i}.com/some/long/path`));
  let message = "";
  try { await saveGroup(huge, [huge]); } catch (err) { message = storageErrorMessage(err); }
  assertEqual(message, "This group is too big to save. Try splitting it into two groups.");
});

// ---- runner ----

(async () => {
  const lines = [];
  let failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      lines.push(`PASS  ${t.name}`);
    } catch (err) {
      failed++;
      lines.push(`FAIL  ${t.name}\n      ${err.message}`);
    }
  }
  lines.push("", `${tests.length - failed} passed, ${failed} failed`);
  document.getElementById("results").textContent = lines.join("\n");
  document.body.dataset.result = failed ? "fail" : "pass";
  document.title = failed ? `${failed} failed` : "All tests passed";
})();
