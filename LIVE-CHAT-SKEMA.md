# Skema e Live chat — Albanian AI

## Rrjedha default

1. Hapet Live chat.
2. **Albanian AI** përshëndet me Microsoft Edge TTS **sq-AL-IlirNeural**.
3. Kur TTS mbaron, mikrofoni aktivizohet automatikisht.
4. VAD në `workspace.tsx` mbledh audion derisa të ketë rreth 900 ms heshtje.
5. Segmenti WAV dërgohet te `transcribeSpeech`. Për shqipen përdoret fillimisht `Flutra/whisper-large-v3-turbo-sq-v2` në Hugging Face kur `HF_TOKEN` është i konfiguruar.
6. Nëse Hugging Face mungon ose dështon, përdoret Groq Whisper me `language=sq`.
7. Teksti i pastruar dërgohet te truri ekzistues.
8. Përgjigjja kthehet te TTS Ilir dhe cikli përsëritet.

## Ndërprerja

Nëse përdoruesi flet gjatë TTS, barge-in ndalon audion e Albanian AI dhe nis një segment të ri dëgjimi.

## Konfigurimi

- `HF_TOKEN` ose `HUGGINGFACE_API_KEY`: aktivizon Whisper shqip Flutra.
- `HF_WHISPER_MODEL`: opsional; default `Flutra/whisper-large-v3-turbo-sq-v2`.
- `GROQ_API_KEY`: fallback pa HF token.
- Safari Web Speech dhe xAI nuk përdoren për dëgjimin shqip.

## Skedarët

- `src/lib/assistant/stt-whisper-sq.ts`: HF → Groq server-side STT.
- `src/lib/assistant/whisper-listen.ts`: kontrata dhe rregullat e ciklit Whisper.
- `src/components/workspace.tsx`: VAD, mikrofon, auto-restart dhe ndërprerja gjatë TTS.
- `src/lib/assistant/actions.ts`: endpoint-i server-side `transcribeSpeech`.
- `src/routes/api/speak.ts`: zëri Ilir.
