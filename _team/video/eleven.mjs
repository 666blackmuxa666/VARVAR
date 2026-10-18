// Озвучка ElevenLabs → voice/l1..l10.mp3 (лише відсутні). Ключ: перший рядок .eleven; другий (необов'язково) — voice_id. Ключ не друкується.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const base = decodeURIComponent(new URL('.', import.meta.url).pathname), dir = process.env.D ? process.env.D.replace(/\/?$/, '/') : base;
if (!existsSync(base + '.eleven')) process.exit(0);
const [key, v] = readFileSync(base + '.eleven', 'utf8').split('\n').map(x => x.trim()); const vid = process.env.VID || v || 'hWHihsTve3RbzG4PHDBQ', vd = process.env.VD || 'voice'; (await import('node:fs')).mkdirSync(dir + vd, { recursive: true });
const lines = readFileSync(dir + 'voice.txt', 'utf8').trim().split('\n');
for (let i = 0; i < lines.length; i++) {
  const f = `${dir}${vd}/l${i + 1}.mp3`; if (existsSync(f)) continue;
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${vid}`, { method: 'POST', headers: { 'xi-api-key': key, 'content-type': 'application/json', accept: 'audio/mpeg' },
    body: JSON.stringify({ text: lines[i], model_id: 'eleven_multilingual_v2', voice_settings: { stability: .45, similarity_boost: .8, style: .3 } }) });
  if (!r.ok) { console.error('ElevenLabs помилка', r.status, 'рядок', i + 1, (await r.text()).slice(0, 200)); process.exit(1); }
  writeFileSync(f, Buffer.from(await r.arrayBuffer())); console.log('🎙 l' + (i + 1));
}
