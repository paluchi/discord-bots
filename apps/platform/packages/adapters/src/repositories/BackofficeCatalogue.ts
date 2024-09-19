import { google, sheets_v4 } from "googleapis";
import {
  BackofficeCatalogue,
  BackofficeCategory,
  BackofficeProduct,
} from "@platform/core/domain/backofficeCatalogue";
import { BackofficeCatalogueRepository as IBackofficeCatalogueRepository } from "@platform/core/services/types.repositories";
import { BaseFirestoreRepository, ISubCollection } from "fireorm";
import CatalogueModel, {
  CategoryModel,
} from "@platform/database/models/Catalogue";
import { parseToFirestoreTimestamp } from "./utils";

export class BackofficeCatalogueRepository
  implements IBackofficeCatalogueRepository
{
  private catalogueId: string;
  private sheetsClient: sheets_v4.Sheets | undefined;

  private catalogueRepo: BaseFirestoreRepository<CatalogueModel>;

  constructor(props: {
    catalogueRepo: BaseFirestoreRepository<CatalogueModel>;
    catalogueId: string;
    clientEmail: string;
    privateKey: string;
  }) {
    this.catalogueId = props.catalogueId;
    this.catalogueRepo = props.catalogueRepo;

    // Authenticate with the Google Sheets API
    const credentials = {
      client_email: props.clientEmail,
      private_key: props.privateKey,
    };

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    this.sheetsClient = google.sheets({ version: "v4", auth });
  }

  private async getStructuredCatalogue(): Promise<BackofficeCatalogue> {
    // Get the catalogue from the Google Sheets API
    const response = await this.sheetsClient?.spreadsheets.values.get({
      spreadsheetId: this.catalogueId,
      range: "catalogue!A:Z",
    });

    if (!response?.data?.values)
      throw new Error("No data found in the catalogue spreadsheet");

    // Extract first row as headers
    const headers = response?.data?.values?.shift();
    // Create key:value object for headers row splitting by ":"
    const headersMap = headers?.reduce((acc: any, header: string) => {
      const [key, value] = header.split(":");
      acc[key] = value;
      return acc;
    }, {});

    // Shift first column as it contains the ids
    const idsByRowIndex: (string | undefined)[] = [];
    const rows = response?.data?.values?.map((row) => {
      idsByRowIndex.push(row[0]);
      return row.slice(1);
    });

    if (!rows || rows.length === 0) {
      return { categories: [] } as any as BackofficeCatalogue;
    }

    const categories: BackofficeCategory[] = [];
    let currentCategory: BackofficeCategory | null = null;

    for (const row of rows) {
      // If row is empty, skip it
      if (!row.length) continue;

      const rowIndex = rows.indexOf(row);
      const backofficeId = `${rowIndex + 2}`;
      const rowId = idsByRowIndex[rowIndex]!;

      if (row[0].startsWith("category")) {
        if (currentCategory) {
          categories.push(currentCategory);
        }
        const [_, categoryName] = row[0].split(":");
        currentCategory = {
          id: rowId,
          name: categoryName,
          description: "",
          products: [],
          backofficeId: backofficeId,
        };
      } else {
        let [
          name,
          description,
          price,
          shippingCost,
          salesmanCom,
          points,
          stock,
          pushStock,
          display,
        ] = row;

        price = price !== undefined ? parseFloat(price) : price;
        stock = stock !== undefined ? parseFloat(stock) : stock;
        shippingCost =
          shippingCost !== undefined ? parseFloat(shippingCost) : shippingCost;
        salesmanCom =
          salesmanCom !== undefined ? parseFloat(salesmanCom) : salesmanCom;
        points = points !== undefined ? parseFloat(points) : points;
        pushStock = pushStock !== undefined ? parseFloat(pushStock) : pushStock;

        if (!name) {
          console.info("Invalid product: name is missing", name);
          continue;
        }
        if (!price || isNaN(price) || price <= 0) {
          console.info("Invalid product: invalid price", price);
          continue;
        }
        if (stock === undefined || isNaN(stock)) {
          console.info("Invalid product: invalid stock", stock);
          continue;
        }
        if (shippingCost === undefined || isNaN(shippingCost)) {
          console.info("Invalid product: invalid shipping cost", shippingCost);
          continue;
        }
        if (!salesmanCom || isNaN(salesmanCom) || salesmanCom <= 0) {
          console.info(
            "Invalid product: invalid salesman commission",
            salesmanCom
          );
          continue;
        }
        if (points === undefined || isNaN(points)) {
          console.info("Invalid product: invalid points", points);
          continue;
        }
        if (pushStock === undefined || isNaN(pushStock)) {
          console.info("Invalid product: invalid pushStock", pushStock);
          continue;
        }

        const product: BackofficeProduct = {
          id: rowId,
          categoryId: currentCategory?.id ?? "",
          name: name,
          description: description || "",
          price: price,
          points: points || 0,
          stock: stock,
          display: display === "YES",
          shippingCost: shippingCost || 0,
          salesmanComission: salesmanCom || 0,
          pushStock: pushStock || 0,
          backofficeId: backofficeId,
        };
        currentCategory?.products.push(product);
      }
    }

    if (currentCategory) {
      categories.push(currentCategory);
    }

    // Filter out categories with repeated ids (mantain the first one)
    const uniqueCategories = categories.filter(
      (category, index, self) =>
        category.id === "" ||
        index ===
          self.findIndex(
            (t) => t.id === category.id && t.name === category.name
          )
    );
    // For each category, filter out products with repeated ids (mantain the first one)
    uniqueCategories.forEach((category) => {
      category.products = category.products.filter((product, index, self) => {
        return (
          product.id === "" ||
          index === self.findIndex((t) => t.id === product.id)
        );
      });
    });

    return {
      categories: uniqueCategories,
      name: headersMap.name,
      description: headersMap.description,
      id: this.catalogueId,
    } as any as BackofficeCatalogue;
  }

  public async getCatalogueData(): Promise<BackofficeCatalogue> {
    return this.getStructuredCatalogue();
  }

  public async generateNewCatalogue(): Promise<boolean> {
    // Check if already exists a catalogue with the same name
    const existingCatalogue = await this.catalogueRepo.findById(
      this.catalogueId
    );

    const catalogue = await this.getStructuredCatalogue();

    if (existingCatalogue) return false;

    const newCatalogue: CatalogueModel = {
      id: this.catalogueId,
      name: catalogue.name,
      description: catalogue.description,
      createDate: parseToFirestoreTimestamp(new Date()),
      categories: {} as ISubCollection<CategoryModel>, // Initialize as empty subcollection
    };

    await this.catalogueRepo.create(newCatalogue);
    console.info(
      `Created new catalogue: ${newCatalogue.name} - ${newCatalogue.id}`
    );

    return true;
  }

  public async updateProductId(backofficeId: string, id: string) {
    // Update row number backofficeId with the new id
    await this.sheetsClient?.spreadsheets.values.update({
      spreadsheetId: this.catalogueId,
      range: `catalogue!A${backofficeId}:A${backofficeId}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[id]],
      },
    });
  }

  public async updateCategoryId(backofficeId: string, id: string) {
    // Update row number backofficeId with the new id
    await this.sheetsClient?.spreadsheets.values.update({
      spreadsheetId: this.catalogueId,
      range: `catalogue!A${backofficeId}:A${backofficeId}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[id]],
      },
    });
  }

  public async restartStockToPush(backofficeId: string) {
    // Update pushStock column to 0
    await this.sheetsClient?.spreadsheets.values.update({
      spreadsheetId: this.catalogueId,
      range: `catalogue!I${backofficeId}:I${backofficeId}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [["0"]],
      },
    });
  }

  public async updateDisplayedProductStock(
    backofficeId: string,
    stock: number
  ) {
    // Update stock column with the new stock
    await this.sheetsClient?.spreadsheets.values.update({
      spreadsheetId: this.catalogueId,
      range: `catalogue!H${backofficeId}:H${backofficeId}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[stock]],
      },
    });
  }
}

export default BackofficeCatalogueRepository;
