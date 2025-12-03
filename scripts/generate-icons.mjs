#!/usr/bin/env node
/**
 * Icon Generator for PWA
 * Generates PNG icons from SVG source using sharp
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, '..', 'public');

console.log('📱 PWA Icon Generator\n');

const sizes = [
  { size: 192, name: 'pwa-192x192.png' },
  { size: 512, name: 'pwa-512x512.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 32, name: 'favicon.ico' }, // Actually PNG but named .ico for simplicity
];

const svgBuffer = readFileSync(join(publicDir, 'icon.svg'));

async function generateIcons() {
  for (const { size, name } of sizes) {
    try {
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(join(publicDir, name));
      console.log(`✓ Generated ${name} (${size}x${size})`);
    } catch (err) {
      console.error(`✗ Failed to generate ${name}:`, err.message);
    }
  }

  console.log('\n✅ All icons generated successfully!');
}

generateIcons().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
