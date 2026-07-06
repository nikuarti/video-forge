#!/usr/bin/env node
// Self-contained Voicebox TTS — single text in -> one wav (+ optional words
// JSON) out. Calls the local Voicebox REST API (https://voicebox.sh) so
// narration can use a cloned/local voice instead of HeyGen/ElevenLabs/Kokoro.
//
// Voicebox has no word-timestamp output, so --words chains a Whisper pass via
// `npx hyperframes transcribe`, same as the ElevenLabs/Kokoro path in the
// hyperframes-media skill.
//
// Usage:
//   node voicebox-tts.mjs "Text to speak" -o narration.wav --profile Morgan
//   node voicebox-tts.mjs ./script.txt    -o narration.wav --profile Morgan --words narration.words.json
//   node voicebox-tts.mjs --list          # list local voice profiles and exit
//
// Flags: -o/--output, --profile (name, case-insensitive, or id), --engine
//   (qwen|qwen_custom_voice|luxtts|chatterbox|chatterbox_turbo|tada|kokoro),
//   --lang (default en), --words, --base-url (default http://127.0.0.1:17493).
// Requires: Voicebox running locally (`just dev` in the voicebox repo) and ffmpeg.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const argv = process.argv.slice(2);
function flag(name, def) {
  const i = argv.indexOf(`--${name}`);
  if (i < 0) return def;
  if (i + 1 >= argv.length) return true;
  const v = argv[i + 1];
  return v.startsWith("--") ? true : v;
}
const die = (m) => {
  console.error(`✗ voicebox-tts: ${m}`);
  process.exit(1);
};

// First arg that isn't a flag or the -o value is the text / .txt path.
const positional = (() => {
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) i++;
      continue;
    }
    if (a === "-o") {
      i++;
      continue;
    }
    return a;
  }
  return null;
})();

const output = resolve(
  (typeof flag("output") === "string" && flag("output")) ||
    (argv.includes("-o") && argv[argv.indexOf("-o") + 1]) ||
    "narration.wav",
);
const wordsPath = typeof flag("words") === "string" ? resolve(flag("words")) : null;
const profileArg = typeof flag("profile") === "string" ? flag("profile") : null;
const engine = typeof flag("engine") === "string" ? flag("engine") : undefined;
const lang = typeof flag("lang") === "string" ? flag("lang") : "en";
const baseUrl = (typeof flag("base-url") === "string" ? flag("base-url") : "http://127.0.0.1:17493").replace(
  /\/$/,
  "",
);
const listOnly = flag("list") === true;

async function api(path, opts = {}) {
  const res = await fetch(`${baseUrl}${path}`, opts);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${opts.method ?? "GET"} ${path} -> ${res.status} ${body.slice(0, 300)}`);
  }
  return res;
}

// ---------- resolve profile ----------
let profiles;
try {
  profiles = await (await api("/profiles")).json();
} catch (e) {
  die(`can't reach Voicebox at ${baseUrl} (${e.message}). Is \`just dev\` running in the voicebox repo?`);
}

if (listOnly) {
  for (const p of profiles) console.log(`${p.id}\t${p.name}\t${p.language ?? ""}\t${p.voice_type ?? ""}`);
  process.exit(0);
}

if (!positional) die("no text given. Pass a string or a .txt path, or use --list.");
const text =
  positional.endsWith(".txt") && existsSync(resolve(positional))
    ? readFileSync(resolve(positional), "utf8").trim()
    : positional;
if (!text) die("input text is empty");

const available = () => (profiles.length ? profiles.map((p) => p.name).join(", ") : "(none — clone or import a voice in Voicebox first)");
if (!profileArg) die(`no --profile given. Available: ${available()}`);
const profile =
  profiles.find((p) => p.id === profileArg) ?? profiles.find((p) => p.name.toLowerCase() === profileArg.toLowerCase());
if (!profile) die(`profile "${profileArg}" not found. Available: ${available()}`);

// ---------- generate (queued: POST returns immediately, poll /status for completion) ----------
const genBody = { profile_id: profile.id, text, language: lang };
if (engine) genBody.engine = engine;

const gen = await (
  await api("/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(genBody),
  })
).json();

async function pollUntilDone(generationId, timeoutMs = 5 * 60 * 1000) {
  const res = await api(`/generate/${generationId}/status`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  const deadline = Date.now() + timeoutMs;
  try {
    while (Date.now() < deadline) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf("\n\n")) >= 0) {
        const event = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        const line = event.split("\n").find((l) => l.startsWith("data: "));
        if (!line) continue;
        const payload = JSON.parse(line.slice(6));
        if (["completed", "failed", "not_found"].includes(payload.status)) return payload;
      }
    }
    throw new Error("timed out waiting for generation to complete");
  } finally {
    reader.cancel().catch(() => {});
  }
}

const final = await pollUntilDone(gen.id);
if (final.status !== "completed") die(`generation failed: ${final.error ?? final.status}`);

// ---------- fetch audio, normalize to 44.1k mono wav ----------
const audioRes = await api(`/audio/${gen.id}`);
const bytes = Buffer.from(await audioRes.arrayBuffer());

const td = mkdtempSync(join(tmpdir(), "vb-tts-"));
const rawWav = join(td, "raw.wav");
writeFileSync(rawWav, bytes);

mkdirSync(dirname(output), { recursive: true });
const ff = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", rawWav, "-ar", "44100", "-ac", "1", output], {
  stdio: "inherit",
});
rmSync(td, { recursive: true, force: true });
if (ff.status !== 0 || !existsSync(output)) die("ffmpeg transcode to 44.1k mono failed");

// ---------- word timestamps (Voicebox has none — run Whisper) ----------
let wordCount = 0;
if (wordsPath) {
  const model = lang === "en" ? "small.en" : "small";
  const wtd = mkdtempSync(join(tmpdir(), "vb-trans-"));
  const args = ["hyperframes", "transcribe", output, "--model", model, "--dir", wtd];
  if (lang !== "en") args.push("--language", lang);
  const r = spawnSync("npx", args, { stdio: "inherit" });
  if (r.status === 0 && existsSync(join(wtd, "transcript.json"))) {
    const words = JSON.parse(readFileSync(join(wtd, "transcript.json"), "utf8"));
    if (Array.isArray(words) && words.length) {
      mkdirSync(dirname(wordsPath), { recursive: true });
      writeFileSync(wordsPath, JSON.stringify(words, null, 2));
      wordCount = words.length;
    }
  }
  rmSync(wtd, { recursive: true, force: true });
  if (!wordCount) console.error("⚠ transcription produced no words — captions pipeline will have nothing to time");
}

function ffprobeDuration(absPath) {
  const r = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", absPath],
    { encoding: "utf8" },
  );
  return r.status === 0 ? parseFloat(String(r.stdout).trim()) : NaN;
}

const dur = ffprobeDuration(output);
const durStr = isFinite(dur) ? ` (${dur.toFixed(2)}s)` : "";
console.log(`✓ ${output}${durStr}${wordCount ? ` · ${wordsPath} (${wordCount} words)` : ""}`);
