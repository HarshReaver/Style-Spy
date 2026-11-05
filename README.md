# Style Spy

A Chrome extension (Manifest V3) that scans the page you are on, shows its main colours and fonts, and saves them as a named kit you can export as CSS variables. Plain HTML, CSS and JavaScript. No build step, no libraries, no network requests, works offline.

## Install

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and choose this folder (`13-Style-Spy`).
4. Pin Style Spy from the puzzle-piece menu if you like, then open any website and click its icon.

After editing any file, press the reload button on the extension card.

Permissions used: `activeTab` (read the page you click on), `scripting` (run the scan in that page), `storage` (keep saved kits). Nothing is sent anywhere.

## Features

- **Scan this page**: reads the computed style of every visible element (hidden, transparent and zero-size elements are skipped).
- **Colours**: text, background and border colours, ranked by how much of the page uses each one, shown as a percentage. Background = visible area of each element (clipped to the page), text = amount of visible text (characters), border = border length. Colours within a small RGB distance are merged into the most used one.
- **Fonts**: each font family with how many text elements use it, plus its weights and sizes with counts.
- **Click to copy**: click a colour to copy its hex code, or a font to copy its `font-family` value.
- **Kits**: name and save a scan, list saved kits, show one again, delete one.
- **Export**: copy a kit as CSS variables, or download it as a `.css` file.
- **demo.html**: a plain page styled only by those variables.

Variables look like this: `--ss-text-1`, `--ss-bg-1`, `--ss-border-1`, `--ss-font-1` (number 1 has the biggest share).

## Files

| File | Purpose |
| --- | --- |
| `manifest.json` | Extension definition and permissions |
| `popup.html`, `popup.css`, `popup.js` | The popup: results, kits, export |
| `scanner.js` | The scan function injected into the page |
| `demo.html` | Plain page to try a pasted kit |
| `prompts.md` | The prompt this was built from |

## Done when

| Check | How to test |
| --- | --- |
| Results look right on 5 websites | Open 5 different sites, click **Scan this page** on each. Compare the top colours and fonts with what you see (browser DevTools > Elements > Computed is a good reference). The page background should be the top background colour and body text the top text colour. |
| Saved kits survive a Chrome restart | Scan a page, name it, click **Save kit**. Quit Chrome fully, reopen it, open the popup: the kit is still in **Saved kits**. |
| A pasted kit styles the plain page | In a saved kit click **Copy CSS**. Open `demo.html` (double-click it), paste into the box, click **Apply kit to this page**. Colours and fonts change. **Reset to plain style** undoes it. |

Notes: internal pages (`chrome://`, the Web Store) cannot be scanned; Chrome blocks that. Fonts in the exported CSS only show on the demo page if they are installed on your computer or the stack falls back to a generic family. Only the top frame of a page is scanned, not embedded iframes.
