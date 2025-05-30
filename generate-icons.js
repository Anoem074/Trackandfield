const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const SPLASH_SCREENS = [
  { width: 640, height: 1136 },
  { width: 750, height: 1334 },
  { width: 1242, height: 2208 },
  { width: 1125, height: 2436 },
  { width: 1536, height: 2048 }
];

async function generateIcons() {
  // Create icons directory if it doesn't exist
  const iconsDir = path.join(__dirname, 'frontend', 'icons');
  try {
    await fs.mkdir(iconsDir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }

  // Generate icons
  for (const size of ICON_SIZES) {
    await sharp('src/icon.png')
      .resize(size, size)
      .toFile(path.join(iconsDir, `icon-${size}x${size}.png`));
  }

  // Generate splash screens
  for (const screen of SPLASH_SCREENS) {
    await sharp('src/splash.png')
      .resize(screen.width, screen.height, {
        fit: 'contain',
        background: { r: 10, g: 10, b: 15, alpha: 1 }
      })
      .toFile(path.join(iconsDir, `splash-${screen.width}x${screen.height}.png`));
  }
}

generateIcons().catch(console.error); 