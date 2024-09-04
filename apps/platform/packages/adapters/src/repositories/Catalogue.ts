import { BaseFirestoreRepository } from "fireorm";
import { Catalogue, Category, Product } from "@platform/core/domain/catalogue";
import {
  AddCategoryInput,
  AddStockError,
  CatalogueRepository as ICatalogueRepository,
} from "@platform/core/services/types.repositories";
import ProductModel, { FirestoreProduct } from "@platform/database/models/Product";
import CatalogueModel, { FirestoreCategory } from "@platform/database/models/Catalogue";
import { parseToDate, parseToFirestoreTimestamp } from "./utils";

export class CatalogueRepository implements ICatalogueRepository {
  private catalogueRepo: BaseFirestoreRepository<CatalogueModel>;
  private productRepo: BaseFirestoreRepository<ProductModel>;
  private catalogueId: string;

  constructor(
    catalogueRepository: BaseFirestoreRepository<CatalogueModel>,
    productRepository: BaseFirestoreRepository<ProductModel>,
    catalogueId: string
  ) {
    this.catalogueRepo = catalogueRepository;
    this.productRepo = productRepository;
    this.catalogueId = catalogueId;
  }

  public async getFullCatalogue(): Promise<Catalogue> {
    const catalogues = await this.catalogueRepo.findById(this.catalogueId);

    const categories = (await catalogues.categories?.find()) ?? [];

    const hidratedCategories = await Promise.all(
      categories.map(async (category) => {
        const hidratedCategory = await this.getCategoryById(category.id);
        return hidratedCategory!;
      })
    );

    return {
      id: catalogues.id,
      createDate: parseToDate(catalogues.createDate)!,
      name: catalogues.name,
      description: catalogues.description,
      categories: hidratedCategories,
    };
  }

  public async getCategoriesNames(): Promise<{ name: string }[]> {
    const catalogue = await this.catalogueRepo.findById(this.catalogueId);
    const cateogories = catalogue.categories
      ? await catalogue.categories.find()
      : [];
    return cateogories.map((category) => ({ name: category.name }));
  }

  public async getProductById(productId: string): Promise<Product | undefined> {
    const productRepo = await this.productRepo.findById(productId);

    if (!productRepo) return;

    return this.mapProductToDomain(productRepo);
  }

  public async getCategoryById(id: string): Promise<Category> {
    const catalogueRes = await this.catalogueRepo.findById(this.catalogueId);
    if (!catalogueRes) throw new Error("Catalogue not found");

    const categoryRes = await catalogueRes.categories?.findById(id);

    if (!categoryRes) throw new Error("Category not found");

    const categoryProducts = await this.getCategoryProducts(id);

    const category = this.mapCategoryToDomain(categoryRes, {
      products: categoryProducts,
    });

    return category;
  }

  public async updateCatalogue(catalogue: Partial<Catalogue>): Promise<void> {
    throw new Error("Not implemented");
  }

  public async getCategoryProducts(categoryId: string): Promise<Product[]> {
    // From products repo, get all products with categoryId
    const products = await this.productRepo
      .whereEqualTo("categoryId", categoryId)
      .find();

    if (!products) throw new Error("Products not found");

    return products.map((product) => this.mapProductToDomain(product));
  }

  public async addStock(
    products: {
      productId: string;
      amount: number;
    }[]
  ): Promise<{
    success: boolean;
    errors?: AddStockError[];
  }> {
    const errors: AddStockError[] = [];
    const productUpdates: {
      productId: string;
      newStock: number;
    }[] = [];

    try {
      await this.productRepo.runTransaction(async (transactionRepo) => {
        // First, read all products within the transaction
        for (const { productId, amount } of products) {
          const product = await transactionRepo.findById(productId);
          if (!product) {
            errors.push({
              productId,
              code: "NOT_FOUND",
              details: { message: `Product with id ${productId} not found` },
            });
            throw new Error("Product not found"); // Trigger rollback
          }

          const newStock = (product.stock || 0) + amount;
          if (newStock < 0) {
            errors.push({
              productId,
              code: "NEGATIVE_STOCK",
              details: { message: "Stock cannot be negative" },
            });
            throw new Error("Negative stock"); // Trigger rollback
          }

          // Store the calculated new stock for later update
          productUpdates.push({ productId, newStock });
        }

        // After all reads are done, perform the updates
        for (const { productId, newStock } of productUpdates) {
          await transactionRepo.update({
            id: productId,
            stock: newStock,
          });
        }
      });

      if (errors.length > 0) {
        return { success: false, errors };
      }

      return { success: true, errors: [] };
    } catch (error) {
      console.log("error adding stock", error);
      return { success: false, errors };
    }
  }

  public async addCategory(category: AddCategoryInput): Promise<Category> {
    const catalogueDoc = await this.catalogueRepo.findById(this.catalogueId);

    const { products, ...categoryData } = category;

    // Add the category to the catalogue
    const categoryDoc = await catalogueDoc.categories.create({
      ...categoryData,
      createDate: parseToFirestoreTimestamp(category.createDate),
    });

    const productsRes = await Promise.all(
      products.map((product) =>
        this.addProductToCategory({
          ...product,
          categoryId: categoryDoc.id,
        })
      )
    );

    return this.mapCategoryToDomain(categoryDoc, {
      products: productsRes,
    });
  }

  public async addProductToCategory(
    productData: Omit<Product, "id">
  ): Promise<Product> {
    const product = await this.productRepo.create({
      ...productData,
      createDate: parseToFirestoreTimestamp(productData.createDate),
    });

    return this.mapProductToDomain(product);
  }

  public async updateProduct(
    productId: string,
    productData: Partial<Omit<Product, "createDate">>
  ): Promise<void> {
    // Fetch the existing product
    const existingProduct = await this.productRepo.findById(productId);

    if (!existingProduct) {
      throw new Error("Product not found");
    }

    // Merge the existing product data with the new data, ensuring createDate is preserved
    const updatedProduct = {
      ...existingProduct,
      ...productData,
    };

    // Perform the update
    await this.productRepo.update(updatedProduct);
  }

  private mapProductToDomain(doc: FirestoreProduct): Product {
    return {
      ...doc,
      createDate: parseToDate(doc.createDate)!,
    };
  }

  private mapCategoryToDomain(
    doc: FirestoreCategory,
    extras: {
      rawProducts?: FirestoreProduct[];
      products?: Product[];
    }
  ): Category {
    return {
      id: doc.id,
      createDate: parseToDate(doc.createDate)!,
      name: doc.name,
      description: doc.description,
      backofficeId: doc.backofficeId,
      products:
        extras.products ||
        extras.rawProducts?.map(this.mapProductToDomain) ||
        [],
    };
  }
}

export default CatalogueRepository;
