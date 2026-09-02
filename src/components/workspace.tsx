// @ts-nocheck
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { toast } from "sonner";
import {
  AudioLines,
  Camera,
  Check,
  ChevronDown,
  Copy,
  Download,
  FileText,
  ImagePlus,
  Info,
  Lightbulb,
  Loader2,
  Menu,
  Mic,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings2,
  Share2,
  ShieldCheck,
  Square,
  SwitchCamera,
  Trash2,
  Users,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { AccountSheet } from "@/components/account-sheet";
import { AuthCard } from "@/components/auth-card";
import { AboutSheet } from "@/components/about-sheet";
import { SecuritySheet } from "@/components/security-sheet";
import { StatsSheet } from "@/components/stats-sheet";
import { InstallPrompt } from "@/components/install-prompt";
import { LiveVoicePanel } from "@/components/live-voice";
import { Markdown } from "@/components/markdown";
import { SettingsPanel } from "@/components/settings-panel";
import { Button } from "@/components/ui/button";
import {
  bootstrapWorkspace,
  createConversation,
  deleteConversation,
  editUserMessage,
  getConversation,
  guestReply,
  importGuestThread,
  liveGenerateImage,
  listConversations,
  regenerateMessage,
  sendMessage,
  saveLiveTurn,
  savePreferences,
  speakText,
  transcribeSpeech,
  uploadTextFile,
  createVoiceSession,
  seeLiveFrame,
} from "@/lib/assistant/actions";
import {
  downsample,
  encodeWav,
  cleanSpeechPcm,
  pickRecorderMime,
  keepAudioAlive,
  playMp3Base64,
  playUrl,
  stopAllSpeech,
  unlockAudio,
  setNowPlaying,
  browserSpeak,
  captureAudioContext,
  closeCaptureAudio,
} from "@/lib/assistant/browser-voice";
import { extractLocalFile } from "@/lib/assistant/extract-file";
import { detectLang } from "@/lib/assistant/lang";
import { transcribeLocalWhisper } from "@/lib/assistant/local-whisper";
import { canLiveListen, isAssistantEcho, startLiveListen, type LiveListenHandle } from "@/lib/assistant/live-listen";
import { startRealtimeVoice, type RealtimeSession } from "@/lib/assistant/realtime-client";
import { parseGeneratedImage, wantsGeneratedImage } from "@/lib/assistant/imagine-detect";
import {
  DEFAULT_PREFS,
  greetingFor,
  parseChatMode,
  isVoiceId,
  voiceForMode,
  VOICE_OPTIONS,
  type ChatMode,
  type ConversationRow,
  type Lang,
  type MemoryRow,
  type MessageRow,
  type Prefs,
} from "@/lib/assistant/types";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { rememberAccount } from "@/lib/accounts";
import { CREATOR, ideaMailto, isOwnerEmail } from "@/lib/site";
import { APP_VERSION } from "@/lib/app-version";

var GUEST_LIMIT = 6;
function isLiveMessage(id) {
	return id.startsWith("live-");
}
var GUEST_KEY = "albanian-ai-guest";
var GUEST_THREAD = "albanian-ai-guest-thread";
var PREFS_KEY = "albanian-ai-prefs";
function readLocalPrefs() {
	try {
		const raw = localStorage.getItem(PREFS_KEY);
		if (!raw) return DEFAULT_PREFS;
		return {
			...DEFAULT_PREFS,
			...JSON.parse(raw)
		};
	} catch {
		return DEFAULT_PREFS;
	}
}
function writeLocalPrefs(value) {
	localStorage.setItem(PREFS_KEY, JSON.stringify(value));
}
function guestId() {
	const existing = localStorage.getItem(GUEST_KEY);
	if (existing) return existing;
	const id = crypto.randomUUID();
	localStorage.setItem(GUEST_KEY, id);
	return id;
}
function readGuestThread() {
	try {
		const raw = localStorage.getItem(GUEST_THREAD);
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
}
function writeGuestThread(rows) {
	localStorage.setItem(GUEST_THREAD, JSON.stringify(rows.slice(-80)));
}
function clearGuestThread() {
	localStorage.removeItem(GUEST_THREAD);
}
function applyTheme(theme) {
	const dark = theme === "dark" || theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches;
	document.documentElement.classList.toggle("dark", dark);
}
function parseUserContent(content) {
	return {
		image: content.match(/\[\[AAI_IMG]]([\s\S]*?)\[\[\/AAI_IMG]]/)?.[1],
		text: content.replace(/\[\[AAI_IMG]][\s\S]*?\[\[\/AAI_IMG]]/g, "").trim()
	};
}
function compressImage(file) {
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file);
		const img = new Image();
		img.onload = () => {
			const scale = Math.min(1, 720 / Math.max(img.width, img.height));
			const canvas = document.createElement("canvas");
			canvas.width = Math.max(1, Math.round(img.width * scale));
			canvas.height = Math.max(1, Math.round(img.height * scale));
			const ctx = canvas.getContext("2d");
			if (!ctx) {
				reject(/* @__PURE__ */ new Error("foto"));
				return;
			}
			ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
			URL.revokeObjectURL(url);
			resolve(canvas.toDataURL("image/jpeg", .62));
		};
		img.onerror = () => reject(/* @__PURE__ */ new Error("foto"));
		img.src = url;
	});
}
function voiceLangFromPrefs(prefs) {
	return prefs.language;
}
function cleanHeard(text) {
	return text.replace(/\s+/g, " ").trim().replace(/\bjeti\b/gi, "je ti").replace(/\bkushje\b/gi, "kush je").replace(/\bsije\b/gi, "si je").replace(/\bunëjam\b/gi, "unë jam").replace(/\bçfare\b/gi, "çfarë").replace(/\bpershendetje\b/gi, "përshëndetje").replace(/\bGëzon\.?$/i, "Gëzohem");
}
function pickReply(result) {
	if (!result) return "";
	if (typeof result === "string") return result.trim();
	const text = result.response || result.data?.response || result.result?.response || "";
	return typeof text === "string" ? text.trim() : "";
}
async function askBrain(prompt, lang, turns) {
	try {
		const res = await fetch("/api/chat", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				content: prompt,
				language: lang,
				turns: (turns || []).slice(-12).map((item) => ({
					role: item.role,
					content: String(item.content || "").replace(/\[\[AAI_IMG]][\s\S]*?\[\[\/AAI_IMG]]/g, "").trim()
				}))
			})
		});
		const json = await res.json().catch(() => ({}));
		const text = String(json?.response || "").trim();
		if (/të dëgjova\.?\s*the:/i.test(text) || /pas një sekondi/i.test(text)) return "";
		return text;
	} catch {
		return "";
	}
}
function localBrain(text, lang) {
	const t = String(text || "").trim();
	if (/kush je ti|kush jeni|who are you|chi sei|si quhesh/i.test(t)) {
		if (lang === "it") return "Sono Albanian AI, creato da Amarildo Hysa. Ti ascolto.";
		if (lang === "en") return "I'm Albanian AI, created by Amarildo Hysa. I'm here for you.";
		return "Unë jam Albanian AI, krijuar nga Amarildo Hysa. Jam këtu për ty.";
	}
	if (/instagram|tiktok|youtube|facebook|email|gemail|posta/i.test(t) && /amarildo|krijues|creator|social/i.test(t)) {
		return "Instagram: https://www.instagram.com/r.1ld1\nTikTok: https://www.tiktok.com/@accountremoved034\nYouTube: https://youtube.com/@777productionmusic\nFacebook: https://www.facebook.com/share/1EBjsAbdeN/\nEmail: Amarildo.hysa@pecsicura.com";
	}
	if (/çfarë? dit|cfar[eë]? dit|what day|che giorno|data e sotme|dit[eë] [eë]?sht[eë] sot/i.test(t)) {
		try {
			const locale = lang === "it" ? "it-IT" : lang === "en" ? "en-GB" : "sq-AL";
			const day = new Intl.DateTimeFormat(locale, {
				weekday: "long",
				day: "numeric",
				month: "long",
				year: "numeric",
				timeZone: "Europe/Tirane"
			}).format(/* @__PURE__ */ new Date());
			if (lang === "it") return `Oggi è ${day}.`;
			if (lang === "en") return `Today is ${day}.`;
			return `Sot është ${day}.`;
		} catch {
			return "Sot është e hënë, 31 gusht 2026.";
		}
	}
	if (/sa (është|esht|eshte) ora|what time|che ore|ora është|ora eshte/i.test(t)) {
		try {
			const time = new Intl.DateTimeFormat(lang === "it" ? "it-IT" : lang === "en" ? "en-GB" : "sq-AL", {
				hour: "2-digit",
				minute: "2-digit",
				hour12: false,
				timeZone: "Europe/Tirane"
			}).format(/* @__PURE__ */ new Date());
			if (lang === "it") return `Sono le ${time}.`;
			if (lang === "en") return `It's ${time}.`;
			return `Ora është ${time}.`;
		} catch {
			return "Ora është rreth mesditës.";
		}
	}
	if (/ca po ben|çfarë po bën|cfar po ben|si je|si jeni|how are you|come stai/i.test(t)) {
		if (lang === "it") return "Sto bene, grazie! Sono Albanian AI. Come posso aiutarti?";
		if (lang === "en") return "I'm good, thanks! I'm Albanian AI. How can I help?";
		return "Mirë, faleminderit! Unë jam Albanian AI, këtu për ty. Si mund t'ju ndihmoj?";
	}
	if (/përshëndetje|pershendetje|ciao|\bhello\b|\bhi\b|çkemi|ckemi/i.test(t)) {
		if (lang === "it") return "Ciao! Sono Albanian AI, creato da Amarildo Hysa. Come posso aiutarti?";
		if (lang === "en") return "Hello! I'm Albanian AI, created by Amarildo Hysa. How can I help?";
		return "Përshëndetje! Unë jam Albanian AI, krijuar nga Amarildo Hysa. Si mund t'ju ndihmoj?";
	}
	return "";
}
var speakGen = 0;
var cambQueue = [];
var cambBusy = false;
var cambSpeakHook = (_on) => {};
async function drainCambLive(lang) {
	if (cambBusy) return;
	cambBusy = true;
	const gen = speakGen;
	unlockAudio();
	setNowPlaying();
	cambSpeakHook(true);
	try {
		while (cambQueue.length && gen === speakGen) {
			const piece = cambQueue.shift();
			if (!piece) continue;
			let result = await speakText({ data: {
				text: piece,
				lang,
				voiceId: "ilir",
				guestId: guestId(),
				chunkIndex: 0,
				google: false,
				speechgen: true
			} });
			if (gen !== speakGen) return;
			if (!result.audioBase64) {
				result = await speakText({ data: {
					text: piece,
					lang,
					voiceId: "ilir",
					guestId: guestId(),
					chunkIndex: 0,
					google: false,
					speechgen: false
				} });
			}
			if (gen !== speakGen) return;
			if (result.audioBase64) await playMp3Base64(result.audioBase64, result.mime || "audio/mpeg");
		}
	} catch {
		/* ignore */
	} finally {
		cambBusy = false;
		if (cambQueue.length && gen === speakGen) void drainCambLive(lang);
		else if (gen === speakGen) cambSpeakHook(false);
	}
}
async function speakReply(text, lang, voiceId, onDone, google = false, speechgen = false) {
	const gen = ++speakGen;
	unlockAudio();
	setNowPlaying();
	stopAllSpeech();
	try {
		const res = await fetch("/api/speak", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				text,
				language: lang
			})
		});
		const json = await res.json().catch(() => ({}));
		if (gen !== speakGen) return;
		if (json?.audioBase64) {
			await playMp3Base64(json.audioBase64, json.mime || "audio/mpeg");
			if (gen === speakGen) onDone?.();
			return;
		}
	} catch {
		/* fallback below */
	}
	try {
		let started = false;
		let pending = speakText({ data: {
			text,
			lang,
			voiceId: "ilir",
			guestId: guestId(),
			chunkIndex: 0,
			google: false,
			speechgen: false
		} });
		while (gen === speakGen) {
			const result = await pending;
			if (gen !== speakGen) return;
			if (!result.audioBase64) break;
			started = true;
			if (result.next != null) pending = speakText({ data: {
				text,
				lang,
				voiceId: "ilir",
				guestId: guestId(),
				chunkIndex: result.next,
				google: false,
				speechgen: false
			} });
			await playMp3Base64(result.audioBase64, result.mime || "audio/mpeg");
			if (result.next == null) break;
		}
		if (started) {
			if (gen === speakGen) onDone?.();
			return;
		}
	} catch (error) {
		console.warn("[TTS] unavailable", error);
	}
	if (gen !== speakGen) return;
	onDone?.();
}
function staffCopy(lang) {
	if (lang === "it") return {
		title: "Messaggio dello staff",
		body: "Lo staff di Albanian AI chiede scusa: l’app non funziona ancora al meglio. Siamo in fase di test e arriveranno tante novità. Grazie per la pazienza e il supporto. ❤️🇦🇱"
	};
	if (lang === "en") return {
		title: "A note from the team",
		body: "The Albanian AI staff apologizes that the app isn’t working as well as it should. We’re in the testing phase, and many new features are coming. Thank you for your understanding and support. ❤️🇦🇱"
	};
	return {
		title: "Mesazh nga stafi",
		body: "Stafi i Albanian AI kërkon ndjesë që Albanian AI nuk punon aq mirë tani. Jemi në fazën e testimit dhe shumë gjëra të reja do t’i integrohen. Faleminderit për mirëkuptimin dhe suportin tuaj. ❤️🇦🇱"
	};
}
const ZERI_LIVE = "https://berry-forest-velvet-zippy.grok.me/";
export function Workspace() {
	const { user, isPending } = useCurrentUserState();
	const isGuest = !user;
	const [prefs, setPrefs] = useState(() => typeof window === "undefined" ? DEFAULT_PREFS : readLocalPrefs());
	const [histories, setHistories] = useState([]);
	const [memories, setMemories] = useState([]);
	const [selectedId, setSelectedId] = useState();
	const [messages, setMessages] = useState([]);
	const [draft, setDraft] = useState("");
	const [staffNote, setStaffNote] = useState(() => typeof window === "undefined" || localStorage.getItem("aai-staff-note") !== "hide");
	const [search, setSearch] = useState("");
	const [sending, setSending] = useState(false);
	const [loadingList, setLoadingList] = useState(false);
	const [loadingChat, setLoadingChat] = useState(false);
	const [mobileOpen, setMobileOpen] = useState(false);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [copied, setCopied] = useState();
	const [editing, setEditing] = useState();
	const [speaking, setSpeaking] = useState(false);
	const [hearing, setHearing] = useState(false);
	const [voiceLive, setVoiceLive] = useState(false);
	const [voiceOpen, setVoiceOpen] = useState(false);
	const [zeriTick, setZeriTick] = useState(0);
	const [voiceLog, setVoiceLog] = useState([]);
	const [micError, setMicError] = useState();
	const [loginGate, setLoginGate] = useState(false);
	const [pendingImage, setPendingImage] = useState();
	const [pendingDoc, setPendingDoc] = useState();
	const [attachOpen, setAttachOpen] = useState(false);
	const [cameraOpen, setCameraOpen] = useState(false);
	const [liveCamOn, setLiveCamOn] = useState(false);
	const [cameraBusy, setCameraBusy] = useState(false);
	const [partial, setPartial] = useState("");
	const [chatMenu, setChatMenu] = useState(false);
	const [aboutOpen, setAboutOpen] = useState(false);
	const [securityOpen, setSecurityOpen] = useState(false);
	const [statsOpen, setStatsOpen] = useState(false);
	const [modelMode, setModelMode] = useState(() => {
		try {
			const saved = parseChatMode(localStorage.getItem("albanian-ai-mode") || "lite");
			return saved === "pro" ? "lite" : saved;
		} catch {
			return "lite";
		}
	});
	const [modelOpen, setModelOpen] = useState(false);
	const [proSoon, setProSoon] = useState(false);
	const [proUnlock, setProUnlock] = useState(false);
	const [proCode, setProCode] = useState("");
	const [proCodeError, setProCodeError] = useState("");
	const modelModeRef = useRef(modelMode);
	const bottomRef = useRef(null);
	const filePickRef = useRef(null);
	const snapRef = useRef(null);
	const camVideoRef = useRef(null);
	const camStreamRef = useRef(null);
	const seeingRef = useRef(false);
	const liveCamTimer = useRef(0);
	useEffect(() => {
		if (!liveCamOn && !cameraOpen) return;
		const video = camVideoRef.current;
		const stream = camStreamRef.current;
		if (!video || !stream) return;
		if (video.srcObject !== stream) video.srcObject = stream;
		video.muted = true;
		video.setAttribute("playsinline", "true");
		video.setAttribute("webkit-playsinline", "true");
		video.play().catch(() => toast.error("Kamera s’nisi. Provo përsëri."));
	}, [liveCamOn, cameraOpen]);
	const camFacing = useRef("environment");
	const handsFreeRef = useRef(false);
	const sendingRef = useRef(false);
	const selectedRef = useRef(void 0);
	const prefsRef = useRef(prefs);
	const mediaRef = useRef(null);
	const parlaLock = useRef(false);
	const liveMicRef = useRef(null);
	const listenRef = useRef(null);
	const speechFailed = useRef(false);
	const speakingRef = useRef(false);
	const ttsAt = useRef(0);
	const bargeRef = useRef(0);
	const lastSpokenRef = useRef("");
	const realtimeRef = useRef(null);
	const geminiRef = useRef(null);
	const geminiOn = useRef(false);
	const liveUserRef = useRef("");
	const voiceOpenRef = useRef(false);
	const voiceLogRef = useRef([]);
	const liveImageBusy = useRef(false);
	const liveMadeImage = useRef(false);
	const liveAcc = useRef("");
	const liveSpoken = useRef(0);
	selectedRef.current = selectedId;
	prefsRef.current = prefs;
	sendingRef.current = sending;
	modelModeRef.current = modelMode;
	voiceOpenRef.current = voiceOpen;
	voiceLogRef.current = voiceLog;
	cambSpeakHook = setSpeaking;
	const applyPlan = (mode) => {
		if (mode !== "pro") setProUnlock(false);
		modelModeRef.current = mode;
		setModelMode(mode);
		localStorage.setItem("albanian-ai-mode", mode === "pro" ? "lite" : mode);
		setPrefs((prev) => {
			const nextVoice = voiceForMode(prev.voiceId, mode);
			if (nextVoice !== prev.voiceId) realtimeRef.current?.switchVoice(nextVoice);
			return {
				...prev,
				voiceId: nextVoice
			};
		});
	};
	const requestPro = () => {
		setModelOpen(false);
		if (modelMode === "pro" && proUnlock) return;
		setProCode("");
		setProCodeError("");
		setProSoon(true);
	};
	const unlockPro = () => {
		if (proCode.trim() !== "2627") {
			setProCodeError("Kodi nuk është i saktë.");
			return;
		}
		setProUnlock(true);
		applyPlan("pro");
		setProSoon(false);
		setProCode("");
		setProCodeError("");
		toast.success("Albanian AI Pro u aktivizua");
	};
	useEffect(() => {
		applyTheme(prefs.theme);
		writeLocalPrefs(prefs);
	}, [prefs]);
	useEffect(() => {
		const next = voiceForMode(prefs.voiceId, modelMode);
		if (next !== prefs.voiceId) setPrefs((prev) => ({
			...prev,
			voiceId: next
		}));
	}, [modelMode]);
	useEffect(() => {
		if (user?.primaryEmail) rememberAccount({
			email: user.primaryEmail,
			name: user.displayName
		});
	}, [user?.primaryEmail, user?.displayName]);
	useEffect(() => {
		if (isPending || isGuest) return;
		const timer = window.setTimeout(() => {
			savePreferences({ data: { values: prefs } }).catch(() => void 0);
		}, 700);
		return () => window.clearTimeout(timer);
	}, [
		prefs,
		isGuest,
		isPending
	]);
	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages, sending]);
	useEffect(() => {
		if (!liveCamOn && !cameraOpen) return;
		const attach = () => {
			const video = camVideoRef.current;
			const stream = camStreamRef.current;
			if (!video || !stream) return false;
			if (video.srcObject !== stream) video.srcObject = stream;
			video.muted = true;
			video.playsInline = true;
			video.setAttribute("playsinline", "true");
			video.setAttribute("webkit-playsinline", "true");
			video.play().catch(() => void 0);
			return video.videoWidth > 8;
		};
		attach();
		const id = window.setInterval(() => {
			if (attach()) window.clearInterval(id);
		}, 350);
		return () => window.clearInterval(id);
	}, [liveCamOn, cameraOpen]);
	useEffect(() => {
		if (isPending) return;
		const fresh = new URLSearchParams(window.location.search).get("new") === "1";
		if (fresh) {
			clearGuestThread();
			sessionStorage.removeItem("albanian-ai-selected");
			window.history.replaceState(null, "", "/app");
		}
		if (isGuest) {
			setMessages(fresh ? [] : readGuestThread());
			return;
		}
		setLoadingList(true);
		bootstrapWorkspace().then((data) => {
			const rows = data.conversations ?? [];
			setHistories(rows);
			setMemories(data.memories);
			if (data.settings) setPrefs({
				...DEFAULT_PREFS,
				...data.settings
			});
			const saved = sessionStorage.getItem("albanian-ai-selected");
			const pick = rows.find((item) => item.id === saved)?.id || rows.find((item) => item.title !== "Bisedë e re")?.id || rows[0]?.id;
			if (pick) setSelectedId(pick);
			const pending = readGuestThread();
			if (pending.length) importGuestThread({ data: { messages: pending } }).then((result) => {
				if (result.imported && result.id) {
					clearGuestThread();
					setSelectedId(result.id);
				}
			});
		}).finally(() => setLoadingList(false));
	}, [isPending, isGuest]);
	useEffect(() => {
		if (selectedId) sessionStorage.setItem("albanian-ai-selected", selectedId);
	}, [selectedId]);
	useEffect(() => {
		if (!selectedId || isGuest || isPending) return;
		const id = selectedId;
		setLoadingChat(true);
		getConversation({ data: { id } }).then((row) => {
			if (selectedRef.current !== id) return;
			setMessages(row?.messages ?? []);
		}).finally(() => {
			if (selectedRef.current === id) setLoadingChat(false);
		});
	}, [
		selectedId,
		isGuest,
		isPending
	]);
	const refreshList = () => listConversations({ data: { search: search || void 0 } }).then((rows) => setHistories(Array.isArray(rows) ? rows : []));
	const playAssistantVoice = async (text, audioBase64, force = false) => {
		if (!force && !handsFreeRef.current) return;
		listenRef.current?.pause();
		const prefLang = prefsRef.current.language;
		const lang = force || handsFreeRef.current ? prefLang === "it" || prefLang === "en" ? prefLang : "sq" : detectLang(text, voiceLangFromPrefs(prefsRef.current));
		const voiceId = isVoiceId(prefsRef.current.voiceId) ? prefsRef.current.voiceId : "ilir";
		speakingRef.current = true;
		ttsAt.current = Date.now();
		lastSpokenRef.current = text;
		setSpeaking(true);
		keepAudioAlive();
		try {
			if (audioBase64) await playMp3Base64(audioBase64);
			else await speakReply(text, lang, voiceId);
		} catch {
			await speakReply(text, lang, voiceId);
		} finally {
			speakingRef.current = false;
			setSpeaking(false);
			if (handsFreeRef.current) window.setTimeout(() => {
				if (handsFreeRef.current && !mediaRef.current && !speakingRef.current) {
					if (listenRef.current?.supported) listenRef.current.resume();
					else startParla();
				}
			}, 800);
		}
	};
	const submit = async (content = draft, fromVoice = false, imageDataUrl) => {
		const value = content.trim();
		const photo = imageDataUrl || pendingImage;
		const doc = pendingDoc;
		if (!value && !photo && !doc || sendingRef.current) return;
		const used = messages.filter((item) => item.role === "assistant" && !isLiveMessage(item.id)).length;
		if (isGuest && used >= GUEST_LIMIT) {
			setLoginGate(true);
			return;
		}
		sendingRef.current = true;
		setSending(true);
		setDraft("");
		setPendingImage(void 0);
		setPendingDoc(void 0);
		unlockAudio();
		listenRef.current?.pause();
		// Camera instructions are context for vision only; do not print them below the photo.
		const visiblePhotoText = imageDataUrl ? "" : value;
		const stored = photo ? `[[AAI_IMG]]${photo}[[/AAI_IMG]]${visiblePhotoText}` : value;
		const prompt = doc ? `${value || "Lexo këtë skedar dhe përgjigju."}\n\n--- Skedar: ${doc.name} ---\n${doc.text.slice(0, 12e3)}` : value || "Çfarë sheh në këtë foto?";
		try {
			if (isGuest) {
				const localUser = {
					id: `guest-u-${Date.now()}`,
					conversation_id: "guest",
					role: "user",
					content: stored,
					created_at: (/* @__PURE__ */ new Date()).toISOString()
				};
				const pending = [...messages, localUser];
				setMessages(pending);
				const reply = await askBrain(prompt, prefsRef.current.language, messages) || localBrain(prompt, prefsRef.current.language) || "Përshëndetje, unë jam Albanian AI. Si mund t'ju ndihmoj?";
				const assistant = {
					id: `guest-a-${Date.now()}`,
					conversation_id: "guest",
					role: "assistant",
					content: reply,
					created_at: (/* @__PURE__ */ new Date()).toISOString()
				};
				const next = [...pending, assistant];
				setMessages(next);
				writeGuestThread(next);
				if (voiceOpen) setVoiceLog((log) => [...log, {
					role: "assistant",
					content: reply
				}].slice(-24));
				if (handsFreeRef.current || fromVoice) await playAssistantVoice(reply, void 0, true);
				return;
			}
			let conversationId = selectedRef.current;
			if (!conversationId) {
				try {
					const created = await createConversation({ data: {} });
					const id = created?.id || created?.data?.id || created?.result?.id;
					if (id) {
						conversationId = id;
						setSelectedId(id);
					}
				} catch {
					/* keep local thread */
				}
				if (!conversationId) {
					conversationId = `local-${Date.now()}`;
					setSelectedId(conversationId);
				}
			}
			const localUser = {
				id: `local-${Date.now()}`,
				conversation_id: conversationId,
				role: "user",
				content: stored,
				created_at: (/* @__PURE__ */ new Date()).toISOString()
			};
			setMessages((prev) => [...prev, localUser]);
			const reply = await askBrain(prompt, prefsRef.current.language, messages) || localBrain(prompt, prefsRef.current.language) || "Përshëndetje, unë jam Albanian AI. Si mund t'ju ndihmoj?";
			if (!String(conversationId).startsWith("local-")) {
				sendMessage({ data: {
					id: conversationId,
					content: prompt,
					speak: false,
					imageDataUrl: photo,
					mode: modelModeRef.current
				} }).catch(() => void 0);
			}
			const assistant = {
				id: `local-a-${Date.now()}`,
				conversation_id: conversationId,
				role: "assistant",
				content: reply,
				created_at: (/* @__PURE__ */ new Date()).toISOString()
			};
			setMessages((prev) => [...prev, assistant]);
			await refreshList().catch(() => void 0);
			if (voiceOpen) setVoiceLog((log) => [...log, {
				role: "assistant",
				content: reply
			}].slice(-24));
			if (handsFreeRef.current || fromVoice) await playAssistantVoice(reply, void 0, true);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Nuk u dërgua";
			if (message === "LOGIN_REQUIRED") setLoginGate(true);
			else toast.error(message);
		} finally {
			sendingRef.current = false;
			setSending(false);
		}
	};
	const blobToBase64 = (blob) => new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const value = String(reader.result || "");
			const comma = value.indexOf(",");
			resolve(comma >= 0 ? value.slice(comma + 1) : value);
		};
		reader.onerror = () => reject(/* @__PURE__ */ new Error("audio"));
		reader.readAsDataURL(blob);
	});
	const askZeriLive = async (text) => {
		const clean = String(text || "").replace(/\s+/g, " ").trim();
		if (!clean) return;
		liveUserRef.current = clean;
		setVoiceLog((rows) => [...rows, { role: "user", content: clean }].slice(-24));
		pushLiveToChat("user", clean);
		setHearing(false);
		setSpeaking(true);
		speakingRef.current = true;
		const lang = prefsRef.current.language === "it" || prefsRef.current.language === "en" ? prefsRef.current.language : "sq";
		try {
			const history = [...voiceLogRef.current, { role: "user", content: clean }].slice(-12);
			let reply = await askBrain(clean, lang, history);
			if (!reply || /pas një sekondi|try again/i.test(reply)) reply = localBrain(clean, lang);
			if (!reply) {
				reply = lang === "it"
					? "Ti ascolto. Dimmi pure."
					: lang === "en"
						? "I hear you. Go ahead."
						: "Të dëgjova. Fol, jam këtu.";
			}
			setVoiceLog((rows) => [...rows, { role: "assistant", content: reply }].slice(-24));
			pushLiveToChat("assistant", reply);
			persistLiveTurn(clean, reply);
			lastSpokenRef.current = reply;
			await speakReply(reply, lang, "ilir");
		} catch {
			setMicError("Fol përsëri, të dëgjoj.");
		} finally {
			speakingRef.current = false;
			setSpeaking(false);
			if (handsFreeRef.current) window.setTimeout(() => void startParla(), 120);
		}
	};
	const sendVoiceBlob = async (blob) => {
		if (blob.size < 600) {
			setMicError("Nuk dëgjova fjalë. Fol më afër mikrofonit.");
			if (handsFreeRef.current) window.setTimeout(() => void startParla(), 500);
			return;
		}
		try {
			setMicError(void 0);
			const serverText = (await transcribeSpeech({ data: {
				audioBase64: await blobToBase64(blob),
				mimeType: blob.type || "audio/wav",
				lang: prefsRef.current.language,
				guestId: guestId()
			} })).text.trim();
			const text = serverText || (prefsRef.current.language !== "it" && prefsRef.current.language !== "en"
				? await transcribeLocalWhisper(blob, setMicError).catch(() => "")
				: "");
			if (!text || /^[A-Za-z]{1,4}\.?$/.test(text) || /[\u0400-\u04FF]/.test(text)) {
				setMicError("Nuk të kuptova. Fol përsëri, pak më qartë.");
				if (handsFreeRef.current) window.setTimeout(() => void startParla(), 500);
				return;
			}
			if (isAssistantEcho(text, lastSpokenRef.current)) {
				if (handsFreeRef.current) window.setTimeout(() => void startParla(), 400);
				return;
			}
			if (voiceOpenRef.current) {
				await askZeriLive(text);
				return;
			}
			await submit(text, true);
		} catch (error) {
			setMicError(error instanceof Error ? error.message : "Nuk e kuptova zërin.");
			if (handsFreeRef.current) window.setTimeout(() => void startParla(), 800);
		}
	};
		const stopParla = () => {
			const current = mediaRef.current;
		if (!current) {
			setHearing(false);
			return;
		}
		if (current.vad) window.clearInterval(current.vad);
		if (current.maxTimer) window.clearTimeout(current.maxTimer);
			mediaRef.current = null;
			setHearing(false);
			if (current.recorder && current.recorder.state !== "inactive") {
				try {
					current.recorder.stop();
				} catch {}
			}
			else {
				setMicError("Regjistrimi nuk u nis. Provo përsëri.");
				if (handsFreeRef.current) window.setTimeout(() => void startParla(), 400);
			}
		};
	const acquireMic = async () => {
		const existing = liveMicRef.current;
		if (existing?.getAudioTracks().some((track) => track.readyState === "live")) {
			startBargeWatch(existing);
			return existing;
		}
		if (!navigator.mediaDevices?.getUserMedia) throw new Error("Hape Albanian AI në Safari ose Chrome.");
		const stream = await navigator.mediaDevices.getUserMedia({ audio: {
			echoCancellation: true,
			noiseSuppression: true,
			autoGainControl: true,
			channelCount: 1,
			sampleRate: 48e3
		} });
		liveMicRef.current = stream;
		localStorage.setItem("albanian-ai-mic-granted", "1");
		startBargeWatch(stream);
		return stream;
	};
	const startBargeWatch = (stream) => {
		if (bargeRef.current) return;
		const ctx = captureAudioContext();
		if (!ctx) return;
		const source = ctx.createMediaStreamSource(stream);
		const analyser = ctx.createAnalyser();
		analyser.fftSize = 1024;
		source.connect(analyser);
		const samples = new Uint8Array(analyser.fftSize);
		let hits = 0;
		bargeRef.current = window.setInterval(() => {
			if (!handsFreeRef.current) return;
			analyser.getByteTimeDomainData(samples);
			let sum = 0;
			for (const value of samples) {
				const n = (value - 128) / 128;
				sum += n * n;
			}
			const rms = Math.sqrt(sum / samples.length);
			if (!speakingRef.current) {
				hits = 0;
				return;
			}
			if (Date.now() - ttsAt.current < 700) return;
			if (rms > .042) {
				hits += 1;
				if (hits >= 3) {
					hits = 0;
					stopAllSpeech();
					speakingRef.current = false;
					setSpeaking(false);
					window.setTimeout(() => {
						if (handsFreeRef.current && !mediaRef.current && !speakingRef.current) startParla();
					}, 550);
				}
			} else hits = 0;
		}, 80);
	};
	const startGeminiListen = () => {
		// Albanian must always use VAD + server-side Whisper; browser SpeechRecognition mangles sq.
		if (prefsRef.current.language !== "it" && prefsRef.current.language !== "en") return false;
		if (speechFailed.current || !canLiveListen()) return false;
		listenRef.current?.stop();
		listenRef.current = startLiveListen({
			lang: prefsRef.current.language,
			onPartial: setPartial,
			onFinal: (text) => {
				if (sendingRef.current || speakingRef.current) return;
				if (isAssistantEcho(text, lastSpokenRef.current)) return;
				listenRef.current?.pause();
				setPartial("");
				setHearing(false);
				if (voiceOpenRef.current) void askZeriLive(text);
				else submit(text, true);
			},
			onListening: (on) => {
				setHearing(on);
				if (on) setVoiceLive(true);
			},
			onError: (message) => {
				if (message === "FALLBACK") {
					speechFailed.current = true;
					listenRef.current?.stop();
					listenRef.current = null;
					startParla();
					return;
				}
				setMicError(message);
			}
		});
		setHearing(true);
		setVoiceLive(true);
		return listenRef.current.supported;
	};
	const startParla = async () => {
		if (parlaLock.current) return;
		setHearing(true);
		setVoiceLive(true);
		if (listenRef.current?.supported) {
			listenRef.current.resume();
			return;
		}
		if (mediaRef.current) return;
		parlaLock.current = true;
		unlockAudio();
		setSpeaking(false);
		setMicError(void 0);
		try {
			const stream = await acquireMic();
			const ctx = captureAudioContext();
			if (!ctx) throw new Error("Audio");
			await ctx.resume();
				const source = ctx.createMediaStreamSource(stream);
				const analyser = ctx.createAnalyser();
				analyser.fftSize = 2048;
				source.connect(analyser);
				const samples = new Uint8Array(analyser.fftSize);
				const chunks = [];
				const mimeType = pickRecorderMime();
				const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
				recorder.ondataavailable = (event) => {
					if (event.data?.size) chunks.push(event.data);
				};
				recorder.onstop = () => {
					const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/webm" });
					if (blob.size < 600) {
						setMicError("Fol përsëri — të dëgjoj tani.");
						if (handsFreeRef.current) window.setTimeout(() => void startParla(), 400);
						return;
					}
					void sendVoiceBlob(blob);
				};
				recorder.start(250);
				const slot = {
					stream,
					chunks,
					recorder,
					ctx,
					heard: false,
				voiced: 0,
				vad: 0,
				maxTimer: 0
			};
			let quiet = 0;
			slot.vad = window.setInterval(() => {
				analyser.getByteTimeDomainData(samples);
				let sum = 0;
				for (const value of samples) {
					const n = (value - 128) / 128;
					sum += n * n;
				}
				if (Math.sqrt(sum / samples.length) > .01) {
					slot.heard = true;
					slot.voiced += 100;
					quiet = 0;
				} else if (slot.heard) {
					quiet += 100;
						if (quiet >= 350 && slot.voiced >= 300) stopParla();
				}
			}, 100);
				slot.maxTimer = window.setTimeout(() => stopParla(), 7e3);
			mediaRef.current = slot;
			setHearing(true);
			setVoiceLive(true);
		} catch (error) {
			const name = error instanceof DOMException ? error.name : "";
			if (name === "NotAllowedError" || name === "PermissionDeniedError") setMicError("Lejo mikrofonin te Settings → Safari → Microphone.");
			else if (name === "NotFoundError") setMicError("Nuk u gjet mikrofoni.");
			else setMicError(error instanceof Error ? error.message : "Mikrofoni nuk u hap.");
			setHearing(false);
		} finally {
			parlaLock.current = false;
		}
	};
	const pushLiveToChat = (role, content) => {
		const clean = content.replace(/\s+/g, " ").trim();
		if (!clean) return;
		setMessages((prev) => {
			const last = prev[prev.length - 1];
			let next = prev;
			if (last?.role === role) {
				const a = last.content.toLowerCase();
				const b = clean.toLowerCase();
				if (a === b || b.includes(a) || a.includes(b)) {
					const keep = clean.length >= last.content.length ? clean : last.content;
					next = [...prev.slice(0, -1), {
						...last,
						content: keep
					}];
				} else next = [...prev, {
					id: `live-${role}-${Date.now()}`,
					conversation_id: selectedRef.current || "guest",
					role,
					content: clean,
					created_at: (/* @__PURE__ */ new Date()).toISOString()
				}];
			} else next = [...prev, {
				id: `live-${role}-${Date.now()}`,
				conversation_id: selectedRef.current || "guest",
				role,
				content: clean,
				created_at: (/* @__PURE__ */ new Date()).toISOString()
			}];
			if (isGuest) writeGuestThread(next);
			return next;
		});
	};
	const persistLiveTurn = (user, assistant) => {
		if (isGuest || !user.trim() || !assistant.trim()) return;
		saveLiveTurn({ data: {
			conversationId: selectedRef.current,
			user: user.trim(),
			assistant: assistant.trim()
		} }).then((saved) => {
			if (saved.conversationId && saved.conversationId !== selectedRef.current) setSelectedId(saved.conversationId);
			refreshList();
		}).catch(() => void 0);
	};
	const startLiveVoice = () => {
		unlockAudio();
		setMicError(void 0);
		setPartial("");
		setVoiceLog([]);
		handsFreeRef.current = true;
		keepAudioAlive();
		try {
			realtimeRef.current?.stop();
		} catch {}
		realtimeRef.current = null;
		setVoiceOpen(true);
		setVoiceLive(true);
		setHearing(true);
		setSpeaking(false);
		void (async () => {
			try {
				await acquireMic();
				setHearing(true);
				const lang = prefsRef.current.language === "it" || prefsRef.current.language === "en" ? prefsRef.current.language : "sq";
					const hello = lang === "it" ? "Ciao, sono Albanian AI. Come posso aiutarti?" : lang === "en" ? "Hello, I am Albanian AI. How can I help you?" : "Përshëndetje, unë jam Albanian AI. Si mund t'ju ndihmoj?";
				setVoiceLog([{ role: "assistant", content: hello }]);
				pushLiveToChat("assistant", hello);
				lastSpokenRef.current = hello;
				setSpeaking(true);
				speakingRef.current = true;
				await speakReply(hello, lang, "ilir");
			} catch (error) {
				const name = error instanceof DOMException ? error.name : "";
				if (name === "NotAllowedError" || name === "PermissionDeniedError") {
					setMicError("Lejo mikrofonin te Settings → Safari → Microphone.");
				} else {
					setMicError("Lejo mikrofonin që të flasim live.");
				}
				setHearing(false);
			} finally {
				speakingRef.current = false;
				setSpeaking(false);
				if (handsFreeRef.current) {
					if (!startGeminiListen()) void startParla();
				}
			}
		})();
	};
	const stopLiveVoice = () => {
		handsFreeRef.current = false;
		setVoiceOpen(false);
		setVoiceLive(false);
		setHearing(false);
		setSpeaking(false);
		realtimeRef.current?.stop();
		realtimeRef.current = null;
		geminiRef.current?.stop();
		geminiRef.current = null;
		geminiOn.current = false;
		stopAllSpeech();
		listenRef.current?.stop();
		listenRef.current = null;
		setPartial("");
		if (bargeRef.current) {
			window.clearInterval(bargeRef.current);
			bargeRef.current = 0;
		}
		speakingRef.current = false;
		const current = mediaRef.current;
		if (current) {
			if (current.vad) window.clearInterval(current.vad);
			if (current.maxTimer) window.clearTimeout(current.maxTimer);
			try {
				current.processor?.disconnect();
				if (current.recorder && current.recorder.state !== "inactive") current.recorder.stop();
			} catch {}
			mediaRef.current = null;
		}
		liveMicRef.current?.getTracks().forEach((track) => track.stop());
		liveMicRef.current = null;
		stopLiveCamera();
	};
	const toggleVoice = () => {
		if (voiceOpen) stopLiveVoice();
		else startLiveVoice();
	};
	const grabLiveFrame = () => {
		const video = camVideoRef.current;
		if (!video || video.videoWidth < 8) return "";
		const scale = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight));
		const canvas = document.createElement("canvas");
		canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
		canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
		const ctx = canvas.getContext("2d");
		if (!ctx) return "";
		ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
		return canvas.toDataURL("image/jpeg", .52);
	};
	const pushLiveFrame = async () => {
		if (seeingRef.current || !realtimeRef.current) return;
		const dataUrl = grabLiveFrame();
		if (!dataUrl) return;
		seeingRef.current = true;
		try {
			realtimeRef.current.sendImage(dataUrl);
			const result = await seeLiveFrame({ data: {
				imageDataUrl: dataUrl,
				language: voiceLangFromPrefs(prefsRef.current),
				guestId: guestId()
			} });
			if (result.seen) realtimeRef.current.sendVisionNote(result.seen);
		} catch {} finally {
			seeingRef.current = false;
		}
	};
	const stopLiveCamera = () => {
		window.clearInterval(liveCamTimer.current);
		liveCamTimer.current = 0;
		setLiveCamOn(false);
		realtimeRef.current?.closeCamera();
		camStreamRef.current?.getVideoTracks().forEach((track) => track.stop());
		if (!realtimeRef.current) camStreamRef.current?.getTracks().forEach((track) => track.stop());
		camStreamRef.current = null;
		if (camVideoRef.current) camVideoRef.current.srcObject = null;
	};
	const openCamStream = async (facing) => {
		const tries = [
			{
				audio: false,
				video: {
					facingMode: { ideal: facing },
					width: { ideal: 640 }
				}
			},
			{
				audio: false,
				video: { facingMode: facing }
			},
			{
				audio: false,
				video: true
			}
		];
		let last;
		for (const constraints of tries) try {
			const stream = await navigator.mediaDevices.getUserMedia(constraints);
			if (stream.getVideoTracks().length) return stream;
			stream.getTracks().forEach((track) => track.stop());
		} catch (error) {
			last = error;
		}
		throw last instanceof Error ? last : /* @__PURE__ */ new Error("Kamera s’hapet");
	};
	const startLiveCamera = async (facing = camFacing.current) => {
		if (!navigator.mediaDevices?.getUserMedia) {
			toast.error("Kamera s’hapet në këtë shfletues.");
			snapRef.current?.click();
			return;
		}
		if (!window.isSecureContext) {
			toast.error("Kamera hapet vetëm në https.");
			return;
		}
		camFacing.current = facing;
		setCameraOpen(false);
		try {
			camStreamRef.current?.getVideoTracks().forEach((track) => track.stop());
			const stream = realtimeRef.current ? await realtimeRef.current.openCamera(facing) : await openCamStream(facing);
			camStreamRef.current = stream;
			setLiveCamOn(true);
			window.clearInterval(liveCamTimer.current);
			liveCamTimer.current = window.setInterval(() => void pushLiveFrame(), 2800);
			window.setTimeout(() => void pushLiveFrame(), 600);
		} catch (error) {
			const name = error instanceof DOMException ? error.name : "";
			if (name === "NotAllowedError" || name === "PermissionDeniedError") toast.error("Lejo kamerën: Settings → Safari → Camera → albanianai.it");
			else toast.error("Kamera s’u hap. Po hap foton e telefonit.");
			snapRef.current?.click();
		}
	};
	const closeCamera = () => {
		camStreamRef.current?.getTracks().forEach((track) => track.stop());
		camStreamRef.current = null;
		if (camVideoRef.current) camVideoRef.current.srcObject = null;
		setCameraOpen(false);
		setCameraBusy(false);
	};
	const startCamera = async (facing = camFacing.current) => {
		if (voiceOpen) {
			await startLiveCamera(facing);
			return;
		}
		if (!navigator.mediaDevices?.getUserMedia) {
			toast.error("Kamera s’hapet në këtë shfletues.");
			return;
		}
		camFacing.current = facing;
		setAttachOpen(false);
		try {
			camStreamRef.current?.getTracks().forEach((track) => track.stop());
			const stream = await openCamStream(facing);
			camStreamRef.current = stream;
			setCameraOpen(true);
		} catch (error) {
			const name = error instanceof DOMException ? error.name : "";
			if (name === "NotAllowedError" || name === "PermissionDeniedError") toast.error("Lejo kamerën: Settings → Safari → Camera → albanianai.it");
			else toast.error("Kamera s’u hap. Po hap foton e telefonit.");
			snapRef.current?.click();
		}
	};
	const captureCamera = async () => {
		const video = camVideoRef.current;
		if (!video || video.videoWidth < 8) {
			toast.error("Kamera s’është gati. Prit një sekondë.");
			return;
		}
		setCameraBusy(true);
		const scale = Math.min(1, 960 / Math.max(video.videoWidth, video.videoHeight));
		const canvas = document.createElement("canvas");
		canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
		canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
		const ctx = canvas.getContext("2d");
		if (!ctx) {
			setCameraBusy(false);
			return;
		}
		ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
		const dataUrl = canvas.toDataURL("image/jpeg", .72);
		closeCamera();
		await submit("Njoh çdo gjë në këtë pamje: objekte, tekst, marka, ushqim, njerëz, dokumente, bimë, kafshë. Çfarë është dhe çfarë duhet të di?", false, dataUrl);
	};
	const changeLang = (lang) => {
		setPrefs((prev) => ({
			...prev,
			language: lang
		}));
	};
	const newChat = async () => {
		setChatMenu(false);
		setMobileOpen(false);
		setSelectedId(void 0);
		setMessages([]);
		sessionStorage.removeItem("albanian-ai-selected");
		if (isGuest) clearGuestThread();
	};
	const greetingName = user?.displayName?.split(" ")[0] || "mik";
	const visibleHistories = histories.filter((item) => {
		if (item.title === "Bisedë e re" && item.id !== selectedId) return false;
		if (!search.trim()) return true;
		return item.title.toLowerCase().includes(search.trim().toLowerCase());
	});
	const removeChat = async (id) => {
		if (!window.confirm("Ta fshish këtë bisedë? Nuk kthehet.")) return;
		try {
			if (isGuest) {
				setSelectedId(void 0);
				setMessages([]);
				clearGuestThread();
				sessionStorage.removeItem("albanian-ai-selected");
			} else {
				await deleteConversation({ data: { id } });
				if (selectedId === id) {
					setSelectedId(void 0);
					setMessages([]);
					sessionStorage.removeItem("albanian-ai-selected");
				}
				await refreshList();
			}
			setMobileOpen(false);
			toast.success("Biseda u fshi");
		} catch {
			toast.error("Nuk u fshi biseda");
		}
	};
	return /* @__PURE__ */ jsxs("div", {
		className: `app-shell${modelMode === "pro" ? " plan-pro" : ""}`,
		children: [
			/* @__PURE__ */ jsxs("aside", {
				className: `sidebar ${mobileOpen ? "mobile-open" : ""}`,
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "sidebar-top",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "brand",
							children: [/* @__PURE__ */ jsx("div", {
								className: "brand-mark",
								children: /* @__PURE__ */ jsx("img", {
									src: "/logo-192.jpg",
									alt: "Albanian AI"
								})
							}), /* @__PURE__ */ jsx("div", {
								className: "brand-copy",
								children: /* @__PURE__ */ jsx("span", { children: "Albanian AI" })
							})]
						}), /* @__PURE__ */ jsx("button", {
							className: "icon-button mobile-close",
							onClick: () => setMobileOpen(false),
							type: "button",
							children: /* @__PURE__ */ jsx(X, { size: 18 })
						})]
					}),
					/* @__PURE__ */ jsxs(Button, {
						className: "new-chat",
						onClick: () => void newChat(),
						children: [/* @__PURE__ */ jsx(Plus, { size: 17 }), " Bisedë e re"]
					}),
					/* @__PURE__ */ jsxs("button", {
						className: "nav-item",
						type: "button",
						onClick: () => {
							document.querySelector(".search-box input")?.focus();
						},
						children: [/* @__PURE__ */ jsx(Search, { size: 17 }), " Kërko në biseda"]
					}),
					/* @__PURE__ */ jsx("div", {
						className: "history-head",
						children: /* @__PURE__ */ jsx("span", { children: "Të fundit" })
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "search-box",
						children: [/* @__PURE__ */ jsx(Search, { size: 15 }), /* @__PURE__ */ jsx("input", {
							value: search,
							onChange: (e) => setSearch(e.target.value),
							placeholder: "Kërko në histori"
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "history-list",
						children: [loadingList ? /* @__PURE__ */ jsxs("div", {
							className: "skeleton-lines",
							children: [
								/* @__PURE__ */ jsx("i", {}),
								/* @__PURE__ */ jsx("i", {}),
								/* @__PURE__ */ jsx("i", {})
							]
						}) : visibleHistories.map((item) => /* @__PURE__ */ jsxs("div", {
							className: `history-row ${item.id === selectedId ? "active" : ""}`,
							children: [/* @__PURE__ */ jsx("button", {
								type: "button",
								onClick: () => {
									setSelectedId(item.id);
									setMobileOpen(false);
								},
								className: "history-item",
								children: /* @__PURE__ */ jsx("span", { children: item.title })
							}), !isGuest ? /* @__PURE__ */ jsx("button", {
								className: "history-delete",
								type: "button",
								"aria-label": "Fshi bisedën",
								onClick: (event) => {
									event.stopPropagation();
									removeChat(item.id);
								},
								children: /* @__PURE__ */ jsx(Trash2, { size: 15 })
							}) : null]
						}, item.id)), !loadingList && !visibleHistories.length && /* @__PURE__ */ jsx("div", {
							className: "empty-history",
							children: search.trim() ? "Nuk u gjet asnjë bisedë." : isGuest ? "Bisedat ruhen pas hyrjes me email ose Google." : "Bisedat e tua do të shfaqen këtu."
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "sidebar-bottom",
						children: [
							/* @__PURE__ */ jsxs("a", {
								className: "nav-item",
								href: ideaMailto(),
								children: [/* @__PURE__ */ jsx(Lightbulb, { size: 17 }), " Dërgo ide"]
							}),
							/* @__PURE__ */ jsxs("button", {
								className: "nav-item",
								type: "button",
								onClick: () => setSecurityOpen(true),
								children: [/* @__PURE__ */ jsx(ShieldCheck, { size: 17 }), " Siguria"]
							}),
							/* @__PURE__ */ jsxs("button", {
								className: "nav-item",
								type: "button",
								onClick: () => setAboutOpen(true),
								children: [/* @__PURE__ */ jsx(Info, { size: 17 }), " Rreth nesh"]
							}),
							isOwnerEmail(user?.primaryEmail) ? /* @__PURE__ */ jsxs("button", {
								className: "nav-item",
								type: "button",
								onClick: () => setStatsOpen(true),
								children: [/* @__PURE__ */ jsx(Users, { size: 17 }), " Përdoruesit"]
							}) : null,
							/* @__PURE__ */ jsxs("button", {
								className: "nav-item",
								type: "button",
								onClick: () => isGuest ? setLoginGate(true) : setSettingsOpen(true),
								children: [/* @__PURE__ */ jsx(Settings2, { size: 17 }), " Cilësimet"]
							}),
							/* @__PURE__ */ jsxs("button", {
								className: "profile",
								type: "button",
								onClick: () => isGuest ? setLoginGate(true) : setSettingsOpen(true),
								children: [/* @__PURE__ */ jsx("div", {
									className: "avatar",
									children: (user?.displayName || "A").slice(0, 1).toUpperCase()
								}), /* @__PURE__ */ jsxs("div", {
									className: "profile-copy",
									children: [/* @__PURE__ */ jsx("strong", { children: user?.displayName || (isGuest ? "Mysafir" : "Llogaria ime") }), /* @__PURE__ */ jsx("span", { children: isGuest ? "Hyr ose krijo llogari" : user?.primaryEmail })]
								})]
							}),
							/* @__PURE__ */ jsx("button", {
								type: "button",
								className: "pro-chip",
								onClick: requestPro,
								children: "Albanian AI Pro"
							})
						]
					})
				]
			}),
			mobileOpen && /* @__PURE__ */ jsx("div", {
				className: "scrim",
				onClick: () => setMobileOpen(false)
			}),
			/* @__PURE__ */ jsxs("main", {
				className: "chat-pane",
				children: [
					/* @__PURE__ */ jsxs("header", {
						className: "topbar",
						children: [
							/* @__PURE__ */ jsx("button", {
								className: "icon-button mobile-menu",
								onClick: () => setMobileOpen(true),
								type: "button",
								children: /* @__PURE__ */ jsx(Menu, { size: 19 })
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "model-wrap",
								children: [/* @__PURE__ */ jsxs("button", {
									type: "button",
									className: `model-chip${modelMode === "pro" ? " pro" : ""}`,
									onClick: () => setModelOpen((open) => !open),
									children: [
										/* @__PURE__ */ jsx("img", {
											src: "/logo-192.jpg",
											alt: ""
										}),
										/* @__PURE__ */ jsx("span", { children: modelMode === "pro" ? "Albanian AI Pro" : modelMode === "flash" ? "Albanian AI Flash" : "Albanian AI Flash-Lite" }),
										/* @__PURE__ */ jsx(ChevronDown, { size: 16 })
									]
								}), modelOpen && /* @__PURE__ */ jsxs("div", {
									className: "model-menu",
									role: "menu",
									children: [
										/* @__PURE__ */ jsxs("button", {
											type: "button",
											className: modelMode === "lite" ? "on" : "",
											onClick: () => {
												applyPlan("lite");
												setModelOpen(false);
												toast.success("Flash-Lite: Perseus dhe Luna");
											},
											children: [modelMode === "lite" ? /* @__PURE__ */ jsx(Check, { size: 16 }) : /* @__PURE__ */ jsx("span", {}), /* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsx("strong", { children: "Albanian AI Flash-Lite" }), /* @__PURE__ */ jsx("em", { children: "Përgjigje më të shpejta" })] })]
										}),
										/* @__PURE__ */ jsxs("button", {
											type: "button",
											className: modelMode === "flash" ? "on" : "",
											onClick: () => {
												applyPlan("flash");
												setModelOpen(false);
												toast.success("Flash: Leo dhe Ara");
											},
											children: [modelMode === "flash" ? /* @__PURE__ */ jsx(Check, { size: 16 }) : /* @__PURE__ */ jsx("span", {}), /* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsx("strong", { children: "Albanian AI Flash" }), /* @__PURE__ */ jsx("em", { children: "Ndihmë e plotë" })] })]
										}),
										/* @__PURE__ */ jsx("hr", {}),
										/* @__PURE__ */ jsxs("button", {
											type: "button",
											className: modelMode === "pro" ? "on" : "",
											onClick: requestPro,
											children: [modelMode === "pro" ? /* @__PURE__ */ jsx(Check, { size: 16 }) : /* @__PURE__ */ jsx("span", {}), /* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsx("strong", { children: "Albanian AI Pro" }), /* @__PURE__ */ jsx("em", { children: "Arsyetim i avancuar" })] })]
										})
									]
								})]
							}),
							/* @__PURE__ */ jsx("div", {
								className: "top-actions",
								children: /* @__PURE__ */ jsx("button", {
									className: "icon-button",
									type: "button",
									onClick: () => setChatMenu((open) => !open),
									children: /* @__PURE__ */ jsx(MoreHorizontal, { size: 18 })
								})
							})
						]
					}),
					chatMenu && createPortal(/* @__PURE__ */ jsx(AccountSheet, {
						user,
						isGuest,
						lang: prefs.language,
						onClose: () => setChatMenu(false),
						onSettings: () => isGuest ? setLoginGate(true) : setSettingsOpen(true),
						onSecurity: () => setSecurityOpen(true),
						onAbout: () => setAboutOpen(true),
						onPro: () => {
							applyPlan("pro");
							toast.success("Pro: Albanian AI");
							setProSoon(true);
						},
						onHistory: () => {
							setChatMenu(false);
							setMobileOpen(true);
						},
						onLogin: () => {
							setChatMenu(false);
							setLoginGate(true);
						},
						onDeleteChat: selectedId || isGuest && messages.length ? () => {
							setChatMenu(false);
							removeChat(selectedId || "guest");
						} : void 0,
						plan: modelMode
					}), document.body),
					/* @__PURE__ */ jsxs("section", {
						className: "chat-scroll",
						children: [liveCamOn && /* @__PURE__ */ jsxs("div", {
							className: "live-cam-pip",
							children: [/* @__PURE__ */ jsx("video", {
								ref: camVideoRef,
								playsInline: true,
								muted: true,
								autoPlay: true
							}), /* @__PURE__ */ jsx("button", {
								type: "button",
								className: "live-cam-switch",
								onClick: () => void startLiveCamera(camFacing.current === "user" ? "environment" : "user"),
								"aria-label": "Kthe kamerën",
								children: /* @__PURE__ */ jsx(SwitchCamera, { size: 14 })
							})]
						}), /* @__PURE__ */ jsx("div", {
							className: `conversation-wrap${messages.length ? " has-thread" : ""}`,
							children: !messages.length && !loadingChat ? /* @__PURE__ */ jsxs("div", {
								className: "welcome",
								children: [
									/* @__PURE__ */ jsx("div", {
										className: "welcome-spark",
										children: /* @__PURE__ */ jsx("img", {
											src: "/logo-192.jpg",
											alt: "Albanian AI"
										})
									}),
									modelMode === "pro" ? /* @__PURE__ */ jsx("span", {
										className: "pro-kicker",
										children: "Albanian AI Pro"
									}) : null,
									/* @__PURE__ */ jsx("h2", { children: prefs.language === "it" ? `Bentornato, ${greetingName}` : prefs.language === "en" ? `Welcome, ${greetingName}` : `Mirë se erdhe, ${greetingName}` }),
									/* @__PURE__ */ jsxs("aside", {
										className: "staff-note",
										children: [
											/* @__PURE__ */ jsx("strong", { children: staffCopy(prefs.language).title }),
											/* @__PURE__ */ jsx("p", { children: staffCopy(prefs.language).body })
										]
									})
								]
							}) : /* @__PURE__ */ jsxs("div", {
								className: "messages",
								children: [
									messages.map((message) => /* @__PURE__ */ jsx(MessageBubble, {
										message,
										copied: copied === message.id,
										editing: editing === message.id,
										lang: prefs.language,
										voiceId: voiceForMode(prefs.voiceId, modelMode),
										google: false,
										onCopy: async (content, id) => {
											await navigator.clipboard.writeText(content);
											setCopied(id);
											window.setTimeout(() => setCopied(void 0), 1500);
										},
										onRegenerate: () => {
											if (!selectedId) return;
											setSending(true);
											regenerateMessage({ data: {
												id: selectedId,
												mode: modelModeRef.current
											} }).then(async () => {
												const row = await getConversation({ data: { id: selectedId } });
												setMessages(row?.messages ?? []);
											}).finally(() => setSending(false));
										},
										setEditing: () => setEditing(message.id),
										onCancel: () => setEditing(void 0),
										onEdit: (value) => {
											if (!selectedId) return;
											setEditing(void 0);
											setSending(true);
											editUserMessage({ data: {
												id: selectedId,
												messageId: message.id,
												content: value,
												mode: modelModeRef.current
											} }).then(async () => {
												const row = await getConversation({ data: { id: selectedId } });
												setMessages(row?.messages ?? []);
											}).finally(() => setSending(false));
										}
									}, message.id)),
									loadingChat && !messages.length ? /* @__PURE__ */ jsxs("div", {
										className: "message-loading",
										children: [/* @__PURE__ */ jsx(Loader2, {
											className: "spin",
											size: 18
										}), " Po ngarkohet biseda…"]
									}) : null,
									sending && /* @__PURE__ */ jsxs("div", {
										className: "thinking",
										children: [
											/* @__PURE__ */ jsx("span", {}),
											/* @__PURE__ */ jsx("span", {}),
											/* @__PURE__ */ jsx("span", {}),
											/* @__PURE__ */ jsx("em", { children: wantsGeneratedImage([...messages].reverse().find((item) => item.role === "user")?.content || draft) ? "Albanian AI po vizaton foton…" : modelMode === "pro" ? "Albanian AI Pro po analizon…" : "Albanian AI po shkruan…" })
										]
									}),
									modelMode === "pro" && !sending && messages.some((item) => item.role === "assistant") && /* @__PURE__ */ jsx("div", {
										className: "pro-follow",
										children: [
											"Thelloje me hapa dhe shembuj.",
											"Shpjegoje më thjeshtë, si për një shok.",
											"Jep një version të gatshëm për ta kopjuar."
										].map((text) => /* @__PURE__ */ jsx("button", {
											type: "button",
											onClick: () => void submit(text),
											children: text
										}, text))
									}),
									/* @__PURE__ */ jsx("div", { ref: bottomRef })
								]
							})
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "composer-wrap",
						children: [
							staffNote ? /* @__PURE__ */ jsxs("aside", {
								className: "staff-banner",
								children: [
									/* @__PURE__ */ jsx("p", { children: staffCopy(prefs.language).body }),
									/* @__PURE__ */ jsx("button", {
										type: "button",
										"aria-label": "Mbyll",
										onClick: () => {
											setStaffNote(false);
											try {
												localStorage.setItem("aai-staff-note", "hide");
											} catch {}
										},
										children: /* @__PURE__ */ jsx(X, { size: 16 })
									})
								]
							}) : null,
							pendingImage && /* @__PURE__ */ jsxs("div", {
								className: "photo-preview",
								children: [/* @__PURE__ */ jsx("img", {
									src: pendingImage,
									alt: ""
								}), /* @__PURE__ */ jsx("button", {
									type: "button",
									onClick: () => setPendingImage(void 0),
									"aria-label": "Hiq foton",
									children: /* @__PURE__ */ jsx(X, { size: 14 })
								})]
							}),
							pendingDoc && /* @__PURE__ */ jsxs("div", {
								className: "photo-preview doc-preview",
								children: [
									/* @__PURE__ */ jsx(FileText, { size: 16 }),
									/* @__PURE__ */ jsx("span", { children: pendingDoc.name }),
									/* @__PURE__ */ jsx("button", {
										type: "button",
										onClick: () => setPendingDoc(void 0),
										"aria-label": "Hiq skedarin",
										children: /* @__PURE__ */ jsx(X, { size: 14 })
									})
								]
							}),
							/* @__PURE__ */ jsxs("form", {
								className: `composer grok-bar${voiceOpen ? " live" : ""}`,
								onSubmit: (event) => {
									event.preventDefault();
									const text = draft.trim();
									if (voiceOpen) {
										if (!text) return;
										liveUserRef.current = text;
										pushLiveToChat("user", text);
										realtimeRef.current?.sendText(text);
										setDraft("");
										return;
									}
									if (text || pendingImage || pendingDoc) submit();
								},
								children: [
									/* @__PURE__ */ jsx("button", {
										type: "button",
										className: "composer-plus",
										title: "Kamera, foto ose skedar",
										onClick: () => setAttachOpen(true),
										children: /* @__PURE__ */ jsx(Plus, {
											size: 22,
											strokeWidth: 2.2
										})
									}),
									/* @__PURE__ */ jsx("button", {
										type: "button",
										className: `composer-mic${liveCamOn ? " on" : ""}`,
										title: "Kamera live",
										onClick: () => liveCamOn ? stopLiveCamera() : voiceOpen ? void startLiveCamera() : void startCamera(),
										children: /* @__PURE__ */ jsx(Camera, { size: 18 })
									}),
									/* @__PURE__ */ jsx("input", {
										ref: filePickRef,
										type: "file",
										accept: "image/*,.pdf,.txt,.csv,.md,.json",
										hidden: true,
										onChange: (event) => {
											const file = event.target.files?.[0];
											event.target.value = "";
											if (!file) return;
											extractLocalFile(file).then((parsed) => {
												if (parsed.kind === "image") return compressImage(file).then((dataUrl) => setPendingImage(dataUrl));
												setPendingDoc({
													name: parsed.name,
													text: parsed.text
												});
												toast.success(`${parsed.name} u lexua`);
												if (!isGuest && selectedId) uploadTextFile({ data: {
													conversationId: selectedId,
													fileName: parsed.name,
													mimeType: file.type || "text/plain",
													text: parsed.text
												} }).catch(() => void 0);
											}).catch((error) => toast.error(error instanceof Error ? error.message : "Nuk u lexua"));
										}
									}),
									/* @__PURE__ */ jsx("input", {
										ref: snapRef,
										type: "file",
										accept: "image/*",
										capture: "environment",
										hidden: true,
										onChange: (event) => {
											const file = event.target.files?.[0];
											event.target.value = "";
											if (!file) return;
											compressImage(file).then((dataUrl) => {
												if (voiceOpen && realtimeRef.current) {
													realtimeRef.current.sendImage(dataUrl);
													realtimeRef.current.sendVisionNote("Foto nga kamera e telefonit.");
													toast.success("Fotoja iu dërgua Albanian AI.");
													return;
												}
												setPendingImage(dataUrl);
											});
										}
									}),
									/* @__PURE__ */ jsx("input", {
										value: draft,
										onChange: (e) => setDraft(e.target.value),
										onFocus: () => unlockAudio(),
										onKeyDown: (e) => {
											if (e.key === "Enter" && !e.shiftKey) {
												e.preventDefault();
												e.currentTarget.form?.requestSubmit();
											}
										},
										placeholder: modelMode === "pro" ? "Pyet Albanian AI Pro" : "Pyet Albanian AI",
										className: "composer-input",
										enterKeyHint: "send"
									}),
									!voiceOpen && /* @__PURE__ */ jsx("button", {
										className: "composer-mic",
										title: "Mikrofoni",
										type: "button",
										onClick: () => toggleVoice(),
										children: /* @__PURE__ */ jsx(Mic, { size: 18 })
									}),
									draft.trim() || pendingImage || pendingDoc ? /* @__PURE__ */ jsx("button", {
										className: "composer-parla",
										type: "submit",
										title: "Dërgo",
										children: /* @__PURE__ */ jsx(Send, { size: 16 })
									}) : voiceOpen ? /* @__PURE__ */ jsxs("button", {
										className: "composer-parla",
										type: "button",
										onClick: stopLiveVoice,
										title: "Stop",
										children: [/* @__PURE__ */ jsx(Square, { size: 12 }), " Stop"]
									}) : /* @__PURE__ */ jsxs("button", {
										className: "composer-parla",
										type: "button",
										onClick: () => toggleVoice(),
										title: "Live chat",
										children: [/* @__PURE__ */ jsx(AudioLines, { size: 16 }), " Live chat"]
									})
								]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: `privacy-line${isGuest ? " login-hint" : ""}`,
								children: [
									/* @__PURE__ */ jsx(ShieldCheck, { size: 13 }),
									" ",
									isGuest ? "Live Voice pa limit. Hap llogari që bisedat të ruhen." : "Albanian AI · shqip · italisht · anglisht"
								]
							})
						]
					})
				]
			}),
			attachOpen && createPortal(/* @__PURE__ */ jsx("div", {
				className: "tools-scrim",
				onClick: () => setAttachOpen(false),
				children: /* @__PURE__ */ jsxs("div", {
					className: "tools-sheet",
					onClick: (event) => event.stopPropagation(),
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "tools-head",
							children: [/* @__PURE__ */ jsx("strong", { children: "Shto" }), /* @__PURE__ */ jsx("button", {
								type: "button",
								onClick: () => setAttachOpen(false),
								"aria-label": "Mbyll",
								children: /* @__PURE__ */ jsx(X, { size: 16 })
							})]
						}),
						/* @__PURE__ */ jsxs("button", {
							type: "button",
							className: "tool-row",
							onClick: () => void startCamera(),
							children: [/* @__PURE__ */ jsx(Camera, { size: 18 }), " Kamera live — njih çdo gjë"]
						}),
						/* @__PURE__ */ jsxs("button", {
							type: "button",
							className: "tool-row",
							onClick: () => {
								setAttachOpen(false);
								filePickRef.current?.click();
							},
							children: [/* @__PURE__ */ jsx(ImagePlus, { size: 18 }), " Foto nga galeria"]
						}),
						/* @__PURE__ */ jsxs("button", {
							type: "button",
							className: "tool-row",
							onClick: () => {
								setAttachOpen(false);
								filePickRef.current?.click();
							},
							children: [/* @__PURE__ */ jsx(FileText, { size: 18 }), " PDF ose skedar"]
						})
					]
				})
			}), document.body),
			cameraOpen && createPortal(/* @__PURE__ */ jsxs("div", {
				className: "camera-live",
				children: [
					/* @__PURE__ */ jsx("video", {
						ref: camVideoRef,
						playsInline: true,
						muted: true,
						autoPlay: true
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "camera-top",
						children: [
							/* @__PURE__ */ jsx("button", {
								type: "button",
								onClick: closeCamera,
								"aria-label": "Mbyll",
								children: /* @__PURE__ */ jsx(X, { size: 20 })
							}),
							/* @__PURE__ */ jsx("span", { children: "Kamera live" }),
							/* @__PURE__ */ jsx("button", {
								type: "button",
								onClick: () => void startCamera(camFacing.current === "environment" ? "user" : "environment"),
								"aria-label": "Kthe kamerën",
								children: /* @__PURE__ */ jsx(SwitchCamera, { size: 20 })
							})
						]
					}),
					/* @__PURE__ */ jsx("p", {
						className: "camera-hint",
						children: "Drejto kamerën dhe shtyp rrethin. Albanian AI njeh objekte, tekst, ushqim, dokumente."
					}),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						className: "camera-shutter",
						disabled: cameraBusy,
						onClick: () => void captureCamera(),
						"aria-label": "Njih pamjen"
					})
				]
			}), document.body),
			proSoon && createPortal(/* @__PURE__ */ jsx("div", {
				className: "pro-sheet",
				onClick: () => setProSoon(false),
				children: /* @__PURE__ */ jsxs("div", {
					className: "pro-card",
					onClick: (event) => event.stopPropagation(),
					children: [
						/* @__PURE__ */ jsx("img", {
							src: "/logo-192.jpg",
							alt: ""
						}),
						/* @__PURE__ */ jsx("strong", { children: "Albanian AI Pro" }),
						proUnlock ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("p", { children: "Pro është aktiv: zëra realë Google në Live Chat, kërkim live dhe foto." }), /* @__PURE__ */ jsx("button", {
							type: "button",
							onClick: () => setProSoon(false),
							children: "Në rregull"
						})] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
							/* @__PURE__ */ jsx("p", { children: "Vendos kodin për të hapur versionin Pro." }),
							/* @__PURE__ */ jsx("input", {
								className: "pro-code",
								type: "password",
								autoComplete: "off",
								value: proCode,
								onChange: (event) => {
									setProCode(event.target.value);
									setProCodeError("");
								},
								onKeyDown: (event) => {
									if (event.key === "Enter") unlockPro();
								},
								placeholder: "Kodi Pro"
							}),
							proCodeError ? /* @__PURE__ */ jsx("small", {
								className: "pro-code-error",
								children: proCodeError
							}) : null,
							/* @__PURE__ */ jsx("button", {
								type: "button",
								onClick: unlockPro,
								children: "Aktivizo Pro"
							})
						] })
					]
				})
			}), document.body),
			voiceOpen && createPortal(/* @__PURE__ */ jsxs(Fragment, {
				children: [
					/* @__PURE__ */ jsx("iframe", {
						className: "zeri-bg",
						src: ZERI_LIVE,
						title: "Albanian AI live",
						ariaHidden: true,
						tabIndex: -1,
						allow: "microphone; camera; autoplay"
					}),
					/* @__PURE__ */ jsx(LiveVoicePanel, {
				speaking,
				hearing,
				lang: voiceLangFromPrefs(prefs),
				voiceId: "ilir",
				messages: voiceLog,
				micError,
				cameraOn: liveCamOn,
				pro: modelMode === "pro",
				mode: modelMode,
				onLang: (next) => changeLang(next),
				onVoice: () => undefined,
				onClose: stopLiveVoice,
				onRefresh: () => {
					stopLiveVoice();
					window.setTimeout(() => startLiveVoice(), 200);
				},
				onMic: () => {
					if (hearing) {
						listenRef.current?.pause();
						setHearing(false);
					} else if (!startGeminiListen()) void startParla();
				},
				onSend: (text) => void askZeriLive(text),
				onCamera: () => liveCamOn ? stopLiveCamera() : void startLiveCamera()
			})
				]
			}), document.body),
			voiceOpen && isGuest && /* @__PURE__ */ jsx("button", {
				type: "button",
				className: "guest-save-fab",
				onClick: () => {
					stopLiveVoice();
					setLoginGate(true);
				},
				children: "Hap llogari që bisedat të ruhen"
			}),
			settingsOpen && /* @__PURE__ */ jsx(SettingsPanel, {
				prefs,
				setPrefs,
				memories,
				onMemories: setMemories,
				onClose: () => setSettingsOpen(false),
				pro: modelMode === "pro",
				mode: modelMode
			}),
			aboutOpen && /* @__PURE__ */ jsx(AboutSheet, { onClose: () => setAboutOpen(false) }),
			statsOpen && /* @__PURE__ */ jsx(StatsSheet, {
				owner: isOwnerEmail(user?.primaryEmail),
				onClose: () => setStatsOpen(false)
			}),
			securityOpen && /* @__PURE__ */ jsx(SecuritySheet, { onClose: () => setSecurityOpen(false) }),
			loginGate && /* @__PURE__ */ jsxs("div", {
				className: "login-gate",
				children: [/* @__PURE__ */ jsx("button", {
					className: "login-gate-dismiss",
					type: "button",
					onClick: () => setLoginGate(false),
					children: "Më vonë"
				}), /* @__PURE__ */ jsx(AuthCard, {
					title: "Vazhdo me Albanian AI",
					note: "Hyr me Google ose email për të ruajtur bisedat."
				})]
			}),
			/* @__PURE__ */ jsx(InstallPrompt, {})
		]
	});
}
function MessageBubble({ message, copied, editing, lang, voiceId, google, onCopy, onRegenerate, setEditing, onCancel, onEdit }) {
	const [draft, setDraft] = useState(message.content);
	const parsed = parseUserContent(message.content);
	const generated = parseGeneratedImage(message.content);
	if (message.role === "user") return /* @__PURE__ */ jsx("div", {
		className: "user-row",
		children: editing ? /* @__PURE__ */ jsxs("div", {
			className: "edit-actions",
			children: [
				/* @__PURE__ */ jsx("textarea", {
					value: draft,
					onChange: (e) => setDraft(e.target.value),
					rows: 3
				}),
				/* @__PURE__ */ jsx("button", {
					type: "button",
					onClick: () => onEdit(draft),
					children: "Ruaj"
				}),
				/* @__PURE__ */ jsx("button", {
					type: "button",
					onClick: onCancel,
					children: "Anulo"
				})
			]
		}) : /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsxs("div", {
			className: "user-bubble",
			children: [parsed.image && /* @__PURE__ */ jsx("img", {
				className: "user-photo",
				src: parsed.image,
				alt: ""
			}), parsed.text ? /* @__PURE__ */ jsx("div", {
				className: "user-content",
				children: parsed.text
			}) : null]
		}), /* @__PURE__ */ jsx("button", {
			className: "message-more",
			type: "button",
			onClick: setEditing,
			"aria-label": "Ndrysho",
			children: "Ndrysho"
		})] })
	});
	return /* @__PURE__ */ jsxs("article", {
		className: "assistant-row",
		children: [/* @__PURE__ */ jsx("div", {
			className: "assistant-avatar",
			children: /* @__PURE__ */ jsx("img", {
				src: "/logo-192.jpg",
				alt: ""
			})
		}), /* @__PURE__ */ jsxs("div", {
			className: "assistant-content",
			children: [generated.image ? /* @__PURE__ */ jsxs("figure", {
				className: "gen-card",
				children: [
					/* @__PURE__ */ jsx("img", {
						className: "gen-photo",
						src: generated.image,
						alt: generated.text || "Foto e gjeneruar"
					}),
					generated.text ? /* @__PURE__ */ jsx("figcaption", { children: generated.text }) : null,
					/* @__PURE__ */ jsx("div", {
						className: "gen-actions",
						children: /* @__PURE__ */ jsxs("a", {
							href: generated.image,
							download: "albanian-ai.jpg",
							children: [/* @__PURE__ */ jsx(Download, { size: 14 }), " Shkarko"]
						})
					})
				]
			}) : /* @__PURE__ */ jsx(Markdown, { text: message.content }), /* @__PURE__ */ jsxs("div", {
				className: "message-actions",
				children: [
					/* @__PURE__ */ jsxs("button", {
						type: "button",
						onClick: () => onCopy(generated.text || "Foto", message.id),
						children: [
							copied ? /* @__PURE__ */ jsx(Check, { size: 14 }) : /* @__PURE__ */ jsx(Copy, { size: 14 }),
							" ",
							copied ? "U kopjua" : "Kopjo"
						]
					}),
					/* @__PURE__ */ jsx(SpeakButton, {
						text: generated.text || message.content,
						lang,
						voiceId,
						google
					}),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						onClick: onRegenerate,
						children: "Rifresko"
					})
				]
			})]
		})]
	});
}
function SpeakButton({ text, lang, voiceId, clip, google }) {
	const [on, setOn] = useState(false);
	return /* @__PURE__ */ jsxs("button", {
		type: "button",
		onClick: async () => {
			if (on) {
				speakGen += 1;
				stopAllSpeech();
				setOn(false);
				return;
			}
			setOn(true);
			unlockAudio();
			if (clip) try {
				await playUrl(clip);
				setOn(false);
				return;
			} catch {}
			await speakReply(text, detectLang(text, lang), "ilir", () => setOn(false), false, false);
		},
		children: [
			on ? /* @__PURE__ */ jsx(VolumeX, { size: 13 }) : /* @__PURE__ */ jsx(Volume2, { size: 13 }),
			" ",
			on ? "Ndalo" : "Dëgjo"
		]
	});
}
