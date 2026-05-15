<div align="center">
# 🗑 deletemessage
 
Bulk delete your own Discord messages - one channel, a whole server, or your entire history.<br>
No setup. No installs. Just a small panel that lives inside Discord.
 
[![Version](https://img.shields.io/badge/version-0.4-5865f2?style=flat-square)](https://github.com/specyfikation/DeleteMessage-ForDiscord)
[![Violentmonkey](https://img.shields.io/badge/Violentmonkey-compatible-43b581?style=flat-square)](https://violentmonkey.github.io/)
[![License](https://img.shields.io/badge/license-MIT-lightgrey?style=flat-square)](LICENSE)
[![Discord API](https://img.shields.io/badge/Discord%20API-v9-5865f2?style=flat-square&logo=discord&logoColor=white)](https://discord.com/developers/docs)
 
<br>
<a href="https://raw.githubusercontent.com/specyfikation/DeleteMessage-ForDiscord/main/deletemessage.user.js">⬇ Install script</a> &nbsp;·&nbsp; <a href="https://github.com/specyfikation/DeleteMessage-ForDiscord">View source</a> &nbsp;·&nbsp; <a href="https://github.com/specyfikation/DeleteMessage-ForDiscord/issues">Report a bug</a>
 
</div>
<br>
> **Warning** - Deletions are permanent. There is no undo. This only deletes **your own** messages.
 
<br>
## Features
 
- Small draggable panel directly inside Discord, no separate tab needed
- Delete across a whole server - loops through every channel automatically
- Works in DMs too
- One click to grab your token automatically
- Filter by date, by keyword, skip pinned messages
- Live scrollable log, progress bar, elapsed time counter
- Auto retry on network errors (up to 3 times)
- Handles rate limits automatically
## Requirements
 
- Chrome or Firefox
- [Violentmonkey](https://violentmonkey.github.io/) extension - that's it, no Node, no Python, no terminal
## Installation
 
**1. Install Violentmonkey**
 
| Browser | Link |
|---------|------|
| Chrome | [Chrome Web Store](https://chrome.google.com/webstore/detail/violentmonkey/jinjaccalgkegedbjkdiaebcehnmjnmj) |
| Firefox | [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/violentmonkey/) |
| Edge | [Microsoft Store](https://microsoftedge.microsoft.com/addons/detail/violentmonkey/eeagobfjdenkkddmbclomhiblgggliao) |
 
**2. Create a new script**
 
Click the Violentmonkey icon in your toolbar → **+** → **Create new script** → delete everything in the editor.
 
**3. Paste and save**
 
Download [`deletemessage.user.js`](https://raw.githubusercontent.com/specyfikation/DeleteMessage-ForDiscord/main/deletemessage.user.js), copy the contents, paste into the editor, hit **Ctrl+S**.
 
**4. Open Discord**
 
Go to [discord.com](https://discord.com). A 🗑 button appears in the bottom-right corner of the page. If it doesn't show up, refresh once.
 
 
## Usage
 
Click the 🗑 button to open the panel. Fill in what you need and hit **Start**.
 
| Field | What it does |
|-------|-------------|
| Token | Your Discord auth token. Click **Auto** to grab it automatically |
| Server ID | Deletes across a whole server. Click **Auto** while inside one |
| Channel ID | A specific channel or DM. Click **Auto** to fill from the URL |
| Keyword | Only delete messages containing this word. Leave empty for everything |
| Delete before | Only delete messages sent before this date |
| Delete after | Only delete messages sent after this date |
| Delay (ms) | Time between deletions. Default 1000ms, don't go below 800ms |
| Skip pinned | Checkbox - leaves your pinned messages untouched |
 
**Which fields to fill:**
 
```
One channel only  →  Token + Channel ID
Whole server      →  Token + Server ID
DMs               →  Token + Channel ID (click Auto while in the DM)
Old messages only →  Token + Channel ID + "Delete before" date
Specific word     →  Token + Channel ID + Keyword filter
```
 
**Getting your token manually**
 
If the Auto button doesn't work (some browsers block it), open Discord in the browser, press **F12**, go to the **Console** tab and run:
 
```js
webpackChunkdiscord_app.push([[Math.random()],{},e=>{m=[];for(let c in e.c)m.push(e.c[c])}]);m.find(m=>m?.exports?.default?.getToken).exports.default.getToken()
```
 
Copy the output and paste it into the Token field.
 
 
## Troubleshooting
 
**The button doesn't appear**
 
Refresh the page. If still nothing, check that the script is enabled in Violentmonkey (toggle should be green) and that the `@match` is `https://discord.com/*`.
 
**Auto token doesn't work**
 
Grab it manually from the console - see [Getting your token manually](#getting-your-token-manually) above.
 
**It's going slow or keeps pausing**
 
Discord is rate limiting you. It handles it automatically. If it happens a lot, increase the delay to `1500` or `2000ms`.
 
**It says "network error" and skips channels**
 
Temporary connection issue. The script retries 3 times on its own. If it keeps happening, check your connection.
 
**It deleted 0 messages**
 
Either you have no messages there, or the filters are too narrow. Check your date range and keyword.
 
 
## FAQ
 
**Can it delete messages in DMs?**
Yes - open the DM, click Auto on the Channel ID field, done.
 
**Does it work in threads?**
Yes, threads are included when using a Server ID.
 
**How long does it take?**
At 1000ms delay it deletes roughly 1 message per second. 5000 messages ≈ 1h30.
 
**Does it work in the desktop app?**
No. Use [discord.com](https://discord.com) in Chrome or Firefox.
 
**Will my account get banned?**
Using user tokens goes against Discord's ToS. Keeping the delay at 1000ms+ makes it hard to detect, but use it at your own risk.
 
 
## License
 
MIT
 
 
<div align="center">
Made by [specyfikation](https://github.com/specyfikation)
 
</div>
