// ─── Perrito Fit – Open Food Facts Service ────────────────────────────────────

import type { OpenFoodFactsResult } from '../types';
import { getCachedProduct, cacheProduct } from './foodCacheService';

const BASE_URL = 'https://world.openfoodfacts.org/api/v3/product';

/**
 * Fetch product nutritional data from the Open Food Facts API.
 * @param barcode - The product barcode (EAN-13, UPC-A, etc.)
 * @returns Product data or null if not found
 */
export async function fetchProductByBarcode(
  barcode: string,
): Promise<OpenFoodFactsResult | null> {
  try {
    const cached = await getCachedProduct(barcode);
    if (cached) return cached;

    const res = await fetch(`${BASE_URL}/${barcode}.json`, {
      headers: {
        'User-Agent': 'PerritoFit/1.0 (health-tracker-app)',
      },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const product = data?.product;

    if (!product) return null;

    const nutriments = product.nutriments || {};

    const result = {
      barcode,
      name: product.product_name || product.product_name_en || 'Unknown Product',
      brand: product.brands || undefined,
      servingSize: product.serving_size || undefined,
      calories: Math.round(nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0),
      protein: Math.round((nutriments.proteins_100g || nutriments.proteins || 0) * 10) / 10,
      carbs: Math.round((nutriments.carbohydrates_100g || nutriments.carbohydrates || 0) * 10) / 10,
      fat: Math.round((nutriments.fat_100g || nutriments.fat || 0) * 10) / 10,
      sodium: Math.round((nutriments.sodium_100g || nutriments.sodium || 0) * 1000 * 10) / 10, // Convert g to mg
      cholesterol: Math.round((nutriments['cholesterol_100g'] || 0) * 1000 * 10) / 10, // Convert g to mg
      sugars: Math.round((nutriments.sugars_100g || nutriments.sugars || 0) * 10) / 10,
      fiber: Math.round((nutriments.fiber_100g || nutriments.fiber || 0) * 10) / 10,
      imageUrl: product.image_front_url || product.image_url || undefined,
    };

    await cacheProduct(result);
    return result;
  } catch (error) {
    console.error('Open Food Facts API error:', error);
    return null;
  }
}
