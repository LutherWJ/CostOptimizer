export class PriceTransformer {
  /**
   * Transforms provider results into repository-compatible objects.
   * Can handle normalization of currency, cleaning URLs, or other logic.
   */
  transformPrice(skuId: string, providerResult: {
    vendor: string;
    price_usd: number;
    purchase_url: string;
    is_refurbished: boolean;
  }) {
    return {
      laptop_sku_id: skuId,
      vendor: providerResult.vendor,
      price_usd: providerResult.price_usd,
      purchase_url: providerResult.purchase_url,
      is_refurbished: providerResult.is_refurbished
    };
  }
}
