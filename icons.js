// Outline icons drawn on a 24x24 grid (styled by svg.i in styles.css).
const BROWSER = "M4 5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z M4 8h16";
const ICONS = {
  browserPlus: BROWSER + " M10 14h4 M12 12v4",
  browserX: BROWSER + " M10 12l4 4 M14 12l-4 4",
  dots: "M11 5a1 1 0 1 0 2 0a1 1 0 1 0-2 0 M11 12a1 1 0 1 0 2 0a1 1 0 1 0-2 0 M11 19a1 1 0 1 0 2 0a1 1 0 1 0-2 0",
  plus: "M12 5v14 M5 12h14",
  back: "M5 12h14 M5 12l6 6 M5 12l6-6",
  check: "M5 12l5 5L20 7",
  alert: "M12 9v4 M12 16v.01 M10.24 3.96L2.82 16.5a2 2 0 0 0 1.71 3h14.94a2 2 0 0 0 1.71-3L13.76 3.96a2 2 0 0 0-3.52 0z",
  pencil: "M4 20h4L18.5 9.5a2.8 2.8 0 0 0-4-4L4 16v4 M13.5 6.5l4 4",
  trash: "M4 7h16 M10 11v6 M14 11v6 M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12 M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3",
  download: "M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2 M7 11l5 5 5-5 M12 4v12",
  upload: "M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2 M7 9l5-5 5 5 M12 4v12",
  backup: "M4 6a8 3 0 1 0 16 0a8 3 0 1 0-16 0 M4 6v6a8 3 0 0 0 16 0V6 M4 12v6a8 3 0 0 0 16 0v-6",
  grid: "M4 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z M14 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z M4 15a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z M14 15a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z",
  // Group icons
  book: "M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0 M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0 M3 6v13 M12 6v13 M21 6v13",
  news: "M16 6h3a1 1 0 0 1 1 1v11a2 2 0 0 1-4 0V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v12a3 3 0 0 0 3 3h11 M8 8h4 M8 12h4 M8 16h4",
  briefcase: "M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2 M3 13a20 20 0 0 0 18 0",
  message: "M8 9h8 M8 13h6 M18 4a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-5l-5 3v-3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z",
  star: "M12 17.75l-6.17 3.24 1.18-6.87-5-4.86 6.9-1 3.09-6.25 3.09 6.25 6.9 1-5 4.86 1.18 6.87z",
  home: "M5 12H3l9-9 9 9h-2 M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7 M9 21v-6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6",
  code: "M7 8l-4 4 4 4 M17 8l4 4-4 4 M14 4l-4 16",
  heart: "M19.5 12.57L12 20l-7.5-7.43A5 5 0 1 1 12 6.01a5 5 0 1 1 7.5 6.57",
  music: "M3 17a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M13 17a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M9 17V4h10v13 M9 8h10",
  cart: "M4 19a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M15 19a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M17 17H6V3H4 M6 5l14 1-1 7H6"
};

const icon = name => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[name]}"/></svg>`;

// Fills every element marked data-icon="name" with that icon.
function fillIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach(el =>
    el.insertAdjacentHTML("afterbegin", icon(el.dataset.icon))
  );
}
