const $ = (id) => document.getElementById(id);
let current = null; // the kit currently shown (a fresh scan or an opened saved kit)

// ---------- small helpers ----------
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function setStatus(message, isError = false) {
  $("status").textContent = message;
  $("status").className = isError ? "error" : "";
}

async function copy(value) {
  await navigator.clipboard.writeText(value);
  setStatus("Copied: " + value);
}

const hostOf = (url) => { try { return new URL(url).hostname; } catch { return url; } };
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "style-kit";

// ---------- scanning ----------
async function scan() {
  setStatus("Scanning...");
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const [injection] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: scanPage });
    current = injection.result;
    $("name").value = current.title.slice(0, 40);
    show(current);
    setStatus("Scanned " + current.scanned + " visible elements. Click a colour or font to copy it.");
  } catch (error) {
    setStatus("This page cannot be scanned. Chrome blocks internal pages and the Web Store; try a normal website.", true);
  }
}

// ---------- showing results ----------
function colourList(listId, colours) {
  const list = $(listId);
  list.replaceChildren();
  if (!colours.length) list.append(el("li", "empty", "None found on this page."));
  for (const c of colours) {
    const percent = c.share * 100;
    const label = percent < 1 ? "<1%" : Math.round(percent) + "%";
    const row = el("button", "item");
    row.title = "Copy " + c.hex;
    const swatch = el("span", "swatch");
    swatch.style.background = c.hex;
    const bar = el("span", "bar");
    bar.append(el("span"));
    bar.firstChild.style.width = Math.max(percent, 1) + "%";
    row.append(swatch, el("span", "name", c.hex), bar, el("span", "share", label));
    row.onclick = () => copy(c.hex);
    const li = el("li");
    li.append(row);
    list.append(li);
  }
}

function fontList(fonts) {
  const list = $("fonts");
  list.replaceChildren();
  if (!fonts.length) list.append(el("li", "empty", "No text found on this page."));
  for (const f of fonts) {
    const row = el("button", "item");
    row.title = "Copy font-family: " + f.stack;
    const info = el("span", "font-info");
    info.append(
      el("strong", "", f.family),
      el("small", "", "Weights: " + f.weights.map((w) => w.value + " (" + w.count + ")").join(", ")),
      el("small", "", "Sizes: " + f.sizes.map((s) => s.value + " (" + s.count + ")").join(", "))
    );
    row.append(info, el("span", "share", f.count + " uses"));
    row.onclick = () => copy(f.stack);
    const li = el("li");
    li.append(row);
    list.append(li);
  }
}

function show(kit) {
  $("results").hidden = false;
  $("source").textContent = "Source: " + kit.url;
  colourList("text", kit.text);
  colourList("background", kit.background);
  colourList("border", kit.border);
  fontList(kit.fonts);
}

// ---------- CSS export ----------
function cssFor(kit, name) {
  const lines = [":root {"];
  const group = (label, prefix, items) => {
    lines.push("  /* " + label + ", most used first */");
    items.forEach((value, i) => lines.push("  --ss-" + prefix + "-" + (i + 1) + ": " + value + ";"));
  };
  group("Text colours", "text", kit.text.map((c) => c.hex));
  group("Background colours", "bg", kit.background.map((c) => c.hex));
  group("Border colours", "border", kit.border.map((c) => c.hex));
  group("Fonts", "font", kit.fonts.map((f) => f.stack));
  lines.push("}");
  return "/* Style Spy kit: " + name + " (" + hostOf(kit.url) + ") */\n" + lines.join("\n") + "\n";
}

function downloadCss(kit, name) {
  const link = el("a");
  link.href = URL.createObjectURL(new Blob([cssFor(kit, name)], { type: "text/css" }));
  link.download = slug(name) + ".css";
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  setStatus("Downloaded " + link.download);
}

// ---------- saved kits (chrome.storage.local survives Chrome restarts) ----------
async function loadKits() {
  return (await chrome.storage.local.get({ kits: [] })).kits;
}

async function saveKit() {
  const name = $("name").value.trim();
  if (!name) return setStatus("Type a kit name first.", true);
  const kits = await loadKits();
  kits.unshift({ ...current, id: Date.now(), name, savedAt: new Date().toLocaleDateString() });
  await chrome.storage.local.set({ kits });
  setStatus('Saved kit "' + name + '".');
  renderKits();
}

async function deleteKit(kit) {
  if (!confirm('Delete the kit "' + kit.name + '"?')) return;
  const kits = (await loadKits()).filter((k) => k.id !== kit.id);
  await chrome.storage.local.set({ kits });
  setStatus('Deleted "' + kit.name + '".');
  renderKits();
}

async function renderKits() {
  const list = $("kits");
  list.replaceChildren();
  const kits = await loadKits();
  if (!kits.length) list.append(el("li", "empty", "No saved kits yet. Scan a page and save it."));
  for (const kit of kits) {
    const li = el("li", "kit");
    const strip = el("div", "strip");
    for (const c of [...kit.background.slice(0, 3), ...kit.text.slice(0, 3), ...kit.border.slice(0, 2)]) {
      const chip = el("span");
      chip.style.background = c.hex;
      strip.append(chip);
    }
    const buttons = el("div", "row");
    const action = (label, handler, className) => {
      const b = el("button", className, label);
      b.onclick = handler;
      buttons.append(b);
    };
    action("Show colours and fonts", () => { current = kit; $("name").value = kit.name; show(kit); });
    action("Copy CSS", () => { navigator.clipboard.writeText(cssFor(kit, kit.name)); setStatus('Copied CSS for "' + kit.name + '".'); });
    action("Download .css", () => downloadCss(kit, kit.name));
    action("Delete", () => deleteKit(kit), "danger");
    li.append(el("strong", "", kit.name), el("p", "muted", hostOf(kit.url) + " - saved " + kit.savedAt), strip, buttons);
    list.append(li);
  }
}

// ---------- wire up ----------
$("scan").onclick = scan;
$("save").onclick = saveKit;
$("copy-css").onclick = () => { navigator.clipboard.writeText(cssFor(current, $("name").value.trim() || "kit")); setStatus("Copied CSS variables."); };
$("download-css").onclick = () => downloadCss(current, $("name").value.trim() || "kit");
renderKits();
