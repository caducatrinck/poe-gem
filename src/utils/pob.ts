export interface PobBuild {
  className: string;
  gems: string[];
}

// Código do PoB = XML comprimido (zlib) em base64 url-safe
async function decodePobCode(code: string): Promise<string> {
  const b64 = code.trim().replace(/-/g, "+").replace(/_/g, "/");
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const stream = new Blob([bytes])
    .stream()
    .pipeThrough(new DecompressionStream("deflate"));
  return new Response(stream).text();
}

// Aceita link do pobb.in ou o código bruto do Path of Building
export async function loadPobBuild(input: string): Promise<PobBuild> {
  const text = input.trim();
  let code = text;
  const link = text.match(/^https?:\/\/pobb\.in\/([A-Za-z0-9_-]+)/);
  if (link) {
    const res = await fetch(`/pobb/${link[1]}/raw`);
    if (!res.ok) {
      throw new Error(`pobb.in respondeu ${res.status} para "${link[1]}"`);
    }
    code = await res.text();
  }
  const xml = await decodePobCode(code);
  const className = xml.match(/<Build [^>]*\bclassName="([^"]*)"/)?.[1] ?? "";
  const gems = new Set<string>();
  for (const m of xml.matchAll(/<Gem [^>]*\bnameSpec="([^"]*)"/g)) {
    gems.add(m[1]);
  }
  return { className, gems: [...gems] };
}
