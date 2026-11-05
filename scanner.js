// scanPage runs INSIDE the web page (injected by popup.js), so it must be
// fully self-contained: it cannot use anything defined outside of it.
function scanPage() {
  const MERGE_DISTANCE = 14; // colours closer than this (RGB distance) count as one
  const TOP_COLOURS = 10;
  const TOP_FONTS = 8;

  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const rgbaCache = new Map();

  // Turn any CSS colour (rgb, hsl, oklch, color(...)) into [r, g, b, a] using a canvas.
  function toRgba(value) {
    if (!rgbaCache.has(value)) {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = "#000";
      ctx.fillStyle = value;
      ctx.fillRect(0, 0, 1, 1);
      rgbaCache.set(value, Array.from(ctx.getImageData(0, 0, 1, 1).data));
    }
    return rgbaCache.get(value);
  }

  const hex = (rgb) => "#" + rgb.map((n) => n.toString(16).padStart(2, "0")).join("");
  const add = (map, key, n = 1) => map.set(key, (map.get(key) || 0) + n);

  // Add weight to a colour. Nearly see-through colours are ignored.
  // Weight is: background = visible area (px2), text = characters, border = length (px).
  function addColour(map, value, weight) {
    const [r, g, b, a] = toRgba(value);
    if (a >= 13 && weight > 0) add(map, [r, g, b].join(","), weight);
  }

  // Merge almost-identical colours: the most used colour in a group represents it.
  function mergeColours(map) {
    const groups = [];
    const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
    const total = sorted.reduce((sum, [, w]) => sum + w, 0) || 1;
    for (const [key, count] of sorted) {
      const rgb = key.split(",").map(Number);
      const group = groups.find((g) => Math.hypot(g.rgb[0] - rgb[0], g.rgb[1] - rgb[1], g.rgb[2] - rgb[2]) <= MERGE_DISTANCE);
      if (group) group.count += count;
      else groups.push({ rgb, count });
    }
    return groups
      .sort((a, b) => b.count - a.count)
      .slice(0, TOP_COLOURS)
      .map((g) => ({ hex: hex(g.rgb), share: g.count / total })); // share is 0 to 1
  }

  const topEntries = (map, n) =>
    [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([value, count]) => ({ value, count }));

  const text = new Map();
  const background = new Map();
  const border = new Map();
  const fonts = new Map();
  const skip = new Set(["HEAD", "SCRIPT", "STYLE", "META", "LINK", "TITLE", "NOSCRIPT"]);
  const formTags = new Set(["INPUT", "TEXTAREA", "SELECT"]);
  let scanned = 0;
  const pageW = Math.max(document.documentElement.scrollWidth, innerWidth);
  const pageH = Math.max(document.documentElement.scrollHeight, innerHeight);
  const clip = (lo, hi, max) => Math.max(0, Math.min(hi, max) - Math.max(lo, 0));

  for (const el of document.querySelectorAll("*")) {
    if (skip.has(el.tagName)) continue;
    const cs = getComputedStyle(el);
    const box = el.getBoundingClientRect();
    const visible = cs.display !== "none" && cs.visibility !== "hidden" && Number(cs.opacity) > 0 && box.width > 0 && box.height > 0;
    if (!visible) continue;
    scanned++;

    // Visible area: the element's box clipped to the page.
    const x = box.left + scrollX;
    const y = box.top + scrollY;
    const area = clip(x, x + box.width, pageW) * clip(y, y + box.height, pageH);
    addColour(background, cs.backgroundColor, area);

    // Only elements that really show text count towards text colour and fonts.
    const typed = formTags.has(el.tagName) ? Math.max((el.value || el.placeholder || "").length, 1) : 0;
    const chars = typed || [...el.childNodes].reduce((sum, n) => sum + (n.nodeType === 3 ? n.textContent.replace(/\s+/g, " ").trim().length : 0), 0);
    if (chars > 0) {
      addColour(text, cs.color, chars);
      const family = cs.fontFamily.split(",")[0].trim().replace(/^["']|["']$/g, "");
      if (!fonts.has(family)) fonts.set(family, { count: 0, stack: cs.fontFamily, weights: new Map(), sizes: new Map() });
      const f = fonts.get(family);
      f.count++;
      add(f.weights, cs.fontWeight);
      add(f.sizes, Math.round(parseFloat(cs.fontSize) * 10) / 10 + "px");
    }

    // Border length: each visible side adds its length (width for top/bottom, height for left/right).
    for (const side of ["Top", "Right", "Bottom", "Left"]) {
      if (parseFloat(cs["border" + side + "Width"]) > 0 && !["none", "hidden"].includes(cs["border" + side + "Style"])) {
        addColour(border, cs["border" + side + "Color"], side === "Top" || side === "Bottom" ? box.width : box.height);
      }
    }
  }

  // A page with no background set anywhere is white.
  if (background.size === 0) background.set("255,255,255", 1);

  return {
    url: location.href,
    title: document.title,
    scanned,
    text: mergeColours(text),
    background: mergeColours(background),
    border: mergeColours(border),
    fonts: [...fonts.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, TOP_FONTS)
      .map(([family, f]) => ({
        family,
        stack: f.stack,
        count: f.count,
        weights: topEntries(f.weights, 6),
        sizes: topEntries(f.sizes, 6),
      })),
  };
}
