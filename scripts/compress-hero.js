import sharp from "sharp";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const input = join(__dirname, "../public/hero-banner.png");
const outputAvif = join(__dirname, "../public/hero-banner.avif");
const outputWebp = join(__dirname, "../public/hero-banner.webp");

const meta = await sharp(input).metadata();
console.log(`Input: ${meta.width}x${meta.height}, format=${meta.format}`);

await sharp(input)
    .resize({ width: 1920, withoutEnlargement: true })
    .avif({ quality: 60 })
    .toFile(outputAvif);

await sharp(input)
    .resize({ width: 1920, withoutEnlargement: true })
    .webp({ quality: 75 })
    .toFile(outputWebp);

const { size: avifSize } = await import("fs").then(fs => fs.promises.stat(outputAvif));
const { size: webpSize } = await import("fs").then(fs => fs.promises.stat(outputWebp));
console.log(`AVIF: ${(avifSize / 1024).toFixed(0)}KB`);
console.log(`WebP: ${(webpSize / 1024).toFixed(0)}KB`);
console.log("Done.");
