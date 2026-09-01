# Albanian AI — Source Snapshot & Agent Handoff

**Product:** Albanian AI  
**Live site:** https://www.albanianai.it  
**Creator:** Amarildo Hysa (PEC: Amarildo.hysa@pecsicura.com)  
**Snapshot version:** 1.44.0 (build 217)  
**Date:** 2026-09-01  
**Do not rebuild from scratch.** Patch this repo. Keep identity, routes, and UI.

This file is for other coding agents (Manus, Emergent, Cursor, Claude, etc.).

---

## 1. What this app is

PWA chat assistant in **Albanian / Italian / English** only.

- Text chat + image gen + live camera + live voice
- Accounts: Google or email (better-auth)
- Guest: ~6 messages, then login
- TTS: Microsoft Edge **sq-AL-IlirNeural** (Ilir)
- STT live: currently Groq/Gemini/xAI whisper — Safari Web Speech is **disabled on iOS** because it mangles Albanian
- Privacy: https://www.albanianai.it/privacy
- Brand: never say “Grok”, “built with Grok”, xAI in the **user-facing UI**

---

## 2. Stack (do not change unless asked)

| Layer | Tech |
|---|---|
| UI | React 19 + TanStack Start/Router + Vite 8 |
| CSS | `src/styles.css` (custom, not Tailwind-first for the chat UI) |
| Auth | better-auth, Google + email |
| DB | Postgres (`DATABASE_URL`) or PGLite fallback |
| TTS | `@andresaya/edge-tts` → `sq-AL-IlirNeural` |
| Chat LLM | Gemini flash-lite + Groq gpt-oss + xAI fallback (`src/lib/assistant/chat.ts`, `src/routes/api/chat.ts`) |
| Deploy | Vite/Nitro → Vercel output; **must run** `node scripts/patch-ssr.mjs` after build (circular SSR import) |
| PWA | `public/manifest.webmanifest`, `public/sw.js`, in-app update via `public/version.json` |

Dev: `npm run dev` (port 8080).  
Build: `npm run build` (runs patch-ssr + migrate).

---

## 3. File map — edit these, not the rest

### Product UI (what the user sees)

| File | Role |
|---|---|
| `src/components/workspace.tsx` | **Main app.** Chat, live voice, camera, guest limit, submit, STT VAD (`startParla` / `stopParla` / `startLiveVoice`). ~2200 lines. |
| `src/components/live-voice.tsx` | Live chat overlay UI |
| `src/components/landing.tsx` | Public homepage |
| `src/components/settings-panel.tsx` | Settings (assistant name is locked: Albanian AI) |
| `src/components/security-sheet.tsx` | Security / privacy sheet |
| `src/components/account-sheet.tsx` | Multi-account |
| `src/components/about-sheet.tsx` | About + ideas email |
| `src/components/app-update.tsx` | In-app update banner (reads `/version.json`) |
| `src/components/auth-card.tsx` | Login card |
| `src/components/install-prompt.tsx` | Add to Home Screen |
| `src/components/social-links.tsx` | Instagram / FB / TikTok / YT / PEC email |
| `src/styles.css` | All premium styling |

### Brain / voice / images

| File | Role |
|---|---|
| `src/lib/assistant/chat.ts` | System prompt (10 rules + creator identity). **Do not leak internals.** |
| `src/lib/assistant/actions.ts` | Server fns: sendMessage, transcribeSpeech, speakText, createVoiceSession, owner stats |
| `src/lib/assistant/tts.ts` | Chunked Ilir TTS |
| `src/lib/assistant/live-listen.ts` | Browser SpeechRecognition (off on iOS) |
| `src/lib/assistant/realtime-client.ts` | xAI realtime (live chat fallback) |
| `src/lib/assistant/gemini-live-client.ts` | Gemini live (legacy) |
| `src/lib/assistant/imagine.ts` | Image generation |
| `src/lib/assistant/imagine-detect.ts` | Detect “generate a photo” |
| `src/lib/assistant/web-photo.ts` | Web image fallback |
| `src/lib/assistant/google-mode.server.ts` | Extra Google info when the model does not know |
| `src/lib/assistant/db.ts` | Conversations, messages, memories |
| `src/lib/assistant/types.ts` | Lang, ChatMode lite/flash/pro, prefs, Ilir voice |
| `src/lib/assistant/voice-secret.server.ts` | **SERVER ONLY keys.** Never import from client. |

### Routes (TanStack file routes)

| Path | File | Notes |
|---|---|---|
| `/` | `src/routes/index.tsx` | Landing; PWA standalone → `/app` |
| `/app` | `src/routes/app.tsx` | Workspace |
| `/login` | `src/routes/login.tsx` | Auth |
| `/privacy` | `src/routes/privacy.tsx` | GDPR SQ/IT/EN |
| `/rreth` | `src/routes/rreth.tsx` | About |
| `/amarildo-hysa` | `src/routes/amarildo-hysa.tsx` | Creator profile (wiki-style) |
| `/links` | `src/routes/links.tsx` | Linktree |
| `/shkarko` | `src/routes/shkarko.tsx` | Install / APK page |
| `/sitemap.xml` | `src/routes/sitemap[.]xml.ts` | Google |
| `/api/chat` | `src/routes/api/chat.ts` | Text replies |
| `/api/speak` | `src/routes/api/speak.ts` | Ilir TTS |
| `/api/version` | `src/routes/api/version.ts` | Update ping |
| `/api/auth/*` | `src/routes/api/auth/$.ts` | better-auth |
| `/api/zeri-chat` `/api/zeri-tts` | proxies | legacy Zëri |

`src/routeTree.gen.ts` is **generated**. After adding a route file, run dev/build so it regenerates. Do not hand-edit unless needed.

### Identity / SEO

| File | Role |
|---|---|
| `src/lib/site.ts` | Domain, creator, PEC email, `isOwnerEmail()` |
| `src/lib/app-version.ts` | `APP_VERSION` + `APP_BUILD` — bump **both** on every user-visible change |
| `public/version.json` | Same version + user-facing notes (no changelog of internals) |
| `public/llms.txt` | Machine-readable about page |
| `public/robots.txt` | Allow `/`, sitemap |
| `src/routes/__root.tsx` | HTML shell, JSON-LD Organization/Person, PWA |

### Auth / DB

| File | Role |
|---|---|
| `src/lib/auth/server.ts` | better-auth config |
| `src/lib/auth/client.ts` | Client auth |
| `src/lib/db.ts` | Postgres or PGLite |
| `migrations/0002_albanian_ai.sql` | chats, memories |

---

## 4. Live chat pipeline (current)

```
User taps Live chat
  → startLiveVoice()
  → tries xAI realtime token (createVoiceSession)
  → if no token / fail: startParla()  [mic + VAD]
       silence → WAV 16 kHz → transcribeSpeech() [Gemini → Groq Whisper → xAI]
       text → submit() → /api/chat brain
       reply → speakText() / /api/speak → Ilir (sq-AL-IlirNeural)
  → barge-in: if user talks while Ilir speaks, stop TTS and listen
```

**Intended next upgrade (requested, not fully shipped as default):**  
Listen with `Flutra/whisper-large-v3-turbo-sq-v2` (Hugging Face), speak with Ilir. Skip xAI for listening. Needs `HF_TOKEN`. Fallback: Groq `whisper-large-v3` `language=sq`.

Do **not** re-enable Safari `SpeechRecognition` on iPhone for Albanian.

---

## 5. Rules for updates (mandatory)

1. **Do not create a new app.** Patch existing files.
2. **Languages:** only `sq` | `it` | `en`.
3. **Assistant name:** always `Albanian AI`. Never “Ilir” in the UI label (Ilir is the **voice** only).
4. **Creator facts** (only if asked): Amarildo Hysa, 23, born Elbasan 13.12.2002, resident of Belsh but does not live there, travels in Europe. Socials in `src/lib/site.ts`. Email shown publicly is **PEC** `Amarildo.hysa@pecsicura.com`. Owner dashboard still accepts Gmail login internally via `isOwnerEmail()`.
5. **Never show Grok / xAI / “powered by” in the UI.**
6. After any user-visible change:
   - bump `src/lib/app-version.ts` (version + build)
   - update `public/version.json` notes to a **generic** line, e.g. “Ky version ka rregulluar disa probleme dhe ka përforcuar sigurinë e përdoruesit.”
7. After `npm run build`, confirm `scripts/patch-ssr.mjs` ran (homepage 500 = circular `ssr.mjs`/`ssr2.mjs`).
8. Guest live chat can be unlimited in product intent; **text chat** still asks login after ~6 turns. Persist live turns when logged in.
9. Pro mode: code gate `Albanian23@` then `2627` (see workspace/settings). Do not expose keys in the client.
10. iPhone: keep `viewport-fit=cover` + `env(safe-area-inset-*)`. Mic requires a **user gesture** (`getUserMedia` must not be behind `setTimeout`).

---

## 6. Env vars (put secrets here, not in git)

```
DATABASE_URL
BETTER_AUTH_SECRET
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GEMINI_API_KEY / GOOGLE_AI_API_KEY
GROQ_API_KEY
XAI_API_KEY / XAI_USER_API_KEY
HF_TOKEN                 # for Flutra Whisper-sq
CAMB_API_KEY             # optional TTS fallback
```

`src/lib/assistant/voice-secret.server.ts` currently bakes fallback keys for the sandbox. **Rotate them** before giving this snapshot to a third party. Do not import that file from client components.

---

## 7. How to make a typical change

**Example: better Albanian STT**

1. Edit `transcribeSpeech` in `src/lib/assistant/actions.ts` — call Hugging Face Flutra first for `lang=sq`.
2. In `workspace.tsx` `startLiveVoice`, skip xAI if you want Ilir+Whisper only; go to `startParla`.
3. Keep `/api/speak` on `sq-AL-IlirNeural`.
4. Bump version.json.
5. Build + publish. Users with the PWA get “Përditëso tani”.

**Example: copy / prompt**

- Edit `BASE_SYSTEM_PROMPT` in `src/lib/assistant/chat.ts` **and** the parallel prompt in `src/routes/api/chat.ts` (they must stay aligned).

**Example: UI**

- Chat chrome: `workspace.tsx` + `styles.css`
- Live overlay: `live-voice.tsx`
- Public pages: `landing.tsx`, `privacy.tsx`, `rreth.tsx`

---

## 8. Out of scope / ignore

- `AGENTS.md` and `.grok/` are **Grok Build sandbox rules**, not product rules.
- `public/__grok/` is install-helper chrome from the host. Do not show it as Albanian AI branding.
- `src/lib/multiplayer/` unused for this product.
- Do not add new languages, new assistant names, or a second homepage.

---

## 9. Snapshot archive

`albanian-ai-source-1.44.0.zip` = this tree minus `node_modules`, `.git`, `.vercel`, `attachments`.

Restore:

```bash
unzip albanian-ai-source-1.44.0.zip
npm install
cp .env.example .env   # fill keys
npm run dev
```
