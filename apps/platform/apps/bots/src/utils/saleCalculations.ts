import { Sale } from "@platform/core/domain/sale";

/** Calculates the total points from all products in the sale. */
export function calculateTotalPoints(sale: Sale): number {
  return sale.products.reduce(
    (total, product) => total + product.productDetails.points,
    0
  );
}

/** Calculates the total commission from all products in the sale. */
export function calculateTotalCommission(sale: Sale): number {
  return sale.products.reduce(
    (total, product) => total + product.productDetails.salesmanComission,
    0
  );
}

/**
 * Calculates the final shipping cost by finding the maximum shipping cost
 * across all products.
 */
export function calculateFinalShippingCost(sale: Sale): number {
  return sale.products.reduce(
    (maxCost, product) =>
      Math.max(maxCost, product.productDetails.shippingCost),
    0
  );
}

/**
 * Calculates the final cost, which is the sum of all product prices plus the
 * final shipping cost.
 */
export function calculateFinalCost(sale: Sale): number {
  const totalProductCost = sale.products.reduce(
    (total, product) => total + product.productDetails.price,
    0
  );
  const finalShippingCost = calculateFinalShippingCost(sale);
  return totalProductCost + finalShippingCost;
}
