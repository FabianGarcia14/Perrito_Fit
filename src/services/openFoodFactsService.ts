// ─── Chenna Fit – Open Food Facts Service ────────────────────────────────────

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
    if (cached) {
      if (!cached.servingQuantity && cached.servingSize) {
        const match = cached.servingSize.match(/(\d+(?:\.\d+)?)\s*(g|ml|oz|cups|lbs)/i);
        if (match) {
          cached.servingQuantity = parseFloat(match[1]);
          cached.servingUnit = match[2].toLowerCase();
        }
      } else if (cached.servingQuantity && !cached.servingUnit && cached.servingSize) {
        const match = cached.servingSize.match(/(g|ml|oz|cups|lbs)/i);
        if (match) {
          cached.servingUnit = match[1].toLowerCase();
        }
      }
      return cached;
    }

    const res = await fetch(`${BASE_URL}/${barcode}.json`, {
      headers: {
        'User-Agent': 'ChennaFit/1.0 (health-tracker-app)',
      },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const product = data?.product;

    if (!product) return null;

    const nutriments = product.nutriments || {};

    let servingQuantity = parseFloat(product.serving_quantity);
    let servingUnit = 'g';
    if (isNaN(servingQuantity) && product.serving_size) {
      const match = product.serving_size.match(/(\d+(?:\.\d+)?)\s*(g|ml|oz|cups|lbs)/i);
      if (match) {
        servingQuantity = parseFloat(match[1]);
        servingUnit = match[2].toLowerCase();
      }
    } else if (product.serving_size) {
      // If we have a quantity but need the unit
      const match = product.serving_size.match(/(g|ml|oz|cups|lbs)/i);
      if (match) {
        servingUnit = match[1].toLowerCase();
      }
    }

    const result: any = {
      barcode,
      name: product.product_name || product.product_name_en || 'Unknown Product',
      brand: product.brands || null,
      servingSize: product.serving_size || null,
      servingQuantity: isNaN(servingQuantity) ? null : servingQuantity,
      servingUnit,
      calories: Math.round(nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0),
      protein: Math.round((nutriments.proteins_100g || nutriments.proteins || 0) * 10) / 10,
      carbs: Math.round((nutriments.carbohydrates_100g || nutriments.carbohydrates || 0) * 10) / 10,
      fat: Math.round((nutriments.fat_100g || nutriments.fat || 0) * 10) / 10,
      sodium: Math.round((nutriments.sodium_100g || nutriments.sodium || 0) * 1000 * 10) / 10, // Convert g to mg
      cholesterol: Math.round((nutriments['cholesterol_100g'] || 0) * 1000 * 10) / 10, // Convert g to mg
      sugars: Math.round((nutriments.sugars_100g || nutriments.sugars || 0) * 10) / 10,
      fiber: Math.round((nutriments.fiber_100g || nutriments.fiber || 0) * 10) / 10,
      imageUrl: product.image_front_url || product.image_url || null,
    };

    // Remove any null values to keep documents clean and avoid undefined errors
    Object.keys(result).forEach(key => {
      if (result[key] === null || result[key] === undefined) {
        delete result[key];
      }
    });

    await cacheProduct(result as OpenFoodFactsResult);
    return result as OpenFoodFactsResult;
  } catch (error) {
    console.error('Open Food Facts API error:', error);
    return null;
  }
}
