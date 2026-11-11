// Gera public/questOrder.json: ordem das quests de cada ato (progressão do jogo),
// lida da lista "Quests" de cada página "Act N" da PoE Wiki.
import { writeFileSync } from "node:fs";

const dec = (s) => s.replace(/&#0?39;|&#x27;/g, "'").replace(/&amp;/g, "&");
const out = {};
for (let act = 1; act <= 10; act++) {
  let json;
  for (let i = 0; i < 5 && !json; i++) {
    const res = await fetch(
      `https://www.poewiki.net/w/api.php?action=parse&page=Act_${act}&prop=text&format=json&disablelimitreport=1`,
      { headers: { "User-Agent": "poe-gem-app" } }
    );
    try {
      json = await res.json();
    } catch {
      await new Promise((r) => setTimeout(r, 4000 * (i + 1)));
    }
  }
  if (!json) throw new Error(`Ato ${act}: sem resposta da wiki`);
  const t = json.parse.text["*"];
  const section = t.slice(t.indexOf('id="Quests"'), t.indexOf('id="Progression"'));
  out[act] = [...new Set([...section.matchAll(/<a [^>]*title="([^"]+)"/g)].map((m) => dec(m[1])))].filter(
    (n) => n !== "Quest"
  );
  console.log("Ato", act, out[act].length, "quests");
  await new Promise((r) => setTimeout(r, 1500));
}
writeFileSync("public/questOrder.json", JSON.stringify(out, null, 1));
