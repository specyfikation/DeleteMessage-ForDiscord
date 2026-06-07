// ==UserScript==
// @name         deletemessage
// @namespace    deletemessage
// @homepage     https://github.com/specyxoxo
// @author       specyxoxo
// @version      0.4
// @description  automatically delete my discord messages
// @match        https://discord.com/*
// @grant        none
// ==/UserScript==

(function() {
'use strict'

// pull the token from discord's localstorage via iframe trick
function getToken() {
    try {
        var frame = document.createElement('iframe')
        document.head.append(frame)
        var ls = Object.getOwnPropertyDescriptor(frame.contentWindow, 'localStorage').get.call(window)
        frame.remove()
        var tok = ls.getItem('token')
        if (tok) return tok.replace(/"/g, '')
        return null
    } catch (e) {
        console.log('token grab failed:', e)
        return null
    }
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms))
}

async function getMyId(token) {
    var r = await fetch('https://discord.com/api/v9/users/@me', {
        headers: { 'Authorization': token }
    })
    var d = await r.json()
    return d.id
}

// fetch up to 100 messages before a given snowflake id.
// works everywhere: servers, DMs, threads, announcements.
async function fetchMessages(token, channelId, beforeId, retries) {
    retries = retries || 0
    var url = 'https://discord.com/api/v9/channels/' + channelId + '/messages?limit=100'
    if (beforeId) url += '&before=' + beforeId

    var r
    try {
        r = await fetch(url, { headers: { 'Authorization': token } })
    } catch (e) {
        if (retries < 3) {
            log('network error, retrying (' + (retries + 1) + '/3)...', 'warn')
            await sleep(2000)
            return fetchMessages(token, channelId, beforeId, retries + 1)
        }
        throw e
    }

    if (r.status === 429) {
        var d = await r.json()
        var wait = d.retry_after ? d.retry_after * 1000 : 3000
        log('rate limited, waiting ' + Math.ceil(wait / 1000) + 's...', 'warn')
        await sleep(wait)
        return fetchMessages(token, channelId, beforeId, retries)
    }

    return r.json()
}

async function getPinnedIds(token, channelId) {
    try {
        var r = await fetch('https://discord.com/api/v9/channels/' + channelId + '/pins', {
            headers: { 'Authorization': token }
        })
        var pins = await r.json()
        if (!Array.isArray(pins)) return new Set()
        return new Set(pins.map(p => p.id))
    } catch (e) {
        return new Set()
    }
}

async function deleteMsg(token, channelId, msgId, retries) {
    retries = retries || 0
    var r
    try {
        r = await fetch('https://discord.com/api/v9/channels/' + channelId + '/messages/' + msgId, {
            method: 'DELETE',
            headers: { 'Authorization': token }
        })
    } catch (e) {
        if (retries < 3) {
            await sleep(2000)
            return deleteMsg(token, channelId, msgId, retries + 1)
        }
        throw e
    }

    if (r.status === 429) {
        var d = await r.json()
        await sleep((d.retry_after || 2) * 1000)
        return deleteMsg(token, channelId, msgId, retries)
    }

    return r.status
}

async function getServerChannels(token, guildId) {
    var r = await fetch('https://discord.com/api/v9/guilds/' + guildId + '/channels', {
        headers: { 'Authorization': token }
    })
    var channels = await r.json()
    if (!Array.isArray(channels)) return []
    // text, announcements, threads
    return channels.filter(c => [0, 5, 11, 12].includes(c.type))
}

function dateToSnowflake(date) {
    return String(BigInt(date.getTime() - 1420070400000) << 22n)
}

function formatTime(seconds) {
    if (seconds < 60) return seconds + 's'
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ' + (seconds % 60) + 's'
    return Math.floor(seconds / 3600) + 'h ' + Math.floor((seconds % 3600) / 60) + 'm'
}

var running = false
var stopFlag = false
var startTime = null

// ---- UI ----

function createUI() {
    if (document.getElementById('delpanel-wrap')) return

    var css = document.createElement('style')
    css.textContent = `
        #delpanel-wrap {
            font-family: sans-serif;
            font-size: 13px;
            user-select: none;
        }
        #delmainbtn {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            width: 46px;
            height: 46px;
            background: #5865f2;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            font-size: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.4);
            color: white;
        }
        #delmainbtn:hover { background: #4752c4; }
        #delpanel {
            position: fixed;
            bottom: 76px;
            right: 20px;
            z-index: 9998;
            width: 300px;
            background: #313338;
            border-radius: 10px;
            display: none;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            color: #dcddde;
            overflow: hidden;
        }
        #delpanel.open { display: block; }
        #delpanel-header {
            padding: 10px 14px;
            background: #2b2d31;
            cursor: grab;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid #1e1f22;
        }
        #delpanel-header:active { cursor: grabbing; }
        #delpanel-header h3 { margin: 0; font-size: 13px; color: #fff; }
        #delpanel-header span { font-size: 11px; color: #b5bac1; }
        #delpanel-body { padding: 12px 14px 14px; }
        #delpanel label {
            display: block;
            font-size: 10px;
            color: #b5bac1;
            margin-top: 8px;
            margin-bottom: 3px;
            text-transform: uppercase;
            letter-spacing: .4px;
        }
        #delpanel input[type=text],
        #delpanel input[type=password],
        #delpanel input[type=date],
        #delpanel input[type=number] {
            width: 100%;
            background: #1e1f22;
            border: 1px solid #111;
            border-radius: 5px;
            color: #ddd;
            padding: 6px 8px;
            font-size: 12px;
            box-sizing: border-box;
        }
        #delpanel input:focus { outline: none; border-color: #5865f2; }
        .checkbox-row {
            display: flex;
            align-items: center;
            gap: 7px;
            margin-top: 9px;
            font-size: 12px;
            color: #b5bac1;
            cursor: pointer;
        }
        .checkbox-row input { width: auto; margin: 0; cursor: pointer; }
        .btn-row { display: flex; gap: 6px; margin-top: 12px; }
        .delbtn {
            flex: 1;
            padding: 7px;
            border: none;
            border-radius: 5px;
            font-size: 12px;
            font-weight: bold;
            cursor: pointer;
            color: #fff;
        }
        .btn-start { background: #248046; }
        .btn-start:hover { background: #1a6334; }
        .btn-stop { background: #da373c; display: none; }
        .btn-stop:hover { background: #a12d31; }
        .btn-auto { background: #4e5058; flex: none; padding: 6px 10px; font-size: 11px; }
        .btn-auto:hover { background: #6d6f78; }
        #del-progressbar-wrap {
            height: 3px;
            background: #1e1f22;
            border-radius: 2px;
            margin-top: 10px;
            display: none;
        }
        #del-progressbar {
            height: 100%;
            width: 0%;
            background: #5865f2;
            border-radius: 2px;
            transition: width 0.4s;
        }
        #del-eta {
            font-size: 10px;
            color: #72767d;
            margin-top: 4px;
            display: none;
        }
        #dellog {
            margin-top: 8px;
            background: #1e1f22;
            border-radius: 5px;
            padding: 6px 9px;
            font-size: 11px;
            height: 80px;
            overflow-y: auto;
            font-family: monospace;
            color: #b5bac1;
            display: flex;
            flex-direction: column-reverse;
        }
        #dellog .log-line { line-height: 1.6; }
        .log-ok { color: #3ba55d; }
        .log-err { color: #ed4245; }
        .log-warn { color: #faa61a; }
        .log-info { color: #7289da; }
    `
    document.head.appendChild(css)

    var wrap = document.createElement('div')
    wrap.id = 'delpanel-wrap'
    wrap.innerHTML = `
        <div id="delpanel">
            <div id="delpanel-header">
                <h3>Delete Messages</h3>
                <span id="del-stats"></span>
            </div>
            <div id="delpanel-body">
                <label>Token</label>
                <div style="display:flex;gap:5px">
                    <input type="password" id="inp-token" placeholder="your discord token">
                    <button class="delbtn btn-auto" id="btn-token-auto">Auto</button>
                </div>

                <label>Server ID (optional - deletes everywhere)</label>
                <div style="display:flex;gap:5px">
                    <input type="text" id="inp-server" placeholder="server id">
                    <button class="delbtn btn-auto" id="btn-server-auto">Auto</button>
                </div>

                <label>Channel ID (optional if server is filled)</label>
                <div style="display:flex;gap:5px">
                    <input type="text" id="inp-channel" placeholder="channel id or DM id">
                    <button class="delbtn btn-auto" id="btn-channel-auto">Auto</button>
                </div>

                <label>Keyword filter (optional)</label>
                <input type="text" id="inp-keyword" placeholder="only delete messages containing...">

                <label>Delete before (optional)</label>
                <input type="date" id="inp-before">

                <label>Delete after (optional)</label>
                <input type="date" id="inp-after">

                <label>Delay ms (800 min recommended)</label>
                <input type="number" id="inp-delay" value="1000" min="500">

                <label class="checkbox-row">
                    <input type="checkbox" id="inp-skip-pins"> Skip pinned messages
                </label>

                <div class="btn-row">
                    <button class="delbtn btn-start" id="btn-go">▶ Start</button>
                    <button class="delbtn btn-stop" id="btn-stop">■ Stop</button>
                </div>

                <div id="del-progressbar-wrap"><div id="del-progressbar"></div></div>
                <div id="del-eta"></div>
                <div id="dellog"><span class="log-line log-info">ready</span></div>
            </div>
        </div>
        <button id="delmainbtn"><svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="9" width="14" height="11" rx="1.5" stroke="white" stroke-width="1.6"/><line x1="2" y1="9" x2="20" y2="9" stroke="white" stroke-width="1.6" stroke-linecap="round"/><rect x="8" y="5" width="6" height="4.5" rx="1.2" stroke="white" stroke-width="1.6"/><line x1="9" y1="12" x2="9" y2="17" stroke="white" stroke-width="1.3" stroke-linecap="round" opacity="0.7"/><line x1="11" y1="12" x2="11" y2="17" stroke="white" stroke-width="1.3" stroke-linecap="round" opacity="0.7"/><line x1="13" y1="12" x2="13" y2="17" stroke="white" stroke-width="1.3" stroke-linecap="round" opacity="0.7"/></svg></button>
    `
    document.body.appendChild(wrap)

    document.getElementById('delmainbtn').onclick = function() {
        document.getElementById('delpanel').classList.toggle('open')
    }

    makeDraggable(document.getElementById('delpanel'), document.getElementById('delpanel-header'))

    document.getElementById('btn-token-auto').onclick = function() {
        var t = getToken()
        if (t) {
            document.getElementById('inp-token').value = t
            log('token grabbed!', 'ok')
        } else {
            log('could not grab token automatically', 'err')
        }
    }

    document.getElementById('btn-server-auto').onclick = function() {
        var m = location.pathname.match(/channels\/(\d+)\//)
        if (m) {
            document.getElementById('inp-server').value = m[1]
            log('server id detected', 'ok')
        } else {
            log('no server in url (DM?)', 'err')
        }
    }

    document.getElementById('btn-channel-auto').onclick = function() {
        var m = location.pathname.match(/channels\/(?:\d+|@me)\/(\d+)/)
        if (m) {
            document.getElementById('inp-channel').value = m[1]
            log('channel detected', 'ok')
        } else {
            log('no channel in url', 'err')
        }
    }

    document.getElementById('btn-go').onclick = start
    document.getElementById('btn-stop').onclick = function() {
        stopFlag = true
        log('stopping...', 'info')
    }
}

function makeDraggable(el, handle) {
    var ox = 0, oy = 0, mx = 0, my = 0
    handle.onmousedown = function(e) {
        e.preventDefault()
        ox = e.clientX
        oy = e.clientY
        document.onmouseup = function() {
            document.onmouseup = null
            document.onmousemove = null
        }
        document.onmousemove = function(e) {
            mx = ox - e.clientX
            my = oy - e.clientY
            ox = e.clientX
            oy = e.clientY
            el.style.top = (el.offsetTop - my) + 'px'
            el.style.left = (el.offsetLeft - mx) + 'px'
            el.style.bottom = 'auto'
            el.style.right = 'auto'
        }
    }
}

function log(msg, type) {
    var el = document.getElementById('dellog')
    if (!el) return
    type = type || 'info'
    var line = document.createElement('span')
    line.className = 'log-line log-' + type
    line.textContent = msg
    el.insertBefore(line, el.firstChild)
    while (el.children.length > 50) el.removeChild(el.lastChild)
}

function setProgress(current, total) {
    var wrap = document.getElementById('del-progressbar-wrap')
    var bar = document.getElementById('del-progressbar')
    if (!wrap || !bar) return
    if (total <= 1) { wrap.style.display = 'none'; return }
    wrap.style.display = 'block'
    bar.style.width = Math.round((current / total) * 100) + '%'
}

function updateStats(deleted) {
    var el = document.getElementById('del-eta')
    if (!el || !startTime) return
    el.style.display = 'block'
    var elapsed = Math.floor((Date.now() - startTime) / 1000)
    el.textContent = 'deleted: ' + deleted + ' | elapsed: ' + formatTime(elapsed)
}

function setRunning(val) {
    running = val
    var go = document.getElementById('btn-go')
    var stop = document.getElementById('btn-stop')
    if (!go || !stop) return
    go.style.display = val ? 'none' : 'flex'
    stop.style.display = val ? 'flex' : 'none'
    if (!val) {
        var eta = document.getElementById('del-eta')
        if (eta) eta.style.display = 'none'
        var wrap = document.getElementById('del-progressbar-wrap')
        if (wrap) wrap.style.display = 'none'
    }
}

// scan a channel page by page (100 msgs at a time), delete every message we sent.
// filters author id on our side so it works on servers, DMs, threads, everything.
async function runOnChannel(token, channelId, authorId, options, deleted) {
    var pinnedIds = new Set()
    if (options.skipPins) {
        pinnedIds = await getPinnedIds(token, channelId)
        if (pinnedIds.size > 0) log('skipping ' + pinnedIds.size + ' pinned msgs', 'info')
    }

    var before = options.beforeSnowflake || null

    outer:
    while (true) {
        if (stopFlag) break

        var msgs
        try {
            msgs = await fetchMessages(token, channelId, before)
        } catch (e) {
            log('gave up on channel after retries', 'err')
            break
        }

        if (!Array.isArray(msgs) || msgs.length === 0) break

        for (var i = 0; i < msgs.length; i++) {
            if (stopFlag) break outer

            var msg = msgs[i]
            // move cursor forward so next batch starts from here
            before = msg.id

            if (msg.author.id !== authorId) continue
            if (options.afterSnowflake && BigInt(msg.id) < BigInt(options.afterSnowflake)) continue
            if (options.skipPins && pinnedIds.has(msg.id)) continue
            if (options.keyword && !msg.content.toLowerCase().includes(options.keyword)) continue

            try {
                await deleteMsg(token, channelId, msg.id)
                deleted++
                updateStats(deleted)
                log('deleted ' + deleted + ' total', 'ok')
            } catch (e) {
                log('failed to delete ' + msg.id, 'err')
            }

            // short cooldown every 10 deletions to stay under the radar
            if (deleted % 10 === 0) {
                log('cooldown pause... (5s)', 'warn')
                await sleep(5000)
            } else {
                await sleep(options.delay)
            }
        }
    }

    return deleted
}

async function start() {
    if (running) return

    var token = document.getElementById('inp-token').value.trim()
    var channel = document.getElementById('inp-channel').value.trim()
    var server = document.getElementById('inp-server').value.trim()
    var delay = parseInt(document.getElementById('inp-delay').value) || 1000
    var beforeDate = document.getElementById('inp-before').value
    var afterDate = document.getElementById('inp-after').value
    var keyword = document.getElementById('inp-keyword').value.trim().toLowerCase()
    var skipPins = document.getElementById('inp-skip-pins').checked

    if (!token) { log('token missing!', 'err'); return }
    if (!channel && !server) { log('need a channel or server id!', 'err'); return }

    stopFlag = false
    startTime = Date.now()
    setRunning(true)

    log('connecting...', 'info')
    var myId
    try {
        myId = await getMyId(token)
        log('logged in as ' + myId, 'info')
    } catch (e) {
        log('connection error', 'err')
        setRunning(false)
        return
    }

    var options = {
        delay: delay,
        skipPins: skipPins,
        keyword: keyword || null,
        beforeSnowflake: beforeDate ? dateToSnowflake(new Date(beforeDate + 'T23:59:59')) : null,
        afterSnowflake: afterDate ? dateToSnowflake(new Date(afterDate + 'T00:00:00')) : null
    }

    var deleted = 0

    if (server) {
        // fetch channel list then scan each one individually
        var channels = []
        try {
            log('fetching channel list...', 'info')
            var list = await getServerChannels(token, server)
            channels = list.map(c => ({ id: c.id, name: c.name }))
            log('found ' + channels.length + ' channels', 'info')
            await sleep(400)
        } catch (e) {
            log('could not fetch channels: ' + e, 'err')
            setRunning(false)
            return
        }

        // if a specific channel was also given, run it first
        if (channel) channels.unshift({ id: channel, name: 'selected channel' })

        for (var ci = 0; ci < channels.length; ci++) {
            if (stopFlag) break

            var chan = channels[ci]
            setProgress(ci, channels.length)
            log('[' + (ci + 1) + '/' + channels.length + '] #' + chan.name, 'info')

            try {
                deleted = await runOnChannel(token, chan.id, myId, options, deleted)
            } catch (e) {
                log('error on #' + chan.name + ': ' + e, 'err')
            }

            await sleep(300)
        }

        setProgress(channels.length, channels.length)
    } else {
        // single channel or DM
        try {
            deleted = await runOnChannel(token, channel, myId, options, deleted)
        } catch (e) {
            log('error: ' + e, 'err')
        }
    }

    setRunning(false)

    var elapsed = Math.floor((Date.now() - startTime) / 1000)
    if (stopFlag) {
        log('stopped. ' + deleted + ' deleted in ' + formatTime(elapsed), 'info')
    } else {
        log('done! ' + deleted + ' deleted in ' + formatTime(elapsed), 'ok')
    }
}

// wait for discord to finish loading before injecting the panel
var attempts = 0
var timer = setInterval(function() {
    attempts++
    if (document.body) {
        clearInterval(timer)
        setTimeout(createUI, 1500)
    }
    if (attempts > 40) clearInterval(timer)
}, 500)

})()
