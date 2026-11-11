// Coleta level requerido e atributo de cada gema na PoE Wiki e grava public/gemInfo.json
import { readFileSync, writeFileSync } from "node:fs";

// Só gemas que aparecem nas quests/vendors (evita milhares de requisições à wiki)
const rewards = JSON.parse(readFileSync("public/questRewards.json", "utf8"));
const wanted = new Set();
for (const k of ["reward", "vendor"])
  for (const r of rewards[k])
    for (const c of ["witch", "shadow", "ranger", "duelist", "marauder", "templar", "scion"])
      r[c].forEach((n) => wanted.add(n));

const API = "https://www.poewiki.net/w/api.php";
async function query(params) {
  const all = [];
  for (let offset = 0; ; offset += 500) {
    const p = new URLSearchParams({
      action: "cargoquery",
      format: "json",
      limit: "500",
      offset: String(offset),
      ...params,
    });
    let json;
    for (let attempt = 0; attempt < 6 && !json; attempt++) {
      const res = await fetch(`${API}?${p}`, { headers: { "User-Agent": "poe-gem-app" } });
      try {
        json = await res.json();
      } catch {
        await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
      }
    }
    if (!json) throw new Error("rate limit");
    const rows = json.cargoquery.map((r) => r.title);
    all.push(...rows);
    if (rows.length < 500) return all;
  }
}

const out = {};
for (const t of await query({
  tables: "skill_gems,items",
  join_on: "skill_gems._pageID=items._pageID",
  fields: "items.name=name,items.required_level=lvl,skill_gems.primary_attribute=attr",
  where: "items.class_id IN ('Active Skill Gem','Support Skill Gem')",
  order_by: "items.name",
})) {
  out[t.name] = { level: Number(t.lvl) || 0, attribute: t.attr || "", str: 0, dex: 0, int: 0 };
}

// Requisitos de atributo no nível 1 da gema: a wiki só os calcula ao renderizar a página
// ("Requires Level (12-70), (21-98) Str, (14-68) Int"), então lemos o HTML renderizado.
async function fetchReqs(name) {
  const p = new URLSearchParams({
    action: "parse", page: name, prop: "text", format: "json", disablelimitreport: "1",
  });
  let json;
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(`${API}?${p}`, { headers: { "User-Agent": "poe-gem-app" } });
    try {
      json = await res.json();
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
    }
  }
  if (!json) throw new Error("rate limit");
  const html = json.parse?.text?.["*"];
  if (!html) return null;
  const text = html.replace(/<[^>]+>/g, "");
  const m = text.match(/Requires Level\s*\(?\d+(?:-\d+\))?((?:,\s*\(?\d+(?:-\d+\))?\s*(?:Str|Dex|Int))*)/);
  if (!m) return null;
  const r = { str: 0, dex: 0, int: 0 };
  for (const x of m[1].matchAll(/\(?(\d+)(?:-\d+\))?\s*(Str|Dex|Int)/g)) {
    r[x[2].toLowerCase()] = Number(x[1]);
  }
  return r;
}

// Retoma de onde parou: reaproveita o que já foi coletado em rodadas anteriores
try {
  const prev = JSON.parse(readFileSync("public/gemInfo.json", "utf8"));
  for (const n of Object.keys(out)) if (prev[n]) Object.assign(out[n], prev[n]);
} catch {}

const names = Object.keys(out).filter(
  (n) => wanted.has(n) && out[n].str + out[n].dex + out[n].int === 0
);
console.log(names.length, "gemas para coletar");
let done = 0;
for (const name of names) {
  try {
    const r = await fetchReqs(name);
    if (r) Object.assign(out[name], r);
  } catch (e) {
    console.error("falhou:", name, e.message);
  }
  writeFileSync("public/gemInfo.json", JSON.stringify(out));
  console.log(`${++done}/${names.length} ${name}`);
  await new Promise((r) => setTimeout(r, 1500));
}
console.log("fim");
