/**
 * Sticker/GIF Upload Script for Puxy
 * 
 * Uploads assets from local folders to Cloudinary and writes stickers.json
 * 
 * Categories:
 *   - dudububu: all files from "dudu bubu" folder
 *   - adulty:   all files from "used" folder + "new folder"
 * 
 * Run: npx ts-node upload_stickers.ts
 */

import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const SUPPORTED_EXTENSIONS = ['.gif', '.webp', '.png', '.jpg', '.jpeg', '.mp4'];

const CATEGORY_FOLDERS: { category: 'dudububu' | 'adulty'; folderPath: string }[] = [
  {
    category: 'dudububu',
    folderPath: 'C:\\Users\\propa\\Downloads\\Save as GIF\\dudu bubu',
  },
  {
    category: 'adulty',
    folderPath: 'C:\\Users\\propa\\Downloads\\Save as GIF\\used',
  },
  {
    category: 'adulty',
    folderPath: 'C:\\Users\\propa\\Downloads\\Save as GIF\\new folder',
  },
];

const OUTPUT_FILE = path.join(__dirname, '..', '..', 'frontend', 'public', 'stickers.json');

async function uploadFile(filePath: string, cloudinaryFolder: string): Promise<string | null> {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const resourceType = ext === '.mp4' ? 'video' : 'image';
    
    const result = await cloudinary.uploader.upload(filePath, {
      folder: `puxy/${cloudinaryFolder}`,
      resource_type: resourceType as any,
    });
    
    console.log(`  ✓ Uploaded: ${path.basename(filePath)}`);
    return result.secure_url;
  } catch (err: any) {
    console.error(`  ✗ Failed: ${path.basename(filePath)} — ${err.message}`);
    return null;
  }
}

async function processFolder(folderPath: string, cloudinaryFolder: string): Promise<string[]> {
  if (!fs.existsSync(folderPath)) {
    console.warn(`  ⚠ Folder not found: ${folderPath}`);
    return [];
  }

  const files = fs.readdirSync(folderPath)
    .filter(f => SUPPORTED_EXTENSIONS.includes(path.extname(f).toLowerCase()))
    .map(f => path.join(folderPath, f));

  console.log(`  Found ${files.length} files in: ${folderPath}`);

  const urls: string[] = [];
  for (const file of files) {
    const url = await uploadFile(file, cloudinaryFolder);
    if (url) urls.push(url);
  }
  return urls;
}

async function main() {
  console.log('\n🚀 Puxy Sticker Upload Script\n');
  console.log('Cloudinary cloud:', process.env.CLOUDINARY_CLOUD_NAME);

  const results: Record<string, string[]> = {
    dudububu: [],
    adulty: [],
  };

  for (const { category, folderPath } of CATEGORY_FOLDERS) {
    console.log(`\n📁 Processing [${category}]: ${folderPath}`);
    const urls = await processFolder(folderPath, category);
    results[category].push(...urls);
  }

  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));

  console.log('\n✅ Done!');
  console.log(`   Dudu Bubu: ${results.dudububu.length} stickers`);
  console.log(`   Adulty: ${results.adulty.length} GIFs`);
  console.log(`   Output: ${OUTPUT_FILE}`);
}

main().catch(console.error);
