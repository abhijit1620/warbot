const express = require("express");
const app = express();
app.use(express.json());

const TOKEN = process.env.BOT_TOKEN;
const API = `https://api.telegram.org/bot${TOKEN}`;

// In-memory castle queue (resets on redeploy — good enough for war sessions)
let castles = [];
let scanLog = [];

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

// ── Sleep helper ──
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Webhook handler ──
app.post("/webhook", async (req, res) => {
  res.sendStatus(200); // always ack Telegram fast

  const msg = req.body.message;
  if (!msg || !msg.text) return;

  const chatId = msg.chat.id;
  const text = msg.text.trim();
  const from = msg.from.first_name || "Commander";

  // /start or /help
  if (text.startsWith("/start") || text.startsWith("/help")) {
    await send(chatId,
      `⚔️ *War Bot — Unshield Tracker*\n\n` +
      `Commands:\n` +
      `/report X Y PlayerName — Report unshielded castle\n` +
      `/scan — Scan all reported castles & send tile coords\n` +
      `/status — Show castle queue\n` +
      `/clear — Clear all castles\n` +
      `/id — Show this chat's ID\n\n` +
      `Example: \`/report 312 487 DragonLord99\``
    );
    return;
  }

  // /id
  if (text.startsWith("/id")) {
    await send(chatId, `🆔 Chat ID: \`${chatId}\``);
    return;
  }

  // /report X Y PlayerName
  if (text.startsWith("/report")) {
    const parts = text.split(/\s+/).slice(1);
    if (parts.length < 3) {
      await send(chatId, `⚠️ Usage: \`/report X Y PlayerName\`\nExample: \`/report 312 487 DragonLord99\``);
      return;
    }
    const x = parseInt(parts[0]);
    const y = parseInt(parts[1]);
    const name = parts.slice(2).join(" ");

    if (isNaN(x) || isNaN(y) || x < 0 || x > 999 || y < 0 || y > 999) {
      await send(chatId, `⚠️ Invalid coordinates. X and Y must be between 0–999.`);
      return;
    }

    castles.push({ x, y, name, reportedBy: from, ts: Date.now() });
    await send(chatId,
      `🏰 *Castle Reported!*\n` +
      `👤 Player: *${name}*\n` +
      `📍 Coords: \`(${x}, ${y})\`\n` +
      `🗺 ${generateTiles(x, y).length} tiles queued for scan\n` +
      `📋 Queue: ${castles.length} castle(s)\n\n` +
      `Use /scan to send all tile coords to this group.`
    );
    return;
  }

  // /status
  if (text.startsWith("/status")) {
    if (!castles.length) {
      await send(chatId, `📋 No castles in queue.\nUse /report X Y PlayerName to add one.`);
      return;
    }
    const list = castles.map((c, i) =>
      `${i + 1}. *${c.name}* — \`(${c.x},${c.y})\``
    ).join("\n");
    await send(chatId, `📋 *Castle Queue (${castles.length})*\n\n${list}`);
    return;
  }

  // /clear
  if (text.startsWith("/clear")) {
    const count = castles.length;
    castles = [];
    await send(chatId, `🗑 Cleared ${count} castle(s) from queue.`);
    return;
  }

  // /scan
  if (text.startsWith("/scan")) {
    if (!castles.length) {
      await send(chatId, `⚠️ No castles to scan. Use /report first.`);
      return;
    }

    await send(chatId,
      `⚔️ *SCAN STARTED*\n` +
      `🏰 Castles: ${castles.length}\n` +
      `📡 Sending tile coordinates now...`
    );

    for (const castle of castles) {
      const tiles = generateTiles(castle.x, castle.y, 10); // 20x20 radius

      // Send castle header
      await send(chatId,
        `🎯 *UNSHIELD ALERT*\n` +
        `👤 Player: *${castle.name}*\n` +
        `📍 Base: \`(${castle.x},${castle.y})\`\n` +
        `🗺 Scanning ${tiles.length} tiles around castle...`
      );
      await sleep(500);

      // Send tiles in batches of 10
      const batchSize = 10;
      for (let i = 0; i < tiles.length; i += batchSize) {
        const batch = tiles.slice(i, i + batchSize);
        const msg = `🏹 [${castle.name}] ` + batch.join(" | ");
        await send(chatId, msg, null);
        await sleep(500);
      }

      await send(chatId, `✅ *${castle.name}* — all tiles sent!`);
      await sleep(1000);
    }

    await send(chatId,
      `✅ *Scan Complete!*\n` +
      `${castles.length} castle(s) processed.\n` +
      `Use /clear to reset the queue.`
    );
    return;
  }
});

// Health check
app.get("/", (req, res) => res.send("War Bot is running ⚔️"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`War Bot running on port ${PORT}`));
