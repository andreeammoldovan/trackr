// Renders the trackr. app icon to the PNG sizes iOS and the web manifest need.
import sharp from "sharp";
import { writeFileSync } from "node:fs";

const ACCENT = "#FF4D00";
const mark = (bg, fg) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="${bg}"/>
  <rect x="31" y="18" width="17" height="58" rx="3" fill="${fg}"/>
  <rect x="20" y="33" width="40" height="14" rx="3" fill="${fg}"/>
  <rect x="31" y="63" width="32" height="13" rx="3" fill="${fg}"/>
  <circle cx="73" cy="69.5" r="7.5" fill="${ACCENT}"/>
</svg>`;

writeFileSync("public/icon.svg", mark("#111113", "#FFFFFF"));
const svg = Buffer.from(mark("#111113", "#FFFFFF"));
for (const [name, size] of [["apple-touch-icon.png", 180], ["icon-192.png", 192], ["icon-512.png", 512], ["favicon-32.png", 32]]) {
  await sharp(svg, { density: 600 }).resize(size, size).png().toFile(`public/${name}`);
}
console.log("icons written");
