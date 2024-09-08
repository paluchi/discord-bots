import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const doc = {
  id: "muTMc4JUXa7y7fT0akxh",
  clientId: "j7DF4TsfdTyWRpDsLbMt",
  details: {
    backofficeCommunicationGatewayId: "1282048473642045611",
    salesmanCommunicationGatewayId: "1282047969981501520",
    processVersion: 1,
    salesmanId: "1273735778417250399",
    status: "processing",
    transactionalStatus: "send-backoffice-message",
  },
};

process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";

// Initialize Firebase Admin SDK
initializeApp();

// Get firestore
const db = getFirestore();
// Function to upload a file
async function onNewSale(): Promise<void> {
  try {
    // Get a reference to the document with the custom ID
    const docRef = db.collection("sales").doc(doc.id);

    // Set the document data using the custom ID
    await docRef.set(doc);

    const insertedDoc = await docRef.get();
    if (insertedDoc.exists) {
      console.log("Document read back successfully:", insertedDoc.data());
    } else {
      console.log("Document not found after insertion");
    }

    console.log(`Document inserted into sales collection`);
  } catch (error) {
    console.error("Error inserting file:", error);
  }
}

onNewSale().catch(console.error);
