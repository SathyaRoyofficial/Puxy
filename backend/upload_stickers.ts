import fs from 'fs';
import path from 'path';
import cloudinary from './src/cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Folder where your local GIFs are stored
const STICKERS_DIR = 'C:\\Users\\propa\\Downloads\\Save as GIF';
// Where to save the output JSON for the frontend
const OUTPUT_FILE = path.join(__dirname, '../frontend/public/stickers.json');

async function uploadStickers() {
  if (!fs.existsSync(STICKERS_DIR)) {
    console.error(`Please create a folder named "stickers" in the backend directory and put your GIFs there.`);
    process.exit(1);
  }

  const files = fs.readdirSync(STICKERS_DIR).filter(file => {
    const ext = path.extname(file).toLowerCase();
    return ['.gif', '.png', '.webp', '.jpg', '.jpeg'].includes(ext);
  });

  if (files.length === 0) {
    console.error(`No GIFs found in ${STICKERS_DIR}.`);
    process.exit(1);
  }

  console.log(`Found ${files.length} stickers to upload. This might take a while...`);

  const uploadedUrls: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(STICKERS_DIR, file);
    
    try {
      console.log(`[${i+1}/${files.length}] Uploading ${file}...`);
      const result = await cloudinary.uploader.upload(filePath, {
        folder: 'puxy_stickers',
        resource_type: 'image',
      });
      uploadedUrls.push(result.secure_url);
    } catch (err) {
      console.error(`Failed to upload ${file}:`, err);
    }
  }

  // Save the URLs to a JSON file in the frontend's public folder
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(uploadedUrls, null, 2));
  console.log(`\nSuccess! Uploaded ${uploadedUrls.length} stickers.`);
  console.log(`Saved URLs to ${OUTPUT_FILE}`);
}

uploadStickers().catch(console.error);
