import { FoodSearchResult } from '../types';

export const searchOpenFoodFacts = async (query: string, signal?: AbortSignal): Promise<FoodSearchResult[]> => {
  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ChennaFit - iOS/Android - Version 1.0 - https://github.com/ChennaFit',
      },
      signal
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.products) return [];
    
    return data.products.map((product: any) => {
      let servingQuantity = parseFloat(product.serving_quantity);
      if (isNaN(servingQuantity) && product.serving_size) {
        const match = product.serving_size.match(/(\d+(?:\.\d+)?)\s*(?:g|ml|oz)/i);
        if (match) {
          servingQuantity = parseFloat(match[1]);
        }
      }

      const result: any = {
        fdcId: product._id || product.code || Math.random().toString(),
        description: product.product_name || 'Unknown Food',
        brand: product.brands || null,
        servingQuantity: isNaN(servingQuantity) ? null : servingQuantity,
        calories: product.nutriments?.['energy-kcal_100g'] || product.nutriments?.['energy-kcal'] || 0,
        protein: product.nutriments?.proteins_100g || product.nutriments?.proteins || 0,
        carbs: product.nutriments?.carbohydrates_100g || product.nutriments?.carbohydrates || 0,
        fat: product.nutriments?.fat_100g || product.nutriments?.fat || 0,
        sodium: product.nutriments?.sodium_100g ? product.nutriments.sodium_100g * 1000 : null,
        sugars: product.nutriments?.sugars_100g || null,
        fiber: product.nutriments?.fiber_100g || null,
        source: 'openfoodfacts'
      };
      Object.keys(result).forEach(key => {
        if (result[key] === null || result[key] === undefined) {
          delete result[key];
        }
      });
      return result as FoodSearchResult;
    });
  } catch (error: any) {
    if (error.name !== 'AbortError') {
      console.warn("Open Food Facts search unavailable or failed: ", error.message);
    }
    return [];
  }
};
