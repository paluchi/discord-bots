import { Catalogue, Category, Product } from "../../domain/catalogue";
import { CatalogueService as ICatalogueService } from "./types";
import { CatalogueRepository as ICatalogueRepository } from "../types.repositories";

class CatalogueService implements ICatalogueService {
  catalogueRepository: ICatalogueRepository;
  catalogueId: string;

  constructor(catalogueRepository: ICatalogueRepository, catalogueId: string) {
    this.catalogueRepository = catalogueRepository;
    this.catalogueId = catalogueId;
  }

  async getFullCatalogue(): Promise<Catalogue> {
    return this.catalogueRepository.getFullCatalogue();
  }

  async getProductsByCategory(categoryId: string): Promise<Product[]> {
    throw new Error("Not implemented");
  }

  async checkProductStock(productId: string): Promise<number> {
    throw new Error("Not implemented");
  }

  async getCategoryDetails(categoryId: string): Promise<Category> {
    throw new Error("Not implemented");
  }

  async getProductDetails(productId: string): Promise<Product> {
    throw new Error("Not implemented");
  }
}

export default CatalogueService;
