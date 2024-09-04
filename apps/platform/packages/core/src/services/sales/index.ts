import { Sale } from "../../domain/sale";
import { SalesService as ISalesService, SaleData } from "../types.services";
import {
  AddStockError,
  CatalogueRepository,
  SalesRepository as ISalesRepository,
  SaleInput,
} from "../types.repositories";

export class SalesService implements ISalesService {
  private salesRepository: ISalesRepository;
  private catalogueRepository: CatalogueRepository;

  constructor(
    salesRepository: ISalesRepository,
    catalogueRepository: CatalogueRepository
  ) {
    this.salesRepository = salesRepository;
    this.catalogueRepository = catalogueRepository;
  }

  async getSaleById(id: string): Promise<Sale> {
    try {
      return await this.salesRepository.getSaleById(id);
    } catch (error) {
      console.error(`Error fetching sale with id ${id}:`, error);
      throw new Error(`Failed to fetch sale: ${(error as Error).message}`);
    }
  }

  async createSale(
    saleData: SaleData
  ): Promise<{ success: boolean; sale?: Sale; errors?: AddStockError[] }> {
    try {
      // Consume stock from the catalogue
      // Make negative the amount of stock to add to the catalogue
      const processRes = await this.catalogueRepository.addStock(
        saleData.products.map((p) => ({
          productId: p.productId,
          amount: -p.amount,
        }))
      );

      if (!processRes.success) {
        return { success: false, errors: processRes.errors };
      }

      const newSale = {
        ...saleData,
        details: {
          ...(saleData.details || {}),
          "backoffice-communicated": false,
        },
        status: "pending",
        createDate: new Date(),
      } as any;

      const sale = await this.salesRepository.storeSale(newSale);

      return { success: true, sale };
    } catch (error) {
      console.error("Error creating sale:", error);
      throw new Error(`Failed to create sale: ${(error as Error).message}`);
    }
  }

  async updateSale(id: string, saleData: Partial<SaleInput>): Promise<Sale> {
    try {
      const updatedSale: Partial<Sale> = { ...saleData, id };
      return await this.salesRepository.updateSale(id, updatedSale);
    } catch (error) {
      console.error(`Error updating sale with id ${id}:`, error);
      throw new Error(`Failed to update sale: ${(error as Error).message}`);
    }
  }
}

export default SalesService;
