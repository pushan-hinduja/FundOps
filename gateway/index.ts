import "dotenv/config";
import express from "express";
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  WASocket,
  BaileysEventMap,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import * as QRCode from "qrcode";
import pino from "pino";
import fs from "fs";
import path from "path";

const PORT = Number(process.env.PORT) || 3001;
const GATEWAY_SECRET = process.env.WA_GATEWAY_SECRET || "";
const WEBHOOK_URL = process.env.WA_WEBHOOK_URL || "";
const WEBHOOK_SECRET = process.env.WA_WEBHOOK_SECRET || "";
const AUTH_DIR = path.join(__dirname, "auth_store");
const SELECTED_GROUPS_FILE = path.join(__dirname, "selected_groups.json");

const logger = pino({ level: "warn" });
const app = express();
app.use(express.json());

let sock: WASocket | null = null;
let currentQR: string | null = null;
let isConnecting = false;

// --- Selected groups persistence ---
function loadSelectedGroups(): string[] {
  try {
    if (fs.existsSync(SELECTED_GROUPS_FILE)) {
      return JSON.parse(fs.readFileSync(SELECTED_GROUPS_FILE, "utf-8"));
    }
  } catch {}
  return [];
}

function saveSelectedGroups(groupJids: string[]) {
  fs.writeFileSync(SELECTED_GROUPS_FILE, JSON.stringify(groupJids, null, 2));
}

let selectedGroups: string[] = loadSelectedGroups();

// --- Auth middleware ---
function authMiddleware(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  if (GATEWAY_SECRET) {
    const auth = req.headers.authorization || "";
    if (auth !== `Bearer ${GATEWAY_SECRET}`) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  }
  next();
}

app.use(authMiddleware);

// --- Baileys connection ---
async function startSocket() {
  if (isConnecting) return;
  isConnecting = true;
  currentQR = null;

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  sock = makeWASocket({
    auth: state,
    logger: logger as any,
    version: [2, 3000, 1034074495],
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      currentQR = qr;
      console.log("[Gateway] New QR code generated");
    }

    if (connection === "close") {
      isConnecting = false;
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      // Only reconnect on transient errors (e.g. network drop)
      // Don't reconnect on loggedOut, forbidden (405), or bad session
      const shouldReconnect =
        statusCode !== DisconnectReason.loggedOut &&
        statusCode !== 405 &&
        statusCode !== 401 &&
        statusCode !== 403;
      console.log(
        `[Gateway] Connection closed. Status: ${statusCode}. Reconnecting: ${shouldReconnect}`
      );
      if (shouldReconnect) {
        startSocket();
      } else {
        sock = null;
        currentQR = null;
        // Clear bad credentials
        if (fs.existsSync(AUTH_DIR)) {
          fs.rmSync(AUTH_DIR, { recursive: true, force: true });
          console.log("[Gateway] Cleared invalid credentials");
        }
      }
    }

    if (connection === "open") {
      isConnecting = false;
      currentQR = null;
      console.log(`[Gateway] Connected as ${sock?.user?.id}`);
    }
  });

  // Forward group messages to the webhook
  sock.ev.on(
    "messages.upsert",
    async (m: BaileysEventMap["messages.upsert"]) => {
      if (m.type !== "notify") return;

      for (const msg of m.messages) {
        // Only handle group messages with text
        const remoteJid = msg.key.remoteJid || "";
        if (!remoteJid.endsWith("@g.us")) continue;

        // Only forward from selected groups (if any are selected)
        if (selectedGroups.length > 0 && !selectedGroups.includes(remoteJid)) {
          continue;
        }

        const text =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          "";
        if (!text) continue;

        // Don't forward our own messages
        if (msg.key.fromMe) continue;

        const payload = {
          from: msg.key.participant || msg.key.remoteJid || "",
          group: remoteJid.replace("@g.us", ""),
          text,
          timestamp: msg.messageTimestamp?.toString() || "",
          pushName: msg.pushName || "",
          messageId: msg.key.id || "",
        };

        if (!WEBHOOK_URL) {
          console.log("[Gateway] No WA_WEBHOOK_URL set, skipping forward");
          continue;
        }

        try {
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
          };
          if (WEBHOOK_SECRET) {
            headers["Authorization"] = `Bearer ${WEBHOOK_SECRET}`;
          }

          const res = await fetch(WEBHOOK_URL, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
          });
          console.log(
            `[Gateway] Forwarded message ${msg.key.id} → ${res.status}`
          );
        } catch (err) {
          console.error(
            "[Gateway] Webhook forward failed:",
            (err as Error).message
          );
        }
      }
    }
  );
}

// --- Routes ---

app.get("/qr", async (_req, res) => {
  // Already connected
  if (sock?.user) {
    res.json({ status: "connected", phone: sock.user.id.split(":")[0] });
    return;
  }

  // Start connection if not already started
  if (!sock && !isConnecting) {
    startSocket();
    // Give Baileys a moment to generate the QR
    await new Promise((r) => setTimeout(r, 2000));
  }

  if (currentQR) {
    const qrDataUrl = await QRCode.toDataURL(currentQR, { width: 256 });
    res.json({ status: "qr", qr: qrDataUrl });
    return;
  }

  // QR not ready yet
  res.json({ status: "waiting", message: "Generating QR code..." });
});

app.get("/status", (_req, res) => {
  if (sock?.user) {
    res.json({
      connected: true,
      phone: sock.user.id.split(":")[0],
    });
    return;
  }

  res.json({
    connected: false,
    connecting: isConnecting,
    hasQR: !!currentQR,
  });
});

// List all groups the user belongs to
app.get("/groups", async (_req, res) => {
  if (!sock?.user) {
    res.status(400).json({ error: "Not connected" });
    return;
  }

  try {
    const myNumber = sock.user.id.split(":")[0];
    const groups = await sock.groupFetchAllParticipating();
    const groupList = Object.values(groups).map((g) => {
      // For groups without a name, build one from participant phone numbers
      let name = g.subject;
      if (!name && g.participants) {
        const otherMembers = g.participants
          .map((p) => p.id.split("@")[0])
          .filter((num) => num !== myNumber);
        name = otherMembers.map((n) => `+${n}`).join(", ");
      }
      return {
        jid: g.id,
        name: name || "Unknown group",
        participants: g.participants?.length || 0,
        selected: selectedGroups.includes(g.id),
      };
    });

    // Sort alphabetically by name
    groupList.sort((a, b) => a.name.localeCompare(b.name));

    res.json({ groups: groupList, selectedGroups });
  } catch (err) {
    console.error("[Gateway] Failed to fetch groups:", (err as Error).message);
    res.status(500).json({ error: "Failed to fetch groups" });
  }
});

// Update which groups to monitor
app.post("/groups", (req, res) => {
  const { groups: groupJids } = req.body;

  if (!Array.isArray(groupJids)) {
    res.status(400).json({ error: "groups must be an array of JIDs" });
    return;
  }

  selectedGroups = groupJids;
  saveSelectedGroups(selectedGroups);

  console.log(`[Gateway] Updated selected groups: ${selectedGroups.length} groups`);
  res.json({ ok: true, selectedGroups });
});

app.post("/disconnect", async (_req, res) => {
  try {
    if (sock) {
      await sock.logout();
      sock = null;
    }
    currentQR = null;
    isConnecting = false;

    // Clear auth store and selected groups
    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    }
    if (fs.existsSync(SELECTED_GROUPS_FILE)) {
      fs.unlinkSync(SELECTED_GROUPS_FILE);
    }
    selectedGroups = [];

    res.json({ ok: true });
  } catch (err) {
    console.error("[Gateway] Disconnect error:", (err as Error).message);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Check if auth_store has actual credential files (not just an empty directory)
function hasSavedCredentials(): boolean {
  if (!fs.existsSync(AUTH_DIR)) return false;
  const files = fs.readdirSync(AUTH_DIR);
  return files.some((f) => f.endsWith(".json"));
}

// --- Start ---
app.listen(PORT, () => {
  console.log(`[Gateway] WhatsApp gateway listening on port ${PORT}`);

  // Auto-connect only if we have real saved credentials
  if (hasSavedCredentials()) {
    console.log("[Gateway] Found saved credentials, auto-connecting...");
    startSocket();
  }
});
