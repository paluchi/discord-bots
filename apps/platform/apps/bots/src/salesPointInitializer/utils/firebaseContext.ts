import envs from "@platform/shared/env";

import * as fireorm from "fireorm";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { CatalogueRepository } from "@platform/adapters/repositories/Catalogue";
import BackofficeCatalogueService from "@platform/core/services/backofficeCatalogue";
import BackofficeCatalogueRepository from "@platform/adapters/repositories/BackofficeCatalogue";
import { getCatalogueFirebaseRepository } from "@platform/database/models/Catalogue";
import { getProductFirebaseRepository } from "@platform/database/models/Product";

export {
  BackofficeCatalogueService,
  BackofficeCatalogueRepository,
  getCatalogueFirebaseRepository,
  getProductFirebaseRepository,
};

let initialized = false;

let BackofficeCatalogueServiceInstance: BackofficeCatalogueService | null =
  null;

const initialize = async () => {
  if (initialized) return;

  await initializeFirebaseApp();
  const firestoreInstance = initializeFirestore();
  fireorm.initialize(firestoreInstance);

  console.log("Initialized Firebase and Firestore");
  initialized = true;
};

const initializeFirebaseApp = async () => {
  if (envs.AUTH_ENV === "local") {
    return initializeApp({ projectId: envs.LOCAL_PROJECT_ID });
  } else if (envs.AUTH_ENV === "cloud") {
    const serviceAccount = envs.GC_ACCOUNT_SERVICE;
    return initializeApp({ credential: cert(serviceAccount) });
  }
  throw new Error("Invalid AUTH_ENV value");
};

const initializeFirestore = () => {
  const firestoreInstance = getFirestore();
  firestoreInstance.settings({ ignoreUndefinedProperties: true });

  if (envs.FIRESTORE_ENV === "local") {
    firestoreInstance.settings({ host: "localhost:8080", ssl: false });
    console.log("Firestore connected to local emulator");
  }

  return firestoreInstance;
};

const createRepositories = () => {
  const catalogueRepository = getCatalogueFirebaseRepository();
  const productRepository = getProductFirebaseRepository();

  return {
    catalogueRepository: new CatalogueRepository(
      catalogueRepository,
      productRepository,
      envs.CATALOGUE_ID
    ),
    backofficeCatalogueRepository: new BackofficeCatalogueRepository({
      catalogueId: envs.CATALOGUE_ID,
      clientEmail: envs.GC_SHEET_SERVICE_ACCOUNT_EMAIL,
      privateKey: envs.GC_SHEET_SERVICE_ACCOUNT_PRIVATE_KEY,
      catalogueRepo: catalogueRepository,
    }),
  };
};

export const getBackofficeCatalogueService =
  async (): Promise<BackofficeCatalogueService> => {
    if (!BackofficeCatalogueServiceInstance) {
      await initialize();
      const { catalogueRepository, backofficeCatalogueRepository } =
        createRepositories();
      BackofficeCatalogueServiceInstance = new BackofficeCatalogueService(
        catalogueRepository,
        backofficeCatalogueRepository
      );
    }
    return BackofficeCatalogueServiceInstance;
  };
