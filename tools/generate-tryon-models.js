// Regenerates assets/tryon/model-*.svg from the body geometry in tryon.js.
// Run after changing any body measurement or garment shape: node tools/generate-tryon-models.js
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const src = fs.readFileSync(path.join(root, "tryon.js"), "utf8");
const geometry = src.slice(src.indexOf("var CX = 120;"), src.indexOf("function garmentShapes"));
const { torsoPath, sleevePaths } = new Function(geometry + "; return { torsoPath, sleevePaths };")();

// Body values must match MODELS in tryon.js.
const models = [
  { id: "a", label: "Model A, size S, slim build", body: { s: 40, w: 26, h: 34, a: 0 }, skin: "#F1C9A5", hair: "#3B2A20", style: "long" },
  { id: "b", label: "Model B, size M, average build", body: { s: 46, w: 33, h: 38, a: 1 }, skin: "#8D5A3B", hair: "#1D1A18", style: "short" },
  { id: "c", label: "Model C, size L, curvy build", body: { s: 46, w: 38, h: 50, a: 3 }, skin: "#C68B5E", hair: "#2A1D15", style: "bun" },
  { id: "d", label: "Model D, size XL, plus-size build", body: { s: 54, w: 48, h: 56, a: 5 }, skin: "#5E3B28", hair: "#141210", style: "curly" }
];

const CX = 120;
const outDir = path.join(root, "assets", "tryon");
fs.mkdirSync(outDir, { recursive: true });

for (const m of models) {
  const b = m.body;
  const ankle = b.h * 0.55 + 8;
  const shortsX = b.h + (ankle - b.h) * (50 / 198);
  const hand = b.s + 9 + b.a / 2;
  const parts = [];
  if (m.style === "long") parts.push(`<path d="M96 52 Q94 32 120 31 Q146 32 144 52 L148 118 Q120 126 92 118 Z" fill="${m.hair}"/>`);
  parts.push(`<path d="M${CX + 2} 246 L${CX + b.h} 242 L${CX + ankle} 440 L${CX + 5} 440 Z M${CX - 2} 246 L${CX - b.h} 242 L${CX - ankle} 440 L${CX - 5} 440 Z" fill="${m.skin}"/>`);
  parts.push(`<ellipse cx="${CX + (ankle + 5) / 2}" cy="446" rx="13" ry="6" fill="#3A332C"/><ellipse cx="${CX - (ankle + 5) / 2}" cy="446" rx="13" ry="6" fill="#3A332C"/>`);
  for (const d of sleevePaths(b, 0, 294)) parts.push(`<path d="${d}" fill="${m.skin}"/>`);
  parts.push(`<circle cx="${CX + hand}" cy="302" r="8" fill="${m.skin}"/><circle cx="${CX - hand}" cy="302" r="8" fill="${m.skin}"/>`);
  parts.push(`<rect x="110" y="74" width="20" height="26" fill="${m.skin}"/><circle cx="120" cy="58" r="24" fill="${m.skin}"/>`);
  parts.push(`<path d="${torsoPath(b, 0, 250)}" fill="#D9D1C3"/>`);
  parts.push(`<path d="M${CX - b.h} 236 L${CX + b.h} 236 L${(CX + shortsX).toFixed(1)} 292 L${CX + 3} 292 L${CX} 268 L${CX - 3} 292 L${(CX - shortsX).toFixed(1)} 292 Z" fill="#8A8274"/>`);
  if (m.style === "curly") {
    const curls = [];
    for (let deg = 190; deg <= 350; deg += 20) {
      const r = (deg * Math.PI) / 180;
      curls.push(`<circle cx="${(120 + 26 * Math.cos(r)).toFixed(1)}" cy="${(54 + 26 * Math.sin(r)).toFixed(1)}" r="10"/>`);
    }
    parts.push(`<g fill="${m.hair}">${curls.join("")}</g>`);
  } else {
    parts.push(`<path d="M96 60 Q96 30 120 30 Q144 30 144 60 Q136 44 120 44 Q104 44 96 60 Z" fill="${m.hair}"/>`);
    if (m.style === "bun") parts.push(`<circle cx="120" cy="25" r="12" fill="${m.hair}"/>`);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 480" width="240" height="480" role="img" aria-label="${m.label}">\n  <title>${m.label}</title>\n  ${parts.join("\n  ")}\n</svg>\n`;
  fs.writeFileSync(path.join(outDir, `model-${m.id}.svg`), svg);
}
console.log("Wrote " + models.length + " model figures to assets/tryon/");
