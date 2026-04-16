import { useState, useEffect, useCallback, useRef } from 'react';
import { useIAP, ErrorCode } from 'expo-iap';
import { isProUser, setProStatus } from '../services/proStatus';

const PRODUCT_ID = 'dfw_pro_unlock';

export interface EntitlementState {
  isPro: boolean;
  loading: boolean;
  error: string | null;
  productPrice: string | null;
  purchase: () => Promise<void>;
  restore: () => Promise<void>;
}

export default function useEntitlement(): EntitlementState {
  const [isPro, setIsPro] = useState<boolean>(() => isProUser());
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [productPrice, setProductPrice] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    connected,
    products,
    fetchProducts,
    requestPurchase,
    finishTransaction,
    restorePurchases,
    availablePurchases,
  } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
      setLoading(false);
      try {
        await finishTransaction({
          purchase,
          isConsumable: false,
        });
        setProStatus({
          purchased: true,
          productId: PRODUCT_ID,
          purchaseDate: new Date().toISOString(),
          purchaseToken: purchase.purchaseToken ?? undefined,
        });
        setIsPro(true);
        setError(null);
      } catch (e) {
        setError('Failed to complete purchase');
        console.warn('[useEntitlement] finishTransaction error:', e);
      }
    },
    onPurchaseError: (err) => {
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
      const isCancel =
        err?.code === ErrorCode.UserCancelled ||
        err?.message?.toLowerCase().includes('cancel');
      if (isCancel) {
        setError(null);
      } else {
        setError(err?.message ?? 'Purchase failed');
        console.warn('[useEntitlement] purchase error:', err);
      }
      setLoading(false);
    },
  });

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!connected) return;

    let cancelled = false;
    let attempt = 0;
    const MAX_RETRIES = 4;
    const BASE_DELAY = 1000;

    const tryFetch = async () => {
      while (attempt < MAX_RETRIES && !cancelled) {
        try {
          await fetchProducts({ skus: [PRODUCT_ID], type: 'in-app' });
          return;
        } catch (e: any) {
          attempt++;
          const isBillingNotReady =
            e?.message?.includes('Billing client not ready') ||
            e?.message?.includes('not ready');
          if (isBillingNotReady && attempt < MAX_RETRIES && !cancelled) {
            await new Promise((r) => setTimeout(r, BASE_DELAY * Math.pow(2, attempt - 1)));
          } else {
            if (!cancelled) {
              console.warn('[useEntitlement] fetchProducts failed:', e);
            }
            return;
          }
        }
      }
    };

    tryFetch();

    return () => {
      cancelled = true;
    };
  }, [connected, fetchProducts]);

  useEffect(() => {
    const product = products?.find((p) => p.id === PRODUCT_ID);
    if (product) {
      setProductPrice(product.displayPrice);
    }
  }, [products]);

  useEffect(() => {
    if (!availablePurchases || availablePurchases.length === 0) return;
    const owned = availablePurchases.find((p) => p.productId === PRODUCT_ID);
    if (owned && !isProUser()) {
      setProStatus({
        purchased: true,
        productId: PRODUCT_ID,
        purchaseDate: new Date(owned.transactionDate ?? Date.now()).toISOString(),
        purchaseToken: owned.purchaseToken ?? undefined,
      });
      setIsPro(true);
      setLoading(false);
      finishTransaction({ purchase: owned, isConsumable: false }).catch(() => {});
    }
  }, [availablePurchases, finishTransaction]);

  const purchase = useCallback(async () => {
    if (isPro) return;
    if (!connected) {
      setError('Not connected to Play Store');
      return;
    }
    setLoading(true);
    setError(null);
    timeoutRef.current = setTimeout(() => {
      setLoading(false);
    }, 60_000);
    try {
      await requestPurchase({
        request: {
          google: { skus: [PRODUCT_ID] },
        },
        type: 'in-app',
      });
    } catch (e: any) {
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
      const msg = e?.message ?? '';
      if (msg.includes('cancel') || msg.includes('Cancel') || e?.code === 'E_USER_CANCELLED') {
        setError(null);
      } else {
        setError(msg || 'Purchase request failed');
      }
      setLoading(false);
    }
  }, [connected, isPro, requestPurchase]);

  const restore = useCallback(async () => {
    if (isProUser()) {
      setIsPro(true);
      return;
    }
    if (!connected) {
      setError('Not connected to Play Store');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await restorePurchases();
    } catch (e: any) {
      setError(e?.message ?? 'Restore failed');
    } finally {
      setLoading(false);
    }
  }, [connected, restorePurchases]);

  return {
    isPro,
    loading,
    error,
    productPrice,
    purchase,
    restore,
  };
}
