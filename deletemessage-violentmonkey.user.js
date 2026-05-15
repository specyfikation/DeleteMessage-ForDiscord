// ==UserScript==
// @name         deletemessage
// @namespace    https://github.com/specyfikation
// @homepage     https://github.com/specyfikation
// @author       specyfikation
// @version      0.4
// @description  automatically delete my discord messages
// @match        https://discord.com/*
// @grant        none
// ==/UserScript==

(function() {
'use strict';

// grab token from discord's localstorage
// found this trick on stackoverflow
function getToken() {
    try {
        var iframe = document.createElement('iframe')
        document.head.append(iframe)
        var ls = Object.getOwnPropertyDescriptor(iframe.contentWindow, 'localStorage').get.call(window)
        iframe.remove()
        var tok = ls.getItem('token')
        if(tok) return tok.replace(/"/g, '')
        return null
    } catch(e) {
        console.log('token error:', e)
        return null
    }
}

function wait(ms) {
    return new Promise(res => setTimeout(res, ms))
}

async function getMyId(token) {
    let r = await fetch('https://discord.com/api/v9/users/@me', {
        headers: { 'Authorization': token }
    })
    let d = await r.json()
    return d.id
}

async function getMessages(token, channelId, beforeId, retries) {
    retries = retries || 0
    let url = 'https://discord.com/api/v9/channels/' + channelId + '/messages?limit=100'
    if(beforeId) url += '&before=' + beforeId

    let r
    try {
        r = await fetch(url, { headers: { 'Authorization': token } })
    } catch(e) {
        // network error - retry up to 3 times
        if(retries < 3) {
            log('network error, retrying (' + (retries+1) + '/3)...', 'warn')
            await wait(2000)
            return getMessages(token, channelId, beforeId, retries + 1)
        }
        throw e
    }

    if(r.status == 429) {
        let d = await r.json()
        let waitTime = d.retry_after ? d.retry_after * 1000 : 3000
        console.log('rate limited, waiting', waitTime, 'ms')
        await wait(waitTime)
        return getMessages(token, channelId, beforeId, retries)
    }

    return r.json()
}

async function getPinnedMessages(token, channelId) {
    try {
        let r = await fetch('https://discord.com/api/v9/channels/' + channelId + '/pins', {
            headers: { 'Authorization': token }
        })
        let pins = await r.json()
        if(!Array.isArray(pins)) return new Set()
        return new Set(pins.map(p => p.id))
    } catch(e) {
        return new Set()
    }
}

async function deleteMsg(token, channelId, msgId, retries) {
    retries = retries || 0
    let r
    try {
        r = await fetch('https://discord.com/api/v9/channels/' + channelId + '/messages/' + msgId, {
            method: 'DELETE',
            headers: { 'Authorization': token }
        })
    } catch(e) {
        if(retries < 3) {
            await wait(2000)
            return deleteMsg(token, channelId, msgId, retries + 1)
        }
        throw e
    }

    if(r.status == 429) {
        let d = await r.json()
        await wait((d.retry_after || 2) * 1000)
        return deleteMsg(token, channelId, msgId, retries)
    }
    return r.status
}

async function getServerChannels(token, guildId) {
    let r = await fetch('https://discord.com/api/v9/guilds/' + guildId + '/channels', {
        headers: { 'Authorization': token }
    })
    let channels = await r.json()
    if(!Array.isArray(channels)) return []
    // type 0 = text, type 5 = announcements, type 11/12 = threads
    return channels.filter(c => [0, 5, 11, 12].includes(c.type))
}

function dateToSnowflake(date) {
    return String(BigInt(date.getTime() - 1420070400000) << 22n)
}

function formatTime(seconds) {
    if(seconds < 60) return seconds + 's'
    if(seconds < 3600) return Math.floor(seconds/60) + 'm ' + (seconds%60) + 's'
    return Math.floor(seconds/3600) + 'h ' + Math.floor((seconds%3600)/60) + 'm'
}

let running = false
let stopFlag = false
let startTime = null
let totalDeleted = 0

// ---- UI ----

function createUI() {
    if(document.getElementById('delpanel-wrap')) return

    var css = document.createElement('style')
    css.textContent = `
        #delpanel-wrap {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            font-family: sans-serif;
            font-size: 13px;
            width: 300px;
            user-select: none;
        }
        #delmainbtn {
            width: 46px;
            height: 46px;
            background: #5865f2;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            font-size: 18px;
            margin-left: auto;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.4);
            color: white;
        }
        #delmainbtn:hover { background: #4752c4; }
        #delpanel {
            background: #313338;
            border-radius: 10px;
            margin-bottom: 8px;
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
                <h3>🗑 Delete Messages</h3>
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
        <button id="delmainbtn">🗑</button>
    `
    document.body.appendChild(wrap)

    // toggle panel
    document.getElementById('delmainbtn').onclick = function() {
        document.getElementById('delpanel').classList.toggle('open')
    }

    // drag support
    makeDraggable(wrap, document.getElementById('delpanel-header'))

    document.getElementById('btn-token-auto').onclick = function() {
        var t = getToken()
        if(t) {
            document.getElementById('inp-token').value = t
            log('token grabbed!', 'ok')
        } else {
            log('could not get token automatically...', 'err')
        }
    }

    document.getElementById('btn-server-auto').onclick = function() {
        var m = location.pathname.match(/channels\/(\d+)\//)
        if(m) {
            document.getElementById('inp-server').value = m[1]
            log('server id detected', 'ok')
        } else {
            log('no server in url (DM?)', 'err')
        }
    }

    document.getElementById('btn-channel-auto').onclick = function() {
        // works for both servers and DMs
        var m = location.pathname.match(/channels\/(?:\d+|@me)\/(\d+)/)
        if(m) {
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

// drag & drop the panel
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

// multi-line log
function log(msg, type) {
    var el = document.getElementById('dellog')
    if(!el) return
    type = type || 'info'
    var line = document.createElement('span')
    line.className = 'log-line log-' + type
    line.textContent = msg
    el.insertBefore(line, el.firstChild)
    // keep only last 50 lines
    while(el.children.length > 50) el.removeChild(el.lastChild)
}

function setProgress(channelIndex, totalChannels) {
    var wrap = document.getElementById('del-progressbar-wrap')
    var bar = document.getElementById('del-progressbar')
    if(!wrap || !bar) return
    if(totalChannels <= 1) { wrap.style.display = 'none'; return }
    wrap.style.display = 'block'
    bar.style.width = Math.round((channelIndex / totalChannels) * 100) + '%'
}

function updateETA(deleted, scanned, delay) {
    var el = document.getElementById('del-eta')
    if(!el || !startTime || scanned < 5) return
    el.style.display = 'block'
    var elapsed = (Date.now() - startTime) / 1000
    var rate = deleted / elapsed // deletions per second
    el.textContent = 'deleted: ' + deleted + ' | elapsed: ' + formatTime(Math.floor(elapsed))
}

function setRunning(val) {
    running = val
    var go = document.getElementById('btn-go')
    var s = document.getElementById('btn-stop')
    if(!go || !s) return
    go.style.display = val ? 'none' : 'flex'
    s.style.display = val ? 'flex' : 'none'
    if(!val) {
        var eta = document.getElementById('del-eta')
        if(eta) eta.style.display = 'none'
        var wrap = document.getElementById('del-progressbar-wrap')
        if(wrap) wrap.style.display = 'none'
    }
}

async function start() {
    if(running) return

    var token = document.getElementById('inp-token').value.trim()
    var channel = document.getElementById('inp-channel').value.trim()
    var server = document.getElementById('inp-server').value.trim()
    var delay = parseInt(document.getElementById('inp-delay').value) || 1000
    var beforeDate = document.getElementById('inp-before').value
    var afterDate = document.getElementById('inp-after').value
    var keyword = document.getElementById('inp-keyword').value.trim().toLowerCase()
    var skipPins = document.getElementById('inp-skip-pins').checked

    if(!token) { log('token missing!', 'err'); return }
    if(!channel && !server) { log('need a channel or server id!', 'err'); return }

    stopFlag = false
    startTime = Date.now()
    setRunning(true)

    log('connecting...', 'info')
    var myId
    try {
        myId = await getMyId(token)
        log('logged in as ' + myId, 'info')
    } catch(e) {
        log('connection error', 'err')
        setRunning(false)
        return
    }

    var beforeSnowflake = beforeDate ? dateToSnowflake(new Date(beforeDate + 'T23:59:59')) : null
    var afterSnowflake = afterDate ? dateToSnowflake(new Date(afterDate + 'T00:00:00')) : null

    var channels = []
    if(server) {
        log('fetching server channels...', 'info')
        try {
            var list = await getServerChannels(token, server)
            channels = list.map(c => ({ id: c.id, name: c.name }))
            log('found ' + channels.length + ' channels', 'info')
            await wait(500)
        } catch(e) {
            log('error fetching channels: ' + e, 'err')
            setRunning(false)
            return
        }
        if(channel) channels.unshift({ id: channel, name: 'targeted channel' })
    } else {
        channels = [{ id: channel, name: 'channel' }]
    }

    var deleted = 0
    var scanned = 0

    for(var ci = 0; ci < channels.length; ci++) {
        if(stopFlag) break

        var chan = channels[ci]
        setProgress(ci, channels.length)
        log('[' + (ci+1) + '/' + channels.length + '] #' + chan.name, 'info')

        // get pinned messages for this channel if needed
        var pinnedIds = new Set()
        if(skipPins) {
            pinnedIds = await getPinnedMessages(token, chan.id)
            if(pinnedIds.size > 0) log('skipping ' + pinnedIds.size + ' pinned msgs', 'info')
        }

        await wait(300)
        var before = beforeSnowflake

        loop:
        while(true) {
            if(stopFlag) break

            var msgs
            try {
                msgs = await getMessages(token, chan.id, before)
            } catch(e) {
                log('gave up on #' + chan.name + ' after retries', 'err')
                break
            }

            if(!Array.isArray(msgs) || msgs.length === 0) break

            for(var i = 0; i < msgs.length; i++) {
                if(stopFlag) break loop

                var msg = msgs[i]
                before = msg.id
                scanned++

                if(msg.author.id !== myId) continue
                if(afterSnowflake && BigInt(msg.id) < BigInt(afterSnowflake)) continue
                if(skipPins && pinnedIds.has(msg.id)) continue
                if(keyword && !msg.content.toLowerCase().includes(keyword)) continue

                try {
                    await deleteMsg(token, chan.id, msg.id)
                    deleted++
                    updateETA(deleted, scanned, delay)
                    log('[#' + chan.name + '] deleted ' + deleted + ' (scanned ' + scanned + ')', 'ok')
                } catch(e) {
                    log('failed to delete ' + msg.id, 'err')
                }

                await wait(delay)
            }
        }
    }

    setProgress(channels.length, channels.length)
    setRunning(false)

    var elapsed = Math.floor((Date.now() - startTime) / 1000)
    if(stopFlag) {
        log('stopped. ' + deleted + ' deleted in ' + formatTime(elapsed), 'info')
    } else {
        log('done! ' + deleted + ' deleted in ' + formatTime(elapsed), 'ok')
    }
}

// wait for discord to load before injecting the ui
var attempts = 0
var timer = setInterval(function() {
    attempts++
    if(document.body) {
        clearInterval(timer)
        setTimeout(createUI, 1500)
    }
    if(attempts > 40) clearInterval(timer)
}, 500)

})();
