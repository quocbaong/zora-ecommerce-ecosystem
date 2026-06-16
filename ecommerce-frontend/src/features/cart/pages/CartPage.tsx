import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Trash2, Plus, Minus, ShoppingBag, Store } from 'lucide-react';
import { useCart, useUpdateCartItem, useRemoveCartItem, useClearCart } from '../hooks/useCart';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import type { CartItemResponse } from '../services/cartService';
import type { CartItem as LocalCartItem } from '@/stores/cartStore';
import EmptyState from '@/components/common/EmptyState';
import { useQuery } from '@tanstack/react-query';
import { userService } from '@/features/user/services/userService';
import { productService } from '@/features/product/services/productService';
function SellerName({ sellerId }: { sellerId: string }) {
  const { data } = useQuery({
    queryKey: ['seller-profile', sellerId],
    queryFn: () => userService.getProfileById(sellerId),
    enabled: sellerId !== 'unknown',
    staleTime: 5 * 60 * 1000,
  });

  if (sellerId === 'unknown') return <span>Shop</span>;
  return <span>{data?.fullName || `Shop ${sellerId.slice(0, 8)}`}</span>;
}

function formatPrice(v: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);
}

type AnyItem = CartItemResponse | LocalCartItem;

function getItemId(item: AnyItem): string {
  return (item as { id?: string }).id ?? (item as LocalCartItem).productId;
}
function getItemName(item: AnyItem): string {
  return item.name || '—';
}
function getItemVariantName(item: AnyItem): string | undefined {
  const raw = (item as CartItemResponse).variantName ?? (item as LocalCartItem).variantName;
  return raw && raw.trim() !== '' ? raw : undefined;
}
function getItemImage(item: AnyItem): string | undefined {
  return 'image' in item ? (item as CartItemResponse).image ?? undefined : (item as LocalCartItem).image;
}
function getItemSellerId(item: AnyItem): string {
  return (item as CartItemResponse).sellerId ?? (item as LocalCartItem).sellerId ?? 'unknown';
}
// Server cart item dùng id row, local cart item cũng có id từ store
function isServerItem(item: AnyItem): item is CartItemResponse {
  return 'subtotal' in item;
}

interface SellerGroup {
  sellerId: string;
  items: AnyItem[];
}

function groupBySeller(items: AnyItem[]): SellerGroup[] {
  const map = new Map<string, AnyItem[]>();
  for (const item of items) {
    const sid = getItemSellerId(item);
    if (!map.has(sid)) map.set(sid, []);
    map.get(sid)!.push(item);
  }
  return Array.from(map.entries()).map(([sellerId, items]) => ({ sellerId, items }));
}

export default function CartPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const userId = user?.id || 'guest';
  const { data: serverCart, isLoading } = useCart();
  const { items: localItems } = useCartStore();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();
  const clearCart = useClearCart();

  const cartItems: AnyItem[] =
    isAuthenticated && serverCart?.data?.items?.length ? serverCart.data.items : localItems;

  const groups = useMemo(() => groupBySeller(cartItems), [cartItems]);
  const allIds = useMemo(() => cartItems.map(getItemId), [cartItems]);

  const { data: stockData } = useQuery({
    queryKey: ['cart-stock', cartItems.map(i => getItemId(i)).join(',')],
    queryFn: async () => {
      if (cartItems.length === 0) return null;
      const items = cartItems.map(item => {
        const productId = (item as CartItemResponse).productId ?? (item as LocalCartItem).productId;
        const variantId = (item as CartItemResponse).variantId ?? (item as LocalCartItem).variantId ?? null;
        return { productId, variantId, quantity: item.quantity };
      });
      return productService.checkStock({ items });
    },
    enabled: cartItems.length > 0,
    refetchInterval: 10000,
  });

  const getStockStatus = useCallback((item: AnyItem) => {
    if (!stockData) return null;
    const productId = (item as CartItemResponse).productId ?? (item as LocalCartItem).productId;
    const variantId = (item as CartItemResponse).variantId ?? (item as LocalCartItem).variantId ?? null;
    return stockData.outOfStockItems.find(
      (o) => o.productId === productId && (o.variantId ?? null) === (variantId ?? null)
    );
  }, [stockData]);

  // Selected item IDs — load from localStorage initially if present, else empty
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    const storedUser = useAuthStore.getState().user;
    const uid = storedUser?.id || 'guest';
    const key = `cart_selected_ids_${uid}`;
    const saved = localStorage.getItem(key);
    try {
      if (saved) {
        return new Set(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    }
    return new Set<string>();
  });

  const selectedKey = `cart_selected_ids_${userId}`;
  const seenKey = `cart_all_item_ids_${userId}`;

  // Sync selection state when cart items change (e.g., loaded from server or added/removed)
  useEffect(() => {
    if (allIds.length === 0) {
      setSelectedIds(new Set());
      return;
    }

    const savedSeen = localStorage.getItem(seenKey);
    const justAddedKey = `cart_just_added_${userId}`;
    const savedJustAdded = localStorage.getItem(justAddedKey);

    let parsedSeen: string[] = [];
    let parsedJustAdded: { productId: string; variantId: string | null }[] = [];

    try {
      parsedSeen = savedSeen ? JSON.parse(savedSeen) : [];
    } catch (e) {
      console.error(e);
    }
    try {
      parsedJustAdded = savedJustAdded ? JSON.parse(savedJustAdded) : [];
    } catch (e) {
      console.error(e);
    }

    const seenSet = new Set(parsedSeen);

    // Build a map of just added items for easy lookup
    const justAddedMap = new Map<string, Set<string | null>>();
    parsedJustAdded.forEach((item) => {
      if (!justAddedMap.has(item.productId)) {
        justAddedMap.set(item.productId, new Set());
      }
      justAddedMap.get(item.productId)!.add(item.variantId);
    });

    // Track which items from parsedJustAdded were actually found in the current cart
    const foundJustAdded = new Set<string>(); // key format: "productId:variantId"

    setSelectedIds((prevSelected) => {
      const nextSelected = new Set<string>();

      allIds.forEach((id) => {
        // Find the corresponding cart item to inspect productId and variantId
        const item = cartItems.find((it) => getItemId(it) === id);
        const itemProductId = item?.productId || '';
        const itemVariantId = item?.variantId || null;

        // Treat null and undefined variantId identically
        const normalizedVariantId = itemVariantId ?? null;

        const isJustAdded =
          justAddedMap.has(itemProductId) &&
          justAddedMap.get(itemProductId)!.has(normalizedVariantId);

        if (isJustAdded) {
          // If it was just added manually, force it to be checked
          nextSelected.add(id);
          foundJustAdded.add(`${itemProductId}:${normalizedVariantId}`);
        } else if (savedSeen === null) {
          // First time opening the cart, select all by default
          nextSelected.add(id);
        } else if (!seenSet.has(id)) {
          // Genuinely new item added to the cart (never seen in cart before), select it by default
          nextSelected.add(id);
        } else if (prevSelected.has(id)) {
          // Keep selected if it was checked before in state
          nextSelected.add(id);
        }
      });

      return nextSelected;
    });

    localStorage.setItem(seenKey, JSON.stringify(allIds));

    // Only remove the found items from the cart_just_added list in localStorage
    const remainingJustAdded = parsedJustAdded.filter(
      (item) => !foundJustAdded.has(`${item.productId}:${item.variantId ?? null}`)
    );

    if (remainingJustAdded.length > 0) {
      localStorage.setItem(justAddedKey, JSON.stringify(remainingJustAdded));
    } else if (savedJustAdded) {
      localStorage.removeItem(justAddedKey);
    }
  }, [allIds.join(','), seenKey, userId, cartItems]);

  // Clean up selectedIds if they become out of stock
  useEffect(() => {
    if (!stockData || selectedIds.size === 0) return;

    let hasChanges = false;
    const nextSelected = new Set(selectedIds);

    for (const id of selectedIds) {
      const item = cartItems.find(i => getItemId(i) === id);
      if (item) {
        const status = getStockStatus(item);
        if (status && status.available === 0) {
          nextSelected.delete(id);
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      setSelectedIds(nextSelected);
    }
  }, [stockData, cartItems, getStockStatus]);

  // Persist manual selections whenever they change
  useEffect(() => {
    if (allIds.length > 0) {
      localStorage.setItem(selectedKey, JSON.stringify(Array.from(selectedIds)));
    }
  }, [selectedIds, selectedKey, allIds.length]);

  const selectableIds = useMemo(() => {
    return cartItems
      .filter((i) => {
        const stockStatus = getStockStatus(i);
        return !(stockStatus && stockStatus.available === 0);
      })
      .map(getItemId);
  }, [cartItems, getStockStatus]);

  const isAllSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));
  const isGroupSelected = (g: SellerGroup) => {
    const groupSelectable = g.items.filter(i => {
      const st = getStockStatus(i);
      return !(st && st.available === 0);
    });
    return groupSelectable.length > 0 && groupSelectable.every((i) => selectedIds.has(getItemId(i)));
  };
  const isGroupIndeterminate = (g: SellerGroup) =>
    g.items.some((i) => selectedIds.has(getItemId(i))) && !isGroupSelected(g);

  const toggleAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      const next = new Set(selectedIds);
      selectableIds.forEach(id => next.add(id));
      setSelectedIds(next);
    }
  };

  const toggleGroup = (g: SellerGroup) => {
    const next = new Set(selectedIds);
    const groupSelectable = g.items.filter(i => {
      const st = getStockStatus(i);
      return !(st && st.available === 0);
    });
    
    if (isGroupSelected(g)) {
      groupSelectable.forEach((i) => next.delete(getItemId(i)));
    } else {
      groupSelectable.forEach((i) => next.add(getItemId(i)));
    }
    setSelectedIds(next);
  };

  const toggleItem = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const selectedItems = cartItems.filter((i) => selectedIds.has(getItemId(i)));
  const selectedTotal = selectedItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const selectedCount = selectedItems.reduce((s, i) => s + i.quantity, 0);

  const updateLocalQty = useCartStore((s) => s.updateQuantity);
  const removeLocal = useCartStore((s) => s.removeItem);
  const clearLocalCart = useCartStore((s) => s.clearCart);

  const totalItemCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  const handleQuantityChange = useCallback(
    (id: string, qty: number, server: boolean) => {
      if (qty < 1) return;
      if (server) {
        updateItem.mutate({ itemId: id, quantity: qty });
      } else {
        updateLocalQty(id, qty);
      }
    },
    [updateItem, updateLocalQty]
  );

  const handleRemove = useCallback(
    (id: string, server: boolean) => {
      if (server) removeItem.mutate(id);
      else removeLocal(id);
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    },
    [removeItem, removeLocal]
  );

  const handleCheckout = () => {
    const validItems = selectedItems.filter(i => {
      const st = getStockStatus(i);
      return !(st && st.available === 0);
    });
    if (validItems.length === 0) {
      toast.error('Không có sản phẩm nào hợp lệ để thanh toán!');
      return;
    }
    navigate('/checkout', { state: { selectedItems: validItems } });
  };

  const handleClearAll = () => {
    if (
      !window.confirm('Bạn có chắc muốn xóa tất cả sản phẩm trong giỏ hàng?')
    ) {
      return;
    }

    const resetSelection = () => setSelectedIds(new Set());

    if (isAuthenticated) {
      clearCart.mutate(undefined, {
        onSuccess: () => {
          clearLocalCart();
          resetSelection();
        },
      });
    } else {
      clearLocalCart();
      resetSelection();
      toast.success('Đã xóa tất cả sản phẩm trong giỏ hàng');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] py-4">
        <div className="max-w-5xl mx-auto px-4 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded p-4 animate-pulse h-28" />
          ))}
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] py-8">
        <div className="max-w-5xl mx-auto px-4">
          <div className="bg-white rounded py-20">
            <EmptyState
              icon={<ShoppingBag className="w-16 h-16 text-gray-300" />}
              title="Giỏ hàng trống"
              description="Hãy khám phá và thêm sản phẩm vào giỏ hàng"
              actionLabel="Tiếp tục mua sắm"
              onAction={() => navigate('/products')}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] pb-32">
      <div className="max-w-5xl mx-auto px-4 py-4 space-y-3">

        <div className="flex items-center justify-between gap-3 bg-white rounded px-4 py-3">
          <p className="text-sm font-semibold text-gray-800 sm:text-base">
            Giỏ hàng
            <span className="ml-1.5 font-normal text-gray-500">
              ({totalItemCount} sản phẩm)
            </span>
          </p>
          <button
            type="button"
            onClick={handleClearAll}
            disabled={clearCart.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4 shrink-0" />
            Xóa tất cả
          </button>
        </div>

        {/* Column headers */}
        <div className="bg-white rounded px-4 py-3 hidden md:flex items-center text-sm text-gray-500">
          <div className="flex items-center gap-3 flex-1">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={toggleAll}
              className="w-4 h-4 accent-orange-500 cursor-pointer"
            />
            <span>Sản Phẩm</span>
          </div>
          <div className="w-28 text-center">Đơn Giá</div>
          <div className="w-32 text-center">Số Lượng</div>
          <div className="w-24 text-center">Số Tiền</div>
          <div className="w-16 text-center">Thao Tác</div>
        </div>

        {/* Seller groups */}
        {groups.map((group) => (
          <div key={group.sellerId} className="bg-white rounded overflow-hidden">
            {/* Seller header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
              <input
                type="checkbox"
                checked={isGroupSelected(group)}
                ref={(el) => { if (el) el.indeterminate = isGroupIndeterminate(group); }}
                onChange={() => toggleGroup(group)}
                className="w-4 h-4 accent-orange-500 cursor-pointer"
              />
              <Store className="w-4 h-4 text-orange-500" />
              <span className="font-semibold text-sm text-gray-800">
                <SellerName sellerId={group.sellerId} />
              </span>
            </div>

            {/* Items */}
            {group.items.map((item) => {
              const id = getItemId(item);
              const name = getItemName(item);
              const variantName = getItemVariantName(item);
              const image = getItemImage(item);
              const price = item.price;
              const qty = item.quantity;
              const checked = selectedIds.has(id);
              const isServer = isServerItem(item);
              
              const stockStatus = getStockStatus(item);
              const isOutOfStock = stockStatus && stockStatus.available === 0;
              const isNotEnough = stockStatus && stockStatus.available > 0 && stockStatus.available < qty;
              
              // If it's out of stock, uncheck it automatically so it can't be checked out
              if (isOutOfStock && checked) {
                setTimeout(() => toggleItem(id), 0);
              }

              return (
                <div
                  key={id}
                  className={`flex flex-col md:flex-row md:items-center gap-3 px-4 py-4 border-b border-gray-50 last:border-0 transition-colors ${checked ? 'bg-orange-50/20' : ''} ${isOutOfStock ? 'bg-gray-50/50' : ''}`}
                >
                  {/* Left part: Checkbox + Image + Name */}
                  <div className="flex items-start md:items-center gap-3 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={checked && !isOutOfStock}
                      disabled={isOutOfStock}
                      onChange={() => toggleItem(id)}
                      className={`w-4 h-4 cursor-pointer shrink-0 mt-1 md:mt-0 ${isOutOfStock ? 'accent-gray-300 opacity-50 cursor-not-allowed' : 'accent-orange-500'}`}
                    />

                    <Link to={`/products/${(item as CartItemResponse).productId ?? id}`} className={`shrink-0 ${isOutOfStock ? 'cursor-not-allowed pointer-events-none' : ''}`}>
                      <div className={`w-20 h-20 rounded border border-gray-200 overflow-hidden relative ${isOutOfStock ? 'bg-gray-200 grayscale opacity-80' : 'bg-gray-100'}`}>
                        {image ? (
                          <img src={image} alt={name} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShoppingBag className="w-6 h-6 text-gray-300" />
                          </div>
                        )}
                        {isOutOfStock && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <div className="bg-gray-800/80 text-white text-[10px] font-bold uppercase px-2 py-1 rounded-sm border border-gray-600/50 backdrop-blur-sm">
                              Hết hàng
                            </div>
                          </div>
                        )}
                      </div>
                    </Link>
                    <div className="min-w-0 flex flex-col gap-0.5">
                      <Link
                        to={`/products/${(item as CartItemResponse).productId ?? id}`}
                        className={`text-sm line-clamp-2 transition-colors ${isOutOfStock ? 'text-gray-400 cursor-not-allowed pointer-events-none' : 'text-gray-800 hover:text-orange-500'}`}
                      >
                        {name}
                      </Link>
                      {variantName && (
                        <span className={`text-xs ${isOutOfStock ? 'text-gray-400' : 'text-gray-500'}`}>Phân loại: {variantName}</span>
                      )}
                      {isOutOfStock && (
                        <span className="text-xs text-red-500 bg-red-50 inline-block px-1.5 py-0.5 rounded border border-red-100 mt-1 w-fit">Sản phẩm đã hết hàng</span>
                      )}
                      {isNotEnough && (
                        <span className="text-xs text-orange-600 bg-orange-50 inline-block px-1.5 py-0.5 rounded border border-orange-100 mt-1 w-fit">Chỉ còn {stockStatus.available} sản phẩm. Vui lòng giảm số lượng.</span>
                      )}
                    </div>
                  </div>

                  {/* Right part: Price, Qty, Subtotal, Delete (wrapped for mobile) */}
                  <div className="flex items-center justify-between pl-7 md:pl-0 w-full md:w-auto">
                    {/* Unit price */}
                    <div className={`w-28 text-center text-sm shrink-0 hidden md:block ${isOutOfStock ? 'text-gray-400' : 'text-gray-500'}`}>
                      {formatPrice(price)}
                    </div>

                    {/* Qty controls */}
                    <div className="w-32 flex justify-center shrink-0">
                      {!isOutOfStock ? (
                        <div className="flex items-center border border-gray-300 rounded">
                          <button
                            onClick={() => handleQuantityChange(id, qty - 1, isServer)}
                            disabled={qty <= 1 || updateItem.isPending}
                            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 disabled:opacity-40 text-gray-600"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-9 text-center text-sm font-medium border-x border-gray-300 h-8 flex items-center justify-center">
                            {qty}
                          </span>
                          <button
                            onClick={() => handleQuantityChange(id, qty + 1, isServer)}
                            disabled={updateItem.isPending}
                            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 disabled:opacity-40 text-gray-600"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-sm font-medium text-gray-400 bg-gray-100 px-3 py-1 rounded">
                          Hết
                        </div>
                      )}
                    </div>

                    {/* Subtotal */}
                    <div className="w-24 text-center shrink-0">
                      {!isOutOfStock && (
                        <span className="text-sm font-semibold text-orange-500">{formatPrice(price * qty)}</span>
                      )}
                    </div>

                    {/* Delete */}
                    <div className="w-16 flex items-center justify-center shrink-0">
                      <button
                        onClick={() => handleRemove(id, isServer)}
                        disabled={removeItem.isPending}
                        className="text-gray-400 hover:text-red-500 transition-colors text-sm p-2 hover:bg-red-50 rounded-full"
                        title="Xóa khỏi giỏ hàng"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        <Link
          to="/products"
          className="inline-block text-sm text-orange-500 hover:text-orange-600 font-medium"
        >
          ← Tiếp tục mua sắm
        </Link>
      </div>

      {/* Sticky bottom checkout bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
          {/* Select all */}
          <label className="flex items-center gap-2 cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={toggleAll}
              className="w-4 h-4 accent-orange-500"
            />
            <span className="text-sm text-gray-600 hidden sm:inline">Tất cả ({allIds.length})</span>
          </label>

          <div className="flex-1" />

          {/* Summary */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-sm text-gray-500 hidden sm:inline">
              Tổng thanh toán ({selectedCount} sản phẩm):
            </span>
            <span className="text-lg font-bold text-orange-500">{formatPrice(selectedTotal)}</span>
          </div>

          {/* Checkout button */}
          <button
            onClick={handleCheckout}
            disabled={selectedItems.length === 0}
            className="shrink-0 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded text-sm transition-colors"
          >
            Mua hàng ({selectedItems.length})
          </button>
        </div>
      </div>
    </div>
  );
}
