import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

async function run() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    fs.writeFileSync('/tmp/test_upload.txt', 'Hello world');
    const response = await ai.files.upload({
      file: '/tmp/test_upload.txt',
      mimeType: 'text/plain'
    });
    console.log(response);
  } catch(e) {
    console.error(e);
  }
}
run();
