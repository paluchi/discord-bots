import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const doc = {
  id: "GhJEGOvi6tcPnIAJ7kKb",
  clientId: "j7DF4TsfdTyWRpDsLbMt",
  details: {
    discordChannelId: "1279117966602139650",
    processVersion: 1,
    id: "GhJEGOvi6tcPnIAJ7kKb",
    salesmanId: "637826203197374470",
    status: "pending",
  },
  products: [
    {
      amount: 1,
      id: "Ri9Nq5c1e1a7ejgKB0y4",
      productId: "9FOKcR4v71tefaaEvPHc",
    },
  ],
};

process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";

// Initialize Firebase Admin SDK
initializeApp({
  projectId: "discord-community-dev",
});

// Get firestore
const db = getFirestore();
// Function to upload a file
async function onNewSale(): Promise<void> {
  try {
    // Add a new document with a generated id.
    await db.collection("sales").add(doc);

    console.log(`Document inserted`);
  } catch (error) {
    console.error("Error uploading file:", error);
  }
}

onNewSale().catch(console.error);
