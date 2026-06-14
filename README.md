# War Bot — Lords Mobile Unshield Tracker

## Deploy on Railway (Step by Step)

### Step 1 — Upload to GitHub
1. Go to https://github.com and create a free account if you don't have one
2. Click **New Repository** → name it `warbot` → click **Create**
3. Upload these files: `index.js`, `package.json`, `railway.json`

### Step 2 — Deploy on Railway
1. Go to https://railway.app and sign in with GitHub
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your `warbot` repo
4. Railway will auto-detect and start deploying

### Step 3 — Set Environment Variable
1. In Railway, click your project → **Variables** tab
2. Add variable:
   - Name: `BOT_TOKEN`
   - Value: `8600060730:AAGPDqsXSGosbgxxuPtmu80cS05eO1Fd5uA`
3. Railway will auto-redeploy

### Step 4 — Set Webhook
1. Once deployed, Railway gives you a URL like:
   `https://warbot-production-xxxx.up.railway.app`
2. Open this URL in your browser to register the webhook:
   ```
   https://api.telegram.org/bot8600060730:AAGPDqsXSGosbgxxuPtmu80cS05eO1Fd5uA/setWebhook?url=https://YOUR-RAILWAY-URL.up.railway.app/webhook
   ```
3. You should see: `{"ok":true,"result":true}`

### Step 5 — Test in your group
Send `/help` in your Telegram group — the bot should respond!

## Commands
- `/report X Y PlayerName` — Report unshielded castle
- `/scan` — Scan all castles and send tile coords
- `/status` — Show castle queue
- `/clear` — Clear queue
- `/id` — Show chat ID
- `/help` — Show help
