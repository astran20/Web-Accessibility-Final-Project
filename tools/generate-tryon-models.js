// Regenerates assets/tryon/model-*.svg from the models and body geometry in tryon.js.
// Run after changing anything between the figure-geometry markers: node tools/generate-tryon-models.js
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const src = fs.readFileSync(path.join(root, "tryon.js"), "utf8");
const geometry = src.slice(src.indexOf("// figure-geometry:start"), src.indexOf("// figure-geometry:end"));
const g = new Function(geometry + "; return { CX, BASE_TEE, BASE_SHORTS, MODELS, armJoints, legJoints, limbAt, limbPath, torsoPath, bottomsPath };")();
const { CX } = g;

function hair(m, layer) {
  if (m.hairStyle === "long") {
    return layer === "back"
      ? `<path d="M98 52 Q98 28 120 28 Q142 28 142 52 L146 122 Q120 130 94 122 Z" fill="${m.hair}"/>`
      : `<path d="M98 56 Q98 28 120 28 Q142 28 142 56 Q134 40 120 41 Q106 40 98 56 Z" fill="${m.hair}"/>`;
  }
  if (layer === "back") return "";
  if (m.hairStyle === "curly") {
    const curls = [];
    for (let deg = 190; deg <= 350; deg += 20) {
      const r = (deg * Math.PI) / 180;
      curls.push(`<circle cx="${(120 + 20 * Math.cos(r)).toFixed(1)}" cy="${(56 + 21 * Math.sin(r)).toFixed(1)}" r="9"/>`);
    }
    return `<g fill="${m.hair}"><path d="M100 56 Q100 33 120 33 Q140 33 140 56 Q132 44 120 45 Q108 44 100 56 Z"/>${curls.join("")}</g>`;
  }
  const cap = `<path d="M99 53 Q100 29 120 29 Q140 29 141 53 Q136 38 120 39 Q104 38 99 53 Z" fill="${m.hair}"/>`;
  return m.hairStyle === "bun" ? cap + `<circle cx="120" cy="24" r="11" fill="${m.hair}"/>` : cap;
}

const outDir = path.join(root, "assets", "tryon");
fs.mkdirSync(outDir, { recursive: true });

for (const m of g.MODELS) {
  const b = m.body;
  const label = `${m.name}, size ${m.size}, ${m.build.toLowerCase()}`;
  const arm = g.armJoints(b);
  const legs = g.legJoints(b);
  const wrist = arm[arm.length - 1];
  const ankle = legs[legs.length - 1];
  const capTop = g.limbAt(arm, 114);
  const parts = [hair(m, "back")];
  for (const side of [1, -1]) {
    parts.push(`<path d="${g.limbPath(legs, side, 0, 242, 438)}" fill="${m.skin}"/>`);
    parts.push(`<ellipse cx="${CX + side * (ankle[0] + 3)}" cy="442" rx="11" ry="5.5" fill="#3A332C"/>`);
    parts.push(`<circle cx="${CX + side * capTop[0]}" cy="114" r="${capTop[1]}" fill="${m.skin}"/>`);
    parts.push(`<path d="${g.limbPath(arm, side, 0, 110, 286)}" fill="${m.skin}"/>`);
    parts.push(`<ellipse cx="${CX + side * (wrist[0] + 1)}" cy="294" rx="6" ry="9" fill="${m.skin}"/>`);
  }
  parts.push(`<path d="M111 72 L129 72 L131 98 L109 98 Z" fill="${m.skin}"/>`);
  parts.push(`<ellipse cx="120" cy="56" rx="21" ry="25" fill="${m.skin}"/>`);
  parts.push(`<path d="${g.bottomsPath(b, 0, 292)}" fill="${g.BASE_SHORTS}"/>`);
  for (const side of [1, -1]) {
    parts.push(`<circle cx="${CX + side * capTop[0]}" cy="114" r="${capTop[1] + 1}" fill="${g.BASE_TEE}"/>`);
    parts.push(`<path d="${g.limbPath(arm, side, 1, 110, 140)}" fill="${g.BASE_TEE}"/>`);
  }
  parts.push(`<path d="${g.torsoPath(b, 0, 250, "high", 0)}" fill="${g.BASE_TEE}"/>`);
  parts.push(hair(m, "front"));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 480" width="240" height="480" role="img" aria-label="${label}">\n  <title>${label}</title>\n  ${parts.filter(Boolean).join("\n  ")}\n</svg>\n`;
  fs.writeFileSync(path.join(outDir, `model-${m.id}.svg`), svg);
}
console.log("Wrote " + g.MODELS.length + " model figures to assets/tryon/");
