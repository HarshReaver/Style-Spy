## Prompt 1 - build

Build 'Style Spy' in the folder C:\Users\admin\Documents\Harsh Vanguard\Vscode\28. BSERC AI Projects\13-Style-Spy. It's a Chrome extension (Manifest V3) that grabs a website's colours and fonts and saves them as a kit.

What to build:
1. A popup with a 'Scan this page' button. It reads the final computed style of every visible element and shows the page's main colours (text, background, border) ranked by how much of the page uses each one. Merge almost-identical colours.
2. Show its fonts, with weights and sizes and how often each is used.
3. Click any colour or font to copy it.
4. Save the result as a kit under a name; list and delete saved kits.
5. Export a kit as CSS variables (copy, and download a .css file).
Also add demo.html, a plain page that uses those variables, so I can paste a kit in and see it pick up the style. Use only the permissions it needs (activeTab, scripting, storage) and send nothing to any server.

Done when: results look right when I check 5 websites by hand; saved kits survive a Chrome restart; a pasted kit styles the plain page. The README should explain installing it via chrome://extensions > Load unpacked.

Rules: plain HTML, CSS and JavaScript with no framework and no build step. It must work fully offline: no CDN, no paid API, no login (if you need a library, save its file inside the folder). Make it look good: clear layout, readable text, buttons that say what they do, no gradients or emojis. Keep the code short and easy to read. Add a short README.md: what it is, how to run or install it, the features, and the 'Done when' list with how to check each one. Don't run git commands and don't use the browser preview pane; I'll test it myself. First save this message word for word in prompts.md under '## Prompt 1 - build'. When you're done, reply with the file list and what I should test.

## Prompt 2 - fix 1

Fix 1: I tested scanPage on a café page. Every background colour came back with count 1, so the page background (#fff8ee, which fills most of the screen) ranks the same as a small button colour. Ranking by number of elements isn't "how much of the page uses it". Please rank background colours by visible area (the element's on-screen box, clipped to the page), text colours by the amount of visible text, and border colours by border length. Show the share as a percentage next to each swatch instead of a raw count, and keep the CSS variable order following this new ranking. Add this message to prompts.md as '## Prompt 2 - fix 1'. Don't run git or use the browser preview pane.
