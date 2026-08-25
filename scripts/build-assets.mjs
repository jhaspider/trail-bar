import sharp from 'sharp';
import { readFile, mkdir, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const src = join(root, 'assets', 'source');
const store = join(root, 'assets', 'store');
const manifestIcons = join(root, 'src', 'icons');

async function renderSvg(svgPath, outPath, width, height) {
  const svg = await readFile(svgPath);
  await sharp(svg, { density: 384 })
    .resize(width, height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
  console.log(`  → ${outPath.replace(root + '/', '')} (${width}×${height})`);
}

async function main() {
  await mkdir(store, { recursive: true });
  await mkdir(manifestIcons, { recursive: true });

  const iconSvg = join(src, 'icon.svg');

  console.log('Manifest icons:');
  for (const size of [16, 32, 48, 128]) {
    await renderSvg(iconSvg, join(manifestIcons, `icon-${size}.png`), size, size);
  }

  console.log('Store assets:');
  await renderSvg(iconSvg, join(store, 'icon-128.png'), 128, 128);
  await renderSvg(join(src, 'small-promo.svg'), join(store, 'small-promo-440x280.png'), 440, 280);
  await renderSvg(join(src, 'marquee.svg'), join(store, 'marquee-1400x560.png'), 1400, 560);

  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
