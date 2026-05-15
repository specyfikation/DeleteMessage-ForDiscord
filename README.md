# deletemessage

A Violentmonkey userscript that adds a small panel inside Discord to delete your own messages automatically. Useful if you want to clean up old messages in a specific channel or across an entire server without doing it manually one by one.

---

## What you need

- A browser (Chrome or Firefox both work fine)
- The [Violentmonkey](https://violentmonkey.github.io/) extension installed

That's it. No Node, no Python, no terminal.

---

## Installation

1. Install Violentmonkey from the [Chrome Web Store](https://chrome.google.com/webstore/detail/violentmonkey/jinjaccalgkegedbjkdiaebcehnmjnmj) or [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/violentmonkey/)
2. Click the Violentmonkey icon in your browser toolbar → click the **+** button → **Create new script**
3. Delete everything that's already in the editor
4. Paste the full content of `deletemessage.user.js`
5. Hit **Ctrl+S** to save
6. Go to [discord.com](https://discord.com) and open any server or DM

You should see a small 🗑 button in the bottom-right corner of Discord. If it doesn't show up, try refreshing the page once.

---

## How to use it

Click the 🗑 button to open the panel. Here's what each field does:

### Token
This is your Discord auth token. Click **Auto** and it'll grab it from the page automatically. You don't need to copy-paste anything manually.

> **Important:** never share your token with anyone. It gives full access to your account.

### Server ID *(optional)*
If you want to delete your messages across an entire server (every channel), fill this in. Click **Auto** while you're inside a server and it'll detect the ID from the URL.

Leave it empty if you only want to target one specific channel.

### Channel ID *(optional if server is filled)*
The specific channel or DM you want to clean. Click **Auto** and it fills in automatically based on the channel you're currently in. Works for DMs too.

If you filled in a Server ID, you can leave this empty — it'll go through all channels on its own. Or fill both if you want to start with a specific channel first.

### Keyword filter *(optional)*
Only deletes messages that contain a specific word or phrase. Leave it empty to delete everything.

Example: type `lol` and it'll only delete messages where you said "lol".

### Delete before / Delete after *(optional)*
Date filters. Use these if you only want to delete messages from a certain time period. Both are optional, you can use one or both or neither.

### Delay (ms)
How long to wait between each deletion. Default is 1000ms (1 second). Don't go below 800ms or Discord will start rate limiting you hard. If you notice it slowing down a lot, bump this up to 1500 or 2000.

### Skip pinned messages
Check this box if you want to keep your pinned messages untouched. It'll fetch the pinned message list before starting and skip them automatically.

---

## Starting and stopping

Hit **▶ Start** when you're ready. The log at the bottom will show you what's happening in real time — which channel it's on, how many messages it's deleted, how long it's been running.

If you want to stop at any point just hit **■ Stop**. It'll finish the current message and then pause.

---

## Moving the panel

You can drag the panel anywhere on the screen by grabbing the title bar at the top. Useful if it's covering something you need to see.

---

## Things to know

- This only deletes **your own messages**. It skips everyone else's automatically.
- Deletions are permanent. There's no undo.
- Discord doesn't allow bulk deletion for regular users through their app, so this goes one message at a time. That's why the delay exists — too fast and Discord will block requests.
- If you hit a network error, the script will retry up to 3 times before moving on.
- This uses your user token to make API calls, which technically goes against Discord's Terms of Service. Use it at your own risk. In practice, keeping the delay at 1000ms+ makes it hard to detect.

---

## Troubleshooting

**The 🗑 button doesn't appear**
Refresh the page. If it still doesn't show up, check that the script is enabled in Violentmonkey (the toggle next to the script name should be green).

**Auto token doesn't work**
Some browser configurations block the iframe trick used to grab the token. In that case, you'll need to get your token manually:
1. Open Discord in the browser
2. Press F12 → go to the Console tab
3. Paste this and hit Enter:
```
webpackChunkdiscord_app.push([[Math.random()],{},e=>{m=[];for(let c in e.c)m.push(e.c[c])}]);m.find(m=>m?.exports?.default?.getToken).exports.default.getToken()
```
4. Copy the output and paste it into the Token field

**It says "network error" and skips channels**
Probably a temporary connection issue. The script retries 3 times automatically. If it keeps happening, check your internet connection or try increasing the delay.

**It's going really slow**
Discord is rate limiting you. Increase the delay to 1500 or 2000ms.

---

## Author

[specyfikation](https://github.com/specyfikation)
"# DeleteMessage-ForDiscord" 
"# DeleteMessage-ForDiscord" 
"# DeleteMessage-ForDiscord" 
