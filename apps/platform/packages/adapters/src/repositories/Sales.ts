import { Sale, SaleProduct } from "@platform/core/domain/sale";
import {
  ClientRepository,
  SalesRepository as ISalesRepository,
  SaleInput,
  SalesmanRepository,
} from "@platform/core/services/types.repositories";
import SaleModel, { FirestoreSale } from "@platform/database/models/Sale";
import { BaseFirestoreRepository } from "fireorm";
import { parseToDate, parseToFirestoreTimestamp } from "./utils";

export class SalesRepository implements ISalesRepository {
  private saleRepository: BaseFirestoreRepository<SaleModel>;
  private clientRepository: ClientRepository;
  private salesmanRepository: SalesmanRepository;

  constructor(
    saleRepository: BaseFirestoreRepository<SaleModel>,
    clientRepository: ClientRepository,
    salesmanRepository: SalesmanRepository
  ) {
    this.saleRepository = saleRepository;
    this.clientRepository = clientRepository;
    this.salesmanRepository = salesmanRepository;
  }

  async getSaleById(id: string): Promise<Sale> {
    const sale = await this.saleRepository.findById(id);
    if (!sale) throw new Error(`Sale with id ${id} not found`);
    return this.mapToDomain(sale);
  }

  async storeSale(saleData: SaleInput): Promise<Sale> {
    const { products, ...saleWithoutProducts } = saleData;

    const firestoreSale: Omit<FirestoreSale, "id"> = {
      ...saleWithoutProducts,
      createDate: parseToFirestoreTimestamp(saleData.createDate),
    };

    // Create a new sale without products first
    const createdSale = await this.saleRepository.create(firestoreSale);

    // Now add products to the subcollection
    if (products && products.length > 0) {
      const productsSubcollection = createdSale.products;
      if (productsSubcollection) {
        for (const product of products) {
          await productsSubcollection.create(product);
        }
      }
    }

    return this.mapToDomain(createdSale);
  }

  async updateSale(
    saleId: string,
    saleData: Partial<SaleInput>
  ): Promise<Sale> {
    const existingSale = await this.saleRepository.findById(saleId);
    if (!existingSale) throw new Error("Sale not found");

    const updatedSale = await this.updateFirestoreSale(existingSale, saleData);
    return this.mapToDomain(updatedSale);
  }

  private async updateFirestoreSale(
    existingSale: FirestoreSale,
    updateData: Partial<SaleInput>
  ): Promise<FirestoreSale> {
    const { products, ...updateWithoutProducts } = updateData;

    // Update main sale document
    const updatedSale = await this.saleRepository.update({
      ...existingSale,
      ...updateWithoutProducts,
      details: {
        ...(existingSale.details || {}),
        ...(updateWithoutProducts.details || {}),
      },
      createDate: existingSale.createDate, // Ensure createDate doesn't get overwritten
    });

    // Update products if provided
    if (products) {
      const productsSubcollection = updatedSale.products;
      if (productsSubcollection) {
        // Clear existing products
        const existingProducts = await productsSubcollection.find();
        for (const product of existingProducts) {
          await productsSubcollection.delete(product.id);
        }
        // Add new products
        for (const product of products) {
          await productsSubcollection.create(product);
        }
      }
    }

    return updatedSale;
  }

  private async mapToDomain(firestoreSale: FirestoreSale): Promise<Sale> {
    let products: SaleProduct[] = [];
    if (firestoreSale.products) {
      products = await firestoreSale.products.find();
    }

    const client = await this.clientRepository.findById(firestoreSale.clientId);
    const salesman = await this.salesmanRepository.findById(
      firestoreSale.salesmanId
    );

    return {
      ...firestoreSale,
      createDate: parseToDate(firestoreSale.createDate)!,
      products: products,
      client: client,
      salesman: salesman,
    };
  }
}

export default SalesRepository;
