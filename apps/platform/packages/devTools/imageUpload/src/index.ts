import { getStorage } from "firebase-admin/storage";
import { initializeApp } from "firebase-admin/app";
import metadatas from "./metadatas";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";

// Initialize Firebase Admin SDK
initializeApp({
  storageBucket: process.env.IMAGES_BUCKET_NAME,
});

// Get Storage instance
const storage = getStorage();

// Example usage
const filePath = "./images/image_1.png";

uploadFile(filePath).catch(console.error);

// Function to upload a file
async function uploadFile(filePath: string): Promise<void> {
  try {
    const bucket = storage.bucket();

    await bucket.upload(filePath, {
      metadata: {
        metadata: metadatas.testMetadata,
      },
    });
    console.log(`File ${filePath} uploaded to emulator`);
  } catch (error) {
    console.error("Error uploading file:", error);
  }
}
