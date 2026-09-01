import WebSocket from "ws";
import { VOICE_AGENT_ID } from "./voice-agent";

export type VoiceEvent = {
  type?: string;
  delta?: string;
  transcript?: string;
  error?: { message?: string };
};

type Bridge = {
  ws: WebSocket;
  queue: VoiceEvent[];
  waiters: Array<(events: VoiceEvent[]) => void>;
};

const bridges = new Map<string, Bridge>();

function flush(bridge: Bridge, events: VoiceEvent[]) {
  if (!events.length) return;
  if (bridge.waiters.length) {
    const waiters = bridge.waiters.splice(0);
    waiters.forEach((fn) => fn(events));
    return;
  }
  bridge.queue.push(...events);
}

export function openVoiceBridge(apiKey: string) {
  return new Promise<string>((resolve, reject) => {
    const id = crypto.randomUUID();
    const ws = new WebSocket(`wss://api.x.ai/v1/realtime?model=grok-voice-latest&agent_id=${VOICE_AGENT_ID}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const timer = setTimeout(() => {
      ws.terminate();
      reject(new Error("Live Voice nuk u lidh. Provo përsëri."));
    }, 12_000);

    ws.once("open", () => {
      clearTimeout(timer);
      bridges.set(id, { ws, queue: [], waiters: [] });
      resolve(id);
    });
    ws.once("unexpected-response", (_req, res) => {
      clearTimeout(timer);
      reject(new Error(res.statusCode === 401 || res.statusCode === 403 ? "API pa akses" : "Live Voice nuk u lidh."));
    });
    ws.once("error", () => {
      clearTimeout(timer);
      reject(new Error("Live Voice nuk u lidh."));
    });
    ws.on("message", (raw) => {
      const bridge = bridges.get(id);
      if (!bridge) return;
      try {
        flush(bridge, [JSON.parse(String(raw)) as VoiceEvent]);
      } catch {
        /* ignore */
      }
    });
    ws.on("error", () => {
      const bridge = bridges.get(id);
      if (bridge) flush(bridge, [{ type: "error", error: { message: "Lidhja e zërit u ndërpre." } }]);
    });
    ws.on("close", () => {
      const bridge = bridges.get(id);
      if (bridge) flush(bridge, [{ type: "closed" }]);
      bridges.delete(id);
    });
  });
}

export function sendVoiceBridge(id: string, payload: unknown) {
  const bridge = bridges.get(id);
  if (!bridge || bridge.ws.readyState !== WebSocket.OPEN) {
    throw new Error("Lidhja e zërit nuk është aktive. Prek mikrofonin.");
  }
  bridge.ws.send(JSON.stringify(payload));
}

export function takeVoiceEvents(id: string, waitMs = 3_500) {
  const bridge = bridges.get(id);
  if (!bridge) return Promise.resolve([{ type: "closed" }] as VoiceEvent[]);
  if (bridge.queue.length) return Promise.resolve(bridge.queue.splice(0));
  return new Promise<VoiceEvent[]>((resolve) => {
    const timer = setTimeout(() => {
      bridge.waiters = bridge.waiters.filter((item) => item !== onEvents);
      resolve([]);
    }, waitMs);
    const onEvents = (events: VoiceEvent[]) => {
      clearTimeout(timer);
      resolve(events);
    };
    bridge.waiters.push(onEvents);
  });
}

export function closeVoiceBridge(id: string) {
  const bridge = bridges.get(id);
  if (!bridge) return;
  try {
    bridge.ws.close();
  } catch {
    /* ignore */
  }
  bridges.delete(id);
}
