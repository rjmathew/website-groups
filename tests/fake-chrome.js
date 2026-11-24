// A stand-in for the parts of the chrome.* API that storage.js uses, so tests
// can run on a normal web page. Sync storage keeps Chrome's 8 KB per-item limit.

const fakeChrome = {
  sync: {},
  listeners: [],

  // Starts each test from a known storage state.
  reset(initial = {}) {
    this.sync = JSON.parse(JSON.stringify(initial));
    this.listeners = [];
  }
};

window.chrome = {
  storage: {
    onChanged: { addListener: f => fakeChrome.listeners.push(f) },
    sync: {
      async get(keys) {
        const all = JSON.parse(JSON.stringify(fakeChrome.sync));
        if (keys === null || keys === undefined) return all;
        return Object.fromEntries([].concat(keys).filter(k => k in all).map(k => [k, all[k]]));
      },
      async set(items) {
        for (const [k, v] of Object.entries(items)) {
          if (k.length + JSON.stringify(v).length > 8192) {
            throw new Error("QUOTA_BYTES_PER_ITEM quota exceeded");
          }
        }
        Object.assign(fakeChrome.sync, JSON.parse(JSON.stringify(items)));
        const changes = Object.fromEntries(Object.keys(items).map(k => [k, {}]));
        fakeChrome.listeners.forEach(f => f(changes, "sync"));
      },
      async remove(keys) {
        [].concat(keys).forEach(k => delete fakeChrome.sync[k]);
      }
    }
  }
};
