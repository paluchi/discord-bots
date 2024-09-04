import { BackofficeCatalogueService as IBackofficeCatalogueServiceI } from "./types";
import {
  BackofficeCatalogueRepository as IBackofficeCatalogueRepository,
  CatalogueRepository as ICatalogueRepository,
} from "../types.repositories";
import { Product } from "../../domain/catalogue";
import { BackofficeProduct } from "../../domain/backofficeCatalogue";

class BackofficeCatalogueService implements IBackofficeCatalogueServiceI {
  catalogueRepository: ICatalogueRepository;
  backofficeCatalogueRepository: IBackofficeCatalogueRepository;

  constructor(
    catalogueRepository: ICatalogueRepository,
    backofficeCatalogueRepository: IBackofficeCatalogueRepository
  ) {
    this.catalogueRepository = catalogueRepository;
    this.backofficeCatalogueRepository = backofficeCatalogueRepository;
  }

  async syncCatalogue(): Promise<void> {
    const newCatalogueGenerated =
      await this.backofficeCatalogueRepository.generateNewCatalogue();
    console.log("New front catalogue generated:", newCatalogueGenerated);

    let backofficeCatalogue =
      await this.backofficeCatalogueRepository.getCatalogueData();

    let frontCatalogue = await this.catalogueRepository.getFullCatalogue();

    // Get new categories
    const newCategories = backofficeCatalogue.categories.filter(
      (category) => !category.id
    );
    console.info(`New categories: ${newCategories.length}`);

    // Not going to process deleted categories for now as I want to keep history

    // Get updated categories
    const updatedCategories = backofficeCatalogue.categories.filter(
      (category) => category.id
    );
    console.info(`Updated categories: ${updatedCategories.length}`);

    // For updated categories, get new products
    await Promise.all(
      updatedCategories.map(async (category) => {
        // For updated categories, get new products
        const newProducts = category.products.filter((p) => !p.id);
        console.info(
          `New products for category ${category.name}: ${newProducts.length}`
        );

        // Not going to process deleted products for now as I want to keep history

        // For updated categories, get updated products
        const updatedProducts = category.products.filter((p) => p.id);
        console.info(
          `Updated products for category ${category.name}: ${updatedProducts.length}`
        );

        // Add new products
        await Promise.all(
          newProducts.map(async (p) => {
            // Filter out omitProductFields from product
            const product = (
              Object.keys(p) as Array<keyof BackofficeProduct>
            ).reduce((acc: Product, key) => {
              if (!["pushStock", "id"].includes(key)) {
                (acc as any)[key] = p[key];
              }
              return acc;
            }, {} as Product);

            const productRes =
              await this.catalogueRepository.addProductToCategory({
                ...product,
                categoryId: category.id!,
                createDate: new Date(),
              });
            await this.backofficeCatalogueRepository.updateProductId(
              p.backofficeId,
              productRes.id
            );
          })
        );

        // For every updated product, create object with updated fields and update
        for (const product of updatedProducts) {
          const oldProduct = frontCatalogue.categories
            .find((c) => c.id === category.id)
            ?.products.find((p) => p.id === product.id)!;

          if (!oldProduct) {
            console.log("Old product not found", product.name, category.name);
            continue;
          }

          const updatedFields = (
            Object.keys(product) as Array<keyof Product>
          ).reduce((acc: Partial<Product>, key) => {
            if (
              !["pushStock", "stock"].includes(
                key as keyof BackofficeProduct
              ) &&
              oldProduct[key] !== product[key as keyof BackofficeProduct]
            ) {
              (acc as any)[key] = product[key as keyof BackofficeProduct];
            }
            return acc;
          }, {} as Partial<Product>);

          if (Object.keys(updatedFields).length > 0) {
            await this.catalogueRepository.updateProduct(product.id!, {
              ...updatedFields,
            });
          }
        }
      })
    );

    // Add new categories
    await Promise.all(
      newCategories.map(async (category) => {
        const newCategory = await this.catalogueRepository.addCategory({
          ...category,
          products: category.products.map((p) => {
            const product = (Object.keys(p) as Array<keyof Product>).reduce(
              (acc: Product, key) => {
                if (
                  !["pushStock", "id", "categoryId"].includes(
                    key as keyof BackofficeProduct
                  )
                ) {
                  (acc as any)[key] = p[key as keyof BackofficeProduct];
                }
                return acc;
              },
              {} as Product
            );
            return {
              ...product,
              createDate: new Date(),
            };
          }),
          createDate: new Date(),
        });
        await this.backofficeCatalogueRepository.updateCategoryId(
          category.backofficeId,
          newCategory.id
        );
        newCategory.products.forEach(async (p) => {
          await this.backofficeCatalogueRepository.updateProductId(
            p.backofficeId,
            p.id
          );
        });
      })
    );

    backofficeCatalogue =
      await this.backofficeCatalogueRepository.getCatalogueData();

    // For all products with pushStock > 0, push stock
    const flattenedBackofficeProducts = backofficeCatalogue.categories.flatMap(
      (c) => c.products
    );
    const productsToPushStock = flattenedBackofficeProducts.filter(
      (p) => p.pushStock > 0
    );

    console.log(`Products to push stock: ${productsToPushStock.length}`);
    await Promise.all(
      productsToPushStock.map(async (p) => {
        if (p.id)
          await this.pushStockToProduct(p.id, p.backofficeId, p.pushStock);
      })
    );

    frontCatalogue = await this.catalogueRepository.getFullCatalogue();

    // For all products from front catalogue, update stock into backoffice catalogue
    const productsToUpdateStock = frontCatalogue.categories
      .flatMap((c) => c.products)
      .filter((p) => flattenedBackofficeProducts.find((fp) => fp.id === p.id));

    await Promise.all(
      productsToUpdateStock.map(async (p) => {
        await this.backofficeCatalogueRepository.updateDisplayedProductStock(
          p.backofficeId,
          p.stock
        );
      })
    );
  }

  private async pushStockToProduct(
    productId: string,
    backofficeProductId: string,
    stock: number
  ): Promise<void> {
    await this.catalogueRepository.addStock([{ productId, amount: stock }]);
    await this.backofficeCatalogueRepository.restartStockToPush(
      backofficeProductId
    );
  }
}

export default BackofficeCatalogueService;
