import { Collection, getRepository } from "fireorm";
import { firestore } from "firebase-admin";
import { Client } from "@platform/core/domain/client";

// Define the FirestoreClient interface
export interface FirestoreClient extends Omit<Client, "createDate"> {
  id: string;
  createDate: firestore.Timestamp;
}

@Collection("clients")
export class ClientModel implements FirestoreClient {
  id!: string;
  name!: string;
  phoneNumber!: string;
  email!: string;
  address!: string;
  addressNotes!: string;
  createDate!: firestore.Timestamp;
  details?: Record<string, any>;
  salesmanId!: string;
}

export default ClientModel;

export const getClientsFirebaseRepository = () => getRepository(ClientModel);
