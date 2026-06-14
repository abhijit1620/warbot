const express = require("express");
const app = express();
app.use(express.json());

const TOKEN = process.env.BOT_TOKEN;
const API = `https://api.telegram.org/bot${TOKEN}`;

// In-memory storage
let castles = [];
let kingdoms = {}; // chatId -> kingdom number

// ── Send message helper ──
async function send(chatId, text, parseMode = "Markdown") {
  await fetch(`${API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode }),
  });
}

// ── Generate tiles around a castle ──
function generateTiles(x, y, radius = 10) {
  const tiles = [];
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const tx = x + dx, ty = y + dy;
      if (tx >= 0 && tx <= 999 && ty >= 0 && ty <= 999)
        tiles.push(`(${tx},${ty})`);
    }
  }
  return tiles;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Webhook handler ──
app.post("/webhook", async (req, res) => {
  res.sendStatus(200);

  const msg = req.body.message;
  if (!msg || !msg.text) return;

  const chatId = msg.chat.id;
  const text = msg.text.trim();
  const from = msg.from.first_name || "Commander";
  const kingdom = kingdoms[chatId] || null;

  // /start or /help
  if (text.startsWith("/start") || text.startsWith("/help")) {
    await send(chatId,
      `⚔️ *War Bot — Unshield Tracker*\n\n` +
      `${kingdom ? `🗺 Kingdom: *K${kingdom}*\n\n` : `⚠️ Kingdom set nahi hai! Pehle /setkingdom karo\n\n`}` +
      `*Commands:*\n` +
      `/setkingdom 123 — Apna kingdom set karo\n` +
      `/report X Y PlayerName — Unshield castle report karo\n` +
      `/scan — Saare castles scan karo & tiles bhejo\n` +
      `/status — Castle queue dekho\n` +
      `/clear — Queue clear karo\n` +
      `/id — Chat ID dekho\n\n` +
      `*Example:*\n` +
      `\`/setkingdom 123\`\n` +
      `\`/report 312 487 DragonLord99\``
    );
    return;
  }

  // /id
  if (text.startsWith("/id")) {
    await send(chatId, `🆔 Chat ID: \`${chatId}\``);
    return;
  }

  // /setkingdom
  if (text.startsWith("/setkingdom")) {
    const parts = text.split(/\s+/);
    if (parts.length < 2 || isNaN(parseInt(parts[1]))) {
      await send(chatId, `⚠️ Usage: \`/setkingdom 123\`\nExample: \`/setkingdom 456\``);
      return;
    }
    const kNum = parseInt(parts[1]);
    kingdoms[chatId] = kNum;
    await send(chatId,
      `✅ *Kingdom Set!*\n` +
      `🗺 Kingdom: *K${kNum}*\n\n` +
      `Ab /report se castle report karo!\n` +
      `Example: \`/report 312 487 DragonLord99\``
    );
    return;
  }

  // /report
  if (text.startsWith("/report")) {
    if (!kingdom) {
      await send(chatId, `⚠️ Pehle kingdom set karo!\nExample: \`/setkingdom 123\``);
      return;
    }
    const parts = text.split(/\s+/).slice(1);
    if (parts.length < 3) {
      await send(chatId, `⚠️ Usage: \`/report X Y PlayerName\`\nExample: \`/report 312 487 DragonLord99\``);
      return;
    }
    const x = parseInt(parts[0]);
    const y = parseInt(parts[1]);
    const name = parts.slice(2).join(" ");

    if (isNaN(x) || isNaN(y) || x < 0 || x > 999 || y < 0 || y > 999) {
      await send(chatId, `⚠️ Invalid coordinates. X aur Y 0–999 ke beech hona chahiye.`);
      return;
    }

    castles.push({ x, y, name, kingdom, chatId, reportedBy: from, ts: Date.now() });
    await send(chatId,
      `🏰 *Castle Reported!*\n` +
      `🗺 Kingdom: *K${kingdom}*\n` +
      `👤 Player: *${name}*\n` +
      `📍 Coords: \`(${x}, ${y})\`\n` +
      `🗺 ${generateTiles(x, y).length} tiles scan ke liye ready\n` +
      `📋 Queue: ${castles.filter(c => c.chatId === chatId).length} castle(s)\n\n` +
      `Use /scan to send all tile coords.`
    );
    return;
  }

  // /status
  if (text.startsWith("/status")) {
    const myCastles = castles.filter(c => c.chatId === chatId);
    if (!myCastles.length) {
      await send(chatId, `📋 Queue empty hai.\nUse \`/report X Y PlayerName\` to add castles.`);
      return;
    }
    const list = myCastles.map((c, i) =>
      `${i + 1}. *${c.name}* — \`(${c.x},${c.y})\` — K${c.kingdom}`
    ).join("\n");
    await send(chatId, `📋 *Castle Queue (${myCastles.length})*\n${kingdom ? `🗺 Kingdom: K${kingdom}\n` : ''}\n${list}`);
    return;
  }

  // /clear
  if (text.startsWith("/clear")) {
    const count = castles.filter(c => c.chatId === chatId).length;
    castles = castles.filter(c => c.chatId !== chatId);
    await send(chatId, `🗑 ${count} castle(s) clear ho gaye.`);
    return;
  }

  // /scan
  if (text.startsWith("/scan")) {
    const myCastles = castles.filter(c => c.chatId === chatId);
    if (!myCastles.length) {
      await send(chatId, `⚠️ Koi castle nahi hai. Pehle /report karo.`);
      return;
    }

    await send(chatId,
      `⚔️ *SCAN STARTED*\n` +
      `🗺 Kingdom: *K${kingdom}*\n` +
      `🏰 Castles: ${myCastles.length}\n` +
      `📡 Tile coordinates bhej rahe hain...`
    );

    for (const castle of myCastles) {
      const tiles = generateTiles(castle.x, castle.y, 10);

      await send(chatId,
        `🎯 *UNSHIELD ALERT — K${castle.kingdom}*\n` +
        `👤 Player: *${castle.name}*\n` +
        `📍 Base: \`(${castle.x},${castle.y})\`\n` +
        `🗺 ${tiles.length} tiles scan ho rahe hain...`
      );
      await sleep(500);

      const batchSize = 10;
      for (let i = 0; i < tiles.length; i += batchSize) {
        const batch = tiles.slice(i, i + batchSize);
        const msg = `🏹 K${castle.kingdom} [${castle.name}] ` + batch.join(" | ");
        await send(chatId, msg, null);
        await sleep(500);
      }

      await send(chatId, `✅ *${castle.name}* (K${castle.kingdom}) — all tiles sent!`);
      await sleep(1000);
    }

    await send(chatId,
      `✅ *Scan Complete!*\n` +
      `🗺 Kingdom: K${kingdom}\n` +
      `${myCastles.length} castle(s) processed.\n` +
      `Use /clear to reset queue.`
    );
    return;
  }
});

// Health check
app.get("/", (req, res) => res.send("War Bot is running ⚔️"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`War Bot running on port ${PORT}`));
