import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { OpenFoodFactsResult } from '../types';

/**
 * Get a cached product by barcode.
 */
export async function getCachedProduct(barcode: string): Promise<OpenFoodFactsResult | null> {
  const snap = await getDoc(doc(db, 'scanned_products', barcode));
  return snap.exists() ? (snap.data() as OpenFoodFactsResult) : null;
}

/**
 * Cache a product from Open Food Facts into Firestore.
 */
export async function cacheProduct(product: OpenFoodFactsResult): Promise<void> {
  await setDoc(doc(db, 'scanned_products', product.barcode), product);
}
