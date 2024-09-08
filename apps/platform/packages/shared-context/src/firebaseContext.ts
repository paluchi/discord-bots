import * as fireorm from "fireorm";
import envs from "@platform/shared/env";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import SalesmanService from "@platform/core/services/salesman";
import CatalogueService from "@platform/core/services/catalogue";
import { getSalesmanFirebaseReposository } from "@platform/database/models/Salesman";
import { SalesmanRepository } from "@platform/adapters/repositories/Salesman";
import { CatalogueRepository } from "@platform/adapters/repositories/Catalogue";
import SalesService from "@platform/core/services/sales";
import SalesRepository from "@platform/adapters/repositories/Sales";
import { getSalesFirebaseRepository } from "@platform/database/models/Sale";
import { getCatalogueFirebaseRepository } from "@platform/database/models/Catalogue";
import { getProductFirebaseRepository } from "@platform/database/models/Product";
import ClientService from "@platform/core/services/clients";
import { getClientsFirebaseRepository } from "@platform/database/models/Client";
import ClientRepository from "@platform/adapters/repositories/Clients";
import BackofficeCatalogueService from "@platform/core/services/backofficeCatalogue";
import BackofficeCatalogueRepository from "@platform/adapters/repositories/BackofficeCatalogue";

let initialized = false;

let salesmanServiceInstance: SalesmanService | null = null;
let salesServiceInstance: SalesService | null = null;
let catalogueServiceInstance: CatalogueService | null = null;
let clientServiceInstance: ClientService | null = null;
let BackofficeCatalogueServiceInstance: BackofficeCatalogueService | null =
  null;

export const initialize = async () => {
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
  const salesmanFbRepository = getSalesmanFirebaseReposository();

  const salesFbRepository = getSalesFirebaseRepository();

  const catalogueFbRepository = getCatalogueFirebaseRepository();

  const productFbRepository = getProductFirebaseRepository();

  const clientFbRepository = getClientsFirebaseRepository();

  const salesmanRepository = new SalesmanRepository(salesmanFbRepository);
  const clientRepository = new ClientRepository(clientFbRepository);
  const catalogueRepository = new CatalogueRepository(
    catalogueFbRepository,
    productFbRepository,
    envs.CATALOGUE_ID
  );

  return {
    salesmanRepository: salesmanRepository,
    salesRepository: new SalesRepository(
      salesFbRepository,
      catalogueRepository,
      clientRepository,
      salesmanRepository
    ),
    catalogueRepository: catalogueRepository,
    clientRepository: clientRepository,
    backofficeCatalogueRepository: new BackofficeCatalogueRepository({
      catalogueId: envs.CATALOGUE_ID,
      clientEmail: envs.GC_SHEET_SERVICE_ACCOUNT_EMAIL,
      privateKey: envs.GC_SHEET_SERVICE_ACCOUNT_PRIVATE_KEY,
      catalogueRepo: catalogueFbRepository,
    }),
  };
};

export const getSalesmanService = async (): Promise<SalesmanService> => {
  if (!salesmanServiceInstance) {
    await initialize();
    const { salesmanRepository } = createRepositories();
    salesmanServiceInstance = new SalesmanService(salesmanRepository);
  }
  return salesmanServiceInstance;
};

export const getSalesService = async (): Promise<SalesService> => {
  if (!salesServiceInstance) {
    await initialize();
    const { salesRepository, catalogueRepository } = createRepositories();
    salesServiceInstance = new SalesService(
      salesRepository,
      catalogueRepository
    );
  }
  return salesServiceInstance;
};

export const getClientService = async (): Promise<ClientService> => {
  if (!clientServiceInstance) {
    await initialize();
    const { clientRepository } = createRepositories();

    clientServiceInstance = new ClientService(clientRepository);
  }

  return clientServiceInstance;
};

export const getCatalogueService = async (): Promise<CatalogueService> => {
  if (!catalogueServiceInstance) {
    await initialize();
    const { catalogueRepository } = createRepositories();
    catalogueServiceInstance = new CatalogueService(
      catalogueRepository,
      envs.CATALOGUE_ID
    );
  }
  return catalogueServiceInstance;
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
