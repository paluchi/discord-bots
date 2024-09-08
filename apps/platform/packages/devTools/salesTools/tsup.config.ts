import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["./src/onNewSale/index.ts", "./src/onSaleStatusUpdate/index.ts"],
  format: ["esm"],
  target: "node18",
  clean: true,
  sourcemap: true,
  /**
   * The common package is using the internal packages approach, so it needs to
   * be transpiled / bundled together with the deployed code.
   */
  noExternal: [
    "@platform/adapters",
    "@platform/core",
    "@platform/shared",
    "@platform/shared-context",
  ],
  /**
   * Do not use tsup for generating d.ts files because it can not generate type
   * the definition maps required for go-to-definition to work in our IDE. We
   * use tsc for that.
   */
});
