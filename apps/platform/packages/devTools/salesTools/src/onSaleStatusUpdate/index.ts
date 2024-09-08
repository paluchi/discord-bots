import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const doc = {
  id: "GhJEGOvi6tcPnIAJ7kKb",
  details: {
    // backofficeCancelReason: "Some reason for cancellation",
    // backofficeUpdateRequest: "Some update request from the backoffice",
    // salesmanUpdateRequest: "Some update request from the backoffice",
  },
  status: "processing",
  transactionalStatus: "send-backoffice-message",
};

process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";

// Initialize Firebase Admin SDK
initializeApp();

// Get firestore
const db = getFirestore();

// Function to upload a file
async function onSaleUpdate(): Promise<void> {
  try {
    // Update or create a document with merge option
    const docRef = db.collection("sales").doc(doc.id);
    await docRef.set(doc, { merge: true });

    console.log(`Document merged or inserted`);
  } catch (error) {
    console.error("Error uploading file:", error);
  }
}

onSaleUpdate().catch(console.error);
