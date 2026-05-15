<div align="center">
<img src="https://raw.githubusercontent.com/specyfikation/deletemessage/main/assets/banner.png" alt="deletemessage banner" width="100%">
# 🗑 deletemessage
 
**Bulk delete your own Discord messages — one channel, a whole server, or your entire history.**
 
No setup. No installs. Just a userscript that lives inside Discord.
 
<br>
[![Version](https://img.shields.io/badge/version-0.4-5865f2?style=for-the-badge&logo=github)](https://github.com/specyfikation/deletemessage)
[![Violentmonkey](https://img.shields.io/badge/Violentmonkey-compatible-green?style=for-the-badge)](https://violentmonkey.github.io/)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)
[![Discord API](https://img.shields.io/badge/Discord%20API-v9-5865f2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.com/developers/docs)
 
<br>
<img src="https://raw.githubusercontent.com/specyfikation/deletemessage/main/assets/preview.gif" alt="deletemessage in action" width="600">
</div>
 
## ✨ Features
 
- **Works inside Discord** — a small draggable panel appears directly on the page, no separate tab needed
- **Whole server deletion** — give it a Server ID and it loops through every text channel automatically
- **Single channel or DM** — works for specific channels and DMs too
- **Auto token detection** — one click and it grabs your token from the page
- **Date filters** — delete only before or after a specific date
- **Keyword filter** — only delete messages that contain a specific word
- **Skip pinned messages** — checkbox to leave your pinned messages untouched
- **Live log** — multi-line scrollable log showing exactly what's happening in real time
- **Progress bar** — shows which channel out of how many it's on
- **Elapsed time** — how long the script has been running and how many messages deleted
- **Auto retry** — if a network error happens it retries up to 3 times before moving on
- **Rate limit handling** — automatically waits when Discord tells it to slow down
- **Draggable panel** — grab the title bar and move the panel wherever you want
## 📋 Requirements
 
- Chrome or Firefox (any recent version)
- [Violentmonkey](https://violentmonkey.github.io/) browser extension
That's it. No Node, no Python, no terminal.
 
 
## 📦 Installation
 
### Step 1 — Install Violentmonkey
 
Get it for your browser:
 
| Browser | Link |
|---------|------|
| Chrome | [Chrome Web Store](https://chrome.google.com/webstore/detail/violentmonkey/jinjaccalgkegedbjkdiaebcehnmjnmj) |
| Firefox | [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/violentmonkey/) |
| Edge | [Microsoft Store](https://microsoftedge.microsoft.com/addons/detail/violentmonkey/eeagobfjdenkkddmbclomhiblgggliao) |
 
### Step 2 — Create a new script
 
Click the Violentmonkey icon in your browser toolbar, then click **+** → **Create new script**.
 
<img src="https://raw.githubusercontent.com/specyfikation/deletemessage/main/assets/step-new-script.png" alt="create new script" width="380">
Delete everything that's already in the editor.
 
### Step 3 — Paste the script
 
Download [`deletemessage.user.js`](https://raw.githubusercontent.com/specyfikation/deletemessage/main/deletemessage.user.js), open it in any text editor, copy everything, and paste it into Violentmonkey.
 
Hit **Ctrl+S** to save.
 
<img src="https://raw.githubusercontent.com/specyfikation/deletemessage/main/assets/step-paste.png" alt="paste script" width="560">
### Step 4 — Open Discord
 
Go to [discord.com](https://discord.com) and open any server or DM. You should see a small 🗑 button in the bottom-right corner of the page.
 
<img src="https://raw.githubusercontent.com/specyfikation/deletemessage/main/assets/step-button.png" alt="the trash button" width="300">
> If it doesn't show up, try refreshing the page once.
 
 
## 🚀 Usage
 
Click the 🗑 button to open the panel.
 
<img src="https://raw.githubusercontent.com/specyfikation/deletemessage/main/assets/panel.png" alt="panel screenshot" width="320">
### Fields explained
 
| Field | Description |
|-------|-------------|
| **Token** | Your Discord auth token. Click **Auto** — it grabs it from the page automatically |
| **Server ID** | Fill this to delete across an entire server. Click **Auto** while inside a server |
| **Channel ID** | A specific channel or DM. Click **Auto** to fill from the current URL. Optional if Server ID is set |
| **Keyword filter** | Only delete messages that contain this word. Leave empty to delete everything |
| **Delete before** | Only delete messages sent before this date |
| **Delete after** | Only delete messages sent after this date |
| **Delay (ms)** | Time between each deletion. Default 1000ms — don't go below 800ms |
| **Skip pinned** | Check this to leave pinned messages untouched |
 
### Which fields to fill
 
```
Delete in one channel only:
  → Token + Channel ID → Start
 
Delete across a whole server:
  → Token + Server ID → Start
 
Delete in DMs:
  → Token + Channel ID (click Auto while in the DM) → Start
 
Delete only old messages:
  → Token + Channel ID + "Delete before" date → Start
 
Delete only messages containing a word:
  → Token + Channel ID + Keyword filter → Start
```
 
### Getting your token manually
 
If the **Auto** button doesn't work for the token (some browser configs block it), you can grab it manually:
 
1. Open Discord in your browser
2. Press **F12** → go to the **Console** tab
3. Paste this and hit Enter:
```js
webpackChunkdiscord_app.push([[Math.random()],{},e=>{m=[];for(let c in e.c)m.push(e.c[c])}]);m.find(m=>m?.exports?.default?.getToken).exports.default.getToken()
```
 
4. Copy the output and paste it into the Token field
<img src="https://raw.githubusercontent.com/specyfikation/deletemessage/main/assets/token.png" alt="getting the token from console" width="540">
 
## ⚠️ Important warnings
 
> **Deletions are permanent.** There is no undo. Once a message is deleted it's gone forever.
 
> **Only your own messages.** The script checks every message against your user ID and only deletes yours. Everyone else's messages are skipped automatically.
 
> **Discord ToS.** Using user tokens to make API calls goes against Discord's Terms of Service. In practice, keeping the delay at 1000ms+ makes it very hard to detect. That said, use it at your own risk — there's no guarantee either way.
 
> **Keep your token private.** Your token gives full access to your account. Never share it, never paste it into scripts you don't understand.
 
 
## 🔧 Troubleshooting
 
**The 🗑 button doesn't appear**
 
Refresh the page. If it still doesn't show up, check that:
- The script is enabled in Violentmonkey (the toggle next to the script name should be green)
- The `@match` in the script header is `https://discord.com/*`
- You're on `discord.com` in the browser, not the desktop app
**The Auto token button doesn't work**
 
Some browser configs block the iframe trick. Grab your token from the console manually — see the [manual token method](#getting-your-token-manually) above.
 
**It's going slow or keeps pausing**
 
Discord is rate limiting you. That's normal and the script handles it automatically. If it's happening a lot, increase the delay to `1500` or `2000ms` in the panel.
 
**It says "network error" and skips channels**
 
Temporary connection issue. The script retries 3 times automatically. If it keeps happening, check your internet or try again later.
 
**It deleted 0 messages**
 
Either you have no messages in that channel, the date filters are too narrow, or the keyword filter didn't match anything. Double check your settings.
 
 
## 📁 File structure
 
```
deletemessage/
├── deletemessage.user.js   # the userscript
├── index.html              # project landing page
├── README.md               # you're reading this
└── assets/                 # screenshots used in this readme
    ├── banner.png
    ├── preview.gif
    ├── panel.png
    ├── step-new-script.png
    ├── step-paste.png
    ├── step-button.png
    └── token.png
```
 
 
## ❓ FAQ
 
**Can I delete messages in DMs?**
 
Yes. Open the DM, then click Auto on the Channel ID field. It detects the DM channel from the URL.
 
**Does it work in threads?**
 
Yes, threads are included when you run it with a Server ID (types 11 and 12 are included).
 
**How long does it take?**
 
Depends on the delay and how many messages you have. With the default 1000ms delay, it deletes about 1 message per second. A server with 5000 of your messages would take roughly 1h30.
 
**Can I use it on the desktop app?**
 
No. The script runs in the browser via Violentmonkey. Use [discord.com](https://discord.com) in Chrome or Firefox.
 
**Why not use the Discord search API instead?**
 
The search endpoint is rate limited much more aggressively and doesn't always return all messages. Paginating through channel history is slower but more reliable.
 
 
## 📜 License
 
MIT — do whatever you want with it.
 
 
<div align="center">
Made by [specyfikation](https://github.com/specyfikation)
 
</div>
 
