// Small helpers shared by the popup and the backup page. Uses icon() from icons.js.

const $ = id => document.getElementById(id);

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// Non-error messages disappear after this many milliseconds; 0 keeps them.
let statusAutoHideMs = 0;
let statusTimer;

// Shows a message in the page's #status bar, or hides the bar when msg is empty.
function setStatus(msg, isError = false) {
  clearTimeout(statusTimer);
  $("statusText").textContent = msg;
  $("status").classList.toggle("hidden", !msg);
  $("status").classList.toggle("error", isError);
  $("status").firstElementChild.innerHTML = icon(isError ? "alert" : "check");
  if (msg && !isError && statusAutoHideMs) {
    statusTimer = setTimeout(() => setStatus(""), statusAutoHideMs);
  }
}
