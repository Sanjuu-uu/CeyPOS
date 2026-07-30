import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Barcode,
  Boxes,
  X,
  Package,
  Printer,
  RefreshCcw,
} from 'lucide-react';
import { Card } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { db, InventoryOperationsSnapshot } from '../../../lib/db';
import { useApp } from '../../../context/AppContext';
import { Product } from '../../../types';
import { ImportWizard } from './import-wizard/ImportWizard';

const LOW_STOCK_THRESHOLD = 10;
const NEW_CATEGORY = '__new__';
const DELETE_UNDO_MS = 8000;

type StockFilter = 'all' | 'in' | 'low' | 'out' | 'reorder';
type InventoryTab = 'catalog' | 'purchasing' | 'stock' | 'ledger' | 'labels';

type FormState = {
  name: string;
  category: string;
  price: string;
  costPrice: string;
  stock: string;
  barcode: string;
  sku: string;
  reorderThreshold: string;
  unitName: string;
  packSize: string;
  preferredSupplierId: string;
  imageUrl: string;
};

type PendingDeletion = {
  id: string;
  shopId: string;
  products: Product[];
  label: string;
};

const EMPTY_FORM: FormState = {
  name: '',
  category: '',
  price: '',
  costPrice: '',
  stock: '',
  barcode: '',
  sku: '',
  reorderThreshold: '',
  unitName: 'unit',
  packSize: '1',
  preferredSupplierId: '',
  imageUrl: '',
};

const EMPTY_OPERATIONS: InventoryOperationsSnapshot = {
  suppliers: [],
  purchaseOrders: [],
  goodsReceived: [],
  purchaseReturns: [],
  stockCounts: [],
  adjustmentReasons: [],
  movements: [],
  variants: [],
};

const inputClass =
  'w-full h-10 pl-3 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ECFF76]/20 focus:border-[#ECFF76]';

const normalizeImageUrl = (value?: string): string | null => {
  if (!value) return null;
  let url = value.trim().replace(/^['"]|['"]$/g, '');
  if (!url) return null;

  url = url.replace(/\\/g, '/');

  const driveMatch =
    url.match(/drive\.google\.com\/file\/d\/([^/]+)/i) ||
    url.match(/drive\.google\.com\/open\?id=([^&]+)/i);
  if (driveMatch?.[1]) {
    return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(driveMatch[1])}`;
  }

  if (/dropbox\.com/i.test(url)) {
    url = url.replace('www.dropbox.com', 'dl.dropboxusercontent.com');
    url = url.replace(/[?&]dl=0/i, '');
  }

  if (url.startsWith('//')) return `https:${encodeURI(url)}`;
  if (/^(data:image\/|blob:|https?:\/\/|\/)/i.test(url)) return encodeURI(url);
  if (/^(localhost|127\.0\.0\.1)(:\d+)?\//i.test(url)) return `http://${encodeURI(url)}`;
  if (/^[\w.-]+\.[a-z]{2,}([/:?#].*)?$/i.test(url)) return `https://${encodeURI(url)}`;

  return encodeURI(url);
};

const InventoryImagePreview: React.FC<{
  imageUrl?: string;
  alt: string;
  size?: 'sm' | 'lg';
}> = ({ imageUrl, alt, size = 'sm' }) => {
  const normalizedUrl = useMemo(() => normalizeImageUrl(imageUrl), [imageUrl]);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [normalizedUrl]);

  const isLarge = size === 'lg';
  const broken = Boolean(normalizedUrl && hasError);

  return (
    <div
      className={`flex shrink-0 flex-col items-center justify-center overflow-hidden rounded-md border border-gray-100 bg-white text-gray-300 ${
        isLarge ? 'h-24 w-24 gap-1.5' : 'mr-3 h-10 w-10'
      }`}
    >
      {normalizedUrl && !hasError ? (
        <img
          src={normalizedUrl}
          alt={alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
          className="h-full w-full object-contain p-1"
        />
      ) : (
        <>
          <Package size={isLarge ? 30 : 20} strokeWidth={1.8} className="text-gray-300" />
          {broken && isLarge && (
            <span className="max-w-[88px] truncate rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-semibold text-gray-400">
              Try another image URL
            </span>
          )}
        </>
      )}
    </div>
  );
};

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

type InventoryChangeEvent = {
  shopId?: string;
  items?: Product[];
};

const isInventoryChangeEvent = (
  payload: unknown,
): payload is InventoryChangeEvent => {
  if (!payload || typeof payload !== 'object') return false;
  const candidate = payload as Record<string, unknown>;
  return (
    (candidate.shopId === undefined || typeof candidate.shopId === 'string') &&
    (candidate.items === undefined || Array.isArray(candidate.items))
  );
};

const money = (value: number) => `$${Number(value || 0).toFixed(2)}`;
const numberFrom = (value: string, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const Inventory: React.FC = () => {
  const { currentShop, isSidebarCollapsed } = useApp();
  const [activeTab, setActiveTab] = useState<InventoryTab>('catalog');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 250);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');

  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [useCustomCategory, setUseCustomCategory] = useState(false);

  const [showImportWizard, setShowImportWizard] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [operations, setOperations] =
    useState<InventoryOperationsSnapshot>(EMPTY_OPERATIONS);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [deleteInProgress, setDeleteInProgress] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [operationSaving, setOperationSaving] = useState(false);
  const [pendingDeletions, setPendingDeletions] = useState<PendingDeletion[]>([]);
  const pendingDeletionTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const pendingDeletionsRef = useRef<PendingDeletion[]>([]);
  const isMountedRef = useRef(true);
  const productFormRef = useRef<HTMLDivElement | null>(null);
  const shouldFocusProductFormRef = useRef(false);

  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contactName: '',
    phone: '',
    email: '',
    address: '',
  });
  const [lineForm, setLineForm] = useState({
    inventoryCode: '',
    supplierId: '',
    poId: '',
    quantity: '',
    unitCost: '',
    notes: '',
  });
  const [returnForm, setReturnForm] = useState({
    inventoryCode: '',
    supplierId: '',
    poId: '',
    quantity: '',
    unitCost: '',
    reason: 'Purchase return',
  });
  const [adjustForm, setAdjustForm] = useState({
    inventoryCode: '',
    quantity: '',
    direction: 'decrease',
    stockType: 'damaged',
    reason: 'Damaged stock',
    notes: '',
  });
  const [countForm, setCountForm] = useState({
    inventoryCode: '',
    countedQuantity: '',
    reason: 'Stock count',
  });
  const [variantForm, setVariantForm] = useState({
    parentInventoryCode: '',
    inventoryCode: '',
    name: '',
    barcode: '',
    sku: '',
    price: '',
    costPrice: '',
    attributesJson: '',
  });

  const currentShopId = currentShop?.id;

  const isMatchingShop = useCallback(
    (shopId?: string) => {
      if (!shopId || !currentShopId) return false;
      const normalize = (value: string) => value.replace(/^shop_/, '');
      return normalize(shopId) === normalize(currentShopId);
    },
    [currentShopId],
  );

  const loadProducts = useCallback(() => {
    if (!currentShopId) {
      setProducts([]);
      return;
    }
    setProducts(db.products.getByShopId(currentShopId));
  }, [currentShopId]);

  const loadOperations = useCallback(async () => {
    if (!currentShopId) {
      setOperations(EMPTY_OPERATIONS);
      return;
    }
    try {
      setOperations(await db.inventoryOperations.load(currentShopId));
    } catch (error) {
      setGlobalError(
        error instanceof Error
          ? error.message
          : 'Failed to load inventory operations.',
      );
    }
  }, [currentShopId]);

  useEffect(() => {
    if (!currentShopId) {
      setProducts([]);
      setOperations(EMPTY_OPERATIONS);
      setGlobalError(null);
      setSelectedIds(new Set());
      return;
    }

    loadProducts();
    void loadOperations();
    setSelectedIds(new Set());

    const handler = (payload: unknown) => {
      if (!isInventoryChangeEvent(payload)) return;
      if (!isMatchingShop(payload.shopId)) return;
      setProducts(payload.items ?? db.products.getByShopId(currentShopId));
      void loadOperations();
    };

    const unsubscribe = db.on('inventoryUpdated', handler);
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
      else db.off('inventoryUpdated', handler);
    };
  }, [currentShopId, isMatchingShop, loadProducts, loadOperations]);

  useEffect(() => {
    pendingDeletionsRef.current = pendingDeletions;
  }, [pendingDeletions]);

  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    [],
  );

  useEffect(() => {
    if (!isAddingProduct || !shouldFocusProductFormRef.current) return;
    shouldFocusProductFormRef.current = false;
    requestAnimationFrame(() => {
      const nameInput = productFormRef.current?.querySelector<HTMLInputElement>('input[name="name"]');
      nameInput?.focus({ preventScroll: true });
      if (editingId) nameInput?.select();
    });
  }, [editingId, isAddingProduct]);

  const pendingDeleteIds = useMemo(() => {
    const ids = new Set<string>();
    pendingDeletions.forEach((deletion) =>
      deletion.products.forEach((product) => ids.add(product.id)),
    );
    return ids;
  }, [pendingDeletions]);

  const visibleProducts = useMemo(
    () => products.filter((product) => !pendingDeleteIds.has(product.id)),
    [products, pendingDeleteIds],
  );

  const categories = useMemo(
    () =>
      [...new Set(visibleProducts.map((product) => product.category).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b),
      ),
    [visibleProducts],
  );

  const filteredProducts = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    return visibleProducts.filter((product) => {
      const threshold = product.reorderThreshold || LOW_STOCK_THRESHOLD;
      const matchesSearch =
        term === '' ||
        product.name.toLowerCase().includes(term) ||
        product.id.toLowerCase().includes(term) ||
        (product.sku || '').toLowerCase().includes(term) ||
        (product.barcode || '').toLowerCase().includes(term);

      const matchesCategory =
        selectedCategory === null || product.category === selectedCategory;

      const matchesStock =
        stockFilter === 'all'
          ? true
          : stockFilter === 'out'
            ? product.stock <= 0
            : stockFilter === 'low'
              ? product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD
              : stockFilter === 'reorder'
                ? product.stock <= threshold
                : product.stock > 0;

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [visibleProducts, debouncedSearch, selectedCategory, stockFilter]);

  const metrics = useMemo(() => {
    const stockValue = visibleProducts.reduce(
      (sum, p) => sum + (p.costPrice || 0) * (p.stock || 0),
      0,
    );
    const retailValue = visibleProducts.reduce(
      (sum, p) => sum + (p.price || 0) * (p.stock || 0),
      0,
    );
    const reorderCount = visibleProducts.filter(
      (p) => p.stock <= (p.reorderThreshold || LOW_STOCK_THRESHOLD),
    ).length;
    const grossProfit = retailValue - stockValue;
    return { stockValue, retailValue, reorderCount, grossProfit };
  }, [visibleProducts]);

  const lowStockCount = useMemo(
    () => visibleProducts.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD).length,
    [visibleProducts],
  );
  const outOfStockCount = useMemo(
    () => visibleProducts.filter((p) => p.stock <= 0).length,
    [visibleProducts],
  );

  const allVisibleSelected =
    filteredProducts.length > 0 &&
    filteredProducts.every((p) => selectedIds.has(p.id));

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) filteredProducts.forEach((p) => next.delete(p.id));
      else filteredProducts.forEach((p) => next.add(p.id));
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setUseCustomCategory(false);
    setIsAddingProduct(false);
    setErrorMessage(null);
  };

  const startAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setUseCustomCategory(false);
    setErrorMessage(null);
    shouldFocusProductFormRef.current = true;
    setIsAddingProduct(true);
    setActiveTab('catalog');
  };

  const startEdit = useCallback((product: Product) => {
    setEditingId(product.id);
    setForm({
      name: product.name ?? '',
      category: product.category ?? '',
      price: Number.isFinite(product.price) ? String(product.price) : '',
      costPrice: Number.isFinite(product.costPrice) ? String(product.costPrice) : '',
      stock: Number.isFinite(product.stock) ? String(product.stock) : '',
      barcode: product.barcode ?? '',
      sku: product.sku ?? '',
      reorderThreshold: Number.isFinite(product.reorderThreshold)
        ? String(product.reorderThreshold)
        : '',
      unitName: product.unitName ?? 'unit',
      packSize: Number.isFinite(product.packSize) ? String(product.packSize) : '1',
      preferredSupplierId: product.preferredSupplierId
        ? String(product.preferredSupplierId)
        : '',
      imageUrl: product.imageUrl ?? '',
    });
    setUseCustomCategory(false);
    setErrorMessage(null);
    shouldFocusProductFormRef.current = true;
    setIsAddingProduct(true);
    setActiveTab('catalog');
  }, []);

  const handleFieldChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCategorySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === NEW_CATEGORY) {
      setUseCustomCategory(true);
      setForm((prev) => ({ ...prev, category: '' }));
    } else {
      setUseCustomCategory(false);
      setForm((prev) => ({ ...prev, category: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentShop || isSaving) return;

    const name = form.name.trim();
    const category = form.category.trim();
    const barcode = form.barcode.trim();
    const parsedPrice = parseFloat(form.price);
    const parsedCost = numberFrom(form.costPrice, 0);
    const parsedStock = parseInt(form.stock, 10);
    const parsedReorder = numberFrom(form.reorderThreshold, 0);
    const parsedPackSize = numberFrom(form.packSize, 1);

    if (!name) return setErrorMessage('Please enter a product name.');
    if (!category) return setErrorMessage('Please choose or enter a category.');
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      return setErrorMessage('Please provide a valid selling price.');
    }
    if (parsedCost < 0) return setErrorMessage('Cost price cannot be negative.');
    if (Number.isNaN(parsedStock) || parsedStock < 0) {
      return setErrorMessage('Please provide a valid stock quantity.');
    }

    setIsSaving(true);
    setGlobalError(null);
    setErrorMessage(null);

    try {
      const payload = {
        id: editingId || undefined,
        shopId: currentShop.id,
        name,
        category,
        price: parsedPrice,
        costPrice: parsedCost,
        stock: parsedStock,
        barcode,
        sku: form.sku.trim(),
        reorderThreshold: parsedReorder,
        unitName: form.unitName.trim() || 'unit',
        packSize: parsedPackSize > 0 ? parsedPackSize : 1,
        preferredSupplierId: form.preferredSupplierId
          ? Number(form.preferredSupplierId)
          : null,
        imageUrl: form.imageUrl.trim(),
      };
      if (editingId) await db.products.update({ ...payload, id: editingId });
      else await db.products.create(payload);
      resetForm();
      void loadOperations();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to save product. Please try again.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleBarcodeCapture = useCallback(
    (barcode: string) => {
      const normalized = barcode.trim();
      if (!normalized) return;
      const match = products.find((product) => product.barcode === normalized);
      if (match) {
        startEdit(match);
        return;
      }
      setEditingId(null);
      setUseCustomCategory(false);
      setErrorMessage(null);
      setForm({ ...EMPTY_FORM, barcode: normalized });
      setIsAddingProduct(true);
      setActiveTab('catalog');
    },
    [products, startEdit],
  );

  useEffect(() => {
    const handler = (payload: unknown) => {
      if (!payload || typeof payload !== 'object') return;
      const candidate = payload as Record<string, unknown>;
      const value =
        typeof candidate.value === 'string' ? candidate.value.trim() : '';
      const sessionType =
        typeof candidate.sessionType === 'string' ? candidate.sessionType : '';
      const sessionId =
        typeof candidate.sessionId === 'string' ? candidate.sessionId : '';
      const shopId =
        typeof candidate.shopId === 'string' ? candidate.shopId : undefined;

      if (!value || !isMatchingShop(shopId)) return;
      if (sessionType && sessionType !== 'barcode') return;
      if (shopId && sessionId) {
        const activeSessionId = localStorage.getItem(
          `ceypos:mobile-session:${shopId.replace(/^shop_/, '')}:barcode`,
        );
        if (activeSessionId && activeSessionId !== sessionId) return;
      }

      handleBarcodeCapture(value);
    };

    const unsubscribe = db.on('mobileBarcode', handler);
    return () => unsubscribe();
  }, [isMatchingShop, handleBarcodeCapture]);

  const handleDeleteProduct = async (product: Product) => {
    if (!currentShop) return;
    setGlobalError(null);
    setDeleteInProgress(product.id);
    queueProductDeletion([product], currentShop.id);
    setDeleteInProgress(null);
  };

  const handleBulkDelete = async () => {
    if (!currentShop || selectedIds.size === 0 || bulkDeleting) return;
    const ids = Array.from(selectedIds);
    const productsToDelete = products.filter((product) => ids.includes(product.id));
    if (!productsToDelete.length) return;
    setGlobalError(null);
    setBulkDeleting(true);
    queueProductDeletion(productsToDelete, currentShop.id);
    setBulkDeleting(false);
  };

  const commitPendingDeletion = useCallback(
    async (deletionId: string) => {
      const deletion = pendingDeletionsRef.current.find((item) => item.id === deletionId);
      if (!deletion) return;
      const productIds = deletion.products.map((product) => product.id);

      pendingDeletionTimers.current.delete(deletionId);
      try {
        if (productIds.length === 1) {
          await db.products.delete(productIds[0], deletion.shopId);
        } else {
          await db.products.deleteMany(productIds, deletion.shopId);
        }
        if (isMountedRef.current) {
          setSelectedIds((prev) => {
            const next = new Set(prev);
            productIds.forEach((id) => next.delete(id));
            return next;
          });
        }
      } catch (error) {
        if (isMountedRef.current) {
          setGlobalError(
            error instanceof Error
              ? error.message
              : 'Failed to delete product. Please try again.',
          );
        }
      } finally {
        if (isMountedRef.current) {
          setPendingDeletions((prev) => prev.filter((item) => item.id !== deletionId));
        }
      }
    },
    [],
  );

  const queueProductDeletion = useCallback(
    (items: Product[], shopId: string) => {
      const uniqueItems = items.filter(
        (item, index, source) =>
          item.id && source.findIndex((candidate) => candidate.id === item.id) === index,
      );
      if (!uniqueItems.length) return;
      const productIds = uniqueItems.map((item) => item.id);

      setSelectedIds((prev) => {
        const next = new Set(prev);
        productIds.forEach((id) => next.delete(id));
        return next;
      });
      setPendingDeletions((prev) => {
        const existing = prev.find((deletion) => deletion.shopId === shopId);
        const deletionId =
          existing?.id || `delete-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const existingProducts = existing?.products || [];
        const mergedProducts = [...existingProducts];
        uniqueItems.forEach((item) => {
          if (!mergedProducts.some((product) => product.id === item.id)) {
            mergedProducts.push(item);
          }
        });
        const label =
          mergedProducts.length === 1
            ? mergedProducts[0]?.name || mergedProducts[0]?.id
            : `${mergedProducts.length} products`;

        const timer = pendingDeletionTimers.current.get(deletionId);
        if (timer) clearTimeout(timer);
        pendingDeletionTimers.current.set(
          deletionId,
          setTimeout(() => {
            void commitPendingDeletion(deletionId);
          }, DELETE_UNDO_MS),
        );

        const nextDeletion: PendingDeletion = {
          id: deletionId,
          shopId,
          products: mergedProducts,
          label,
        };

        return existing
          ? prev.map((deletion) => (deletion.id === deletionId ? nextDeletion : deletion))
          : [...prev, nextDeletion];
      });
    },
    [commitPendingDeletion],
  );

  const undoPendingDeletion = useCallback((deletionId: string) => {
    const timer = pendingDeletionTimers.current.get(deletionId);
    if (timer) {
      clearTimeout(timer);
      pendingDeletionTimers.current.delete(deletionId);
    }
    setPendingDeletions((prev) => prev.filter((item) => item.id !== deletionId));
  }, []);

  const runOperation = async (
    action: () => Promise<InventoryOperationsSnapshot | { operations: InventoryOperationsSnapshot }>,
  ) => {
    if (!currentShop || operationSaving) return;
    setOperationSaving(true);
    setGlobalError(null);
    try {
      const result = await action();
      setOperations('operations' in result ? result.operations : result);
      loadProducts();
    } catch (error) {
      setGlobalError(
        error instanceof Error ? error.message : 'Inventory operation failed.',
      );
    } finally {
      setOperationSaving(false);
    }
  };

  const productOptions = visibleProducts.map((product) => (
    <option key={product.id} value={product.id}>
      {product.name} ({product.id})
    </option>
  ));

  const selectedLabelProducts = filteredProducts.filter((product) =>
    selectedIds.size > 0 ? selectedIds.has(product.id) : true,
  );

  const printBarcodeLabels = () => {
    const items = selectedLabelProducts.filter((product) => product.barcode);
    if (!items.length) {
      setGlobalError('Select products with barcodes before printing labels.');
      return;
    }
    const html = `
      <html>
        <head>
          <title>Barcode Labels</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 16px; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
            .label { border: 1px solid #222; padding: 10px; min-height: 92px; page-break-inside: avoid; }
            .name { font-size: 12px; font-weight: 700; margin-bottom: 6px; }
            .code { font-family: monospace; font-size: 18px; letter-spacing: 2px; border-top: 6px solid #111; border-bottom: 6px solid #111; padding: 8px 0; text-align: center; }
            .meta { font-size: 11px; margin-top: 6px; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="grid">
            ${items
              .map(
                (item) => `
                  <div class="label">
                    <div class="name">${item.name}</div>
                    <div class="code">${item.barcode}</div>
                    <div class="meta"><span>${item.id}</span><span>${money(item.price)}</span></div>
                  </div>
                `,
              )
              .join('')}
          </div>
        </body>
      </html>
    `;
    const printWindow = window.open('', 'barcode-labels', 'width=900,height=700');
    if (!printWindow) {
      setGlobalError('Popup blocked. Please allow popups to print labels.');
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const tabs: Array<{ id: InventoryTab; label: string }> = [
    { id: 'catalog', label: 'Catalog' },
    { id: 'purchasing', label: 'Purchasing' },
    { id: 'stock', label: 'Stock Control' },
    { id: 'ledger', label: 'Ledger' },
    { id: 'labels', label: 'Labels' },
  ];

  return (
    <div className="space-y-5">
      <div className="page-action-row">
        <div>
          <p className="page-subheading" title={`${visibleProducts.length} products in your catalog`}>
            Manage products, purchasing, stock counts and inventory movements
            {lowStockCount > 0 && <span className="text-yellow-600"> · {lowStockCount} low</span>}
            {outOfStockCount > 0 && <span className="text-red-600"> · {outOfStockCount} out</span>}
          </p>
        </div>
        <div className="page-actions">
          <Button variant="secondary" icon={<RefreshCcw size={16} />} onClick={loadOperations}>
            Refresh
          </Button>
          <Button variant="secondary" onClick={() => setShowImportWizard(true)}>
            Import Products
          </Button>
          <Button variant="primary" onClick={startAdd}>
            Add Product
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card><Metric label="Stock valuation" value={money(metrics.stockValue)} /></Card>
        <Card><Metric label="Retail value" value={money(metrics.retailValue)} /></Card>
        <Card><Metric label="Gross profit" value={money(metrics.grossProfit)} /></Card>
        <Card><Metric label="Reorder items" value={String(metrics.reorderCount)} /></Card>
      </div>

      <div className="module-tabs">
        <nav>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`module-tab ${activeTab === tab.id ? 'module-tab-active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {globalError && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {globalError}
        </div>
      )}

      {pendingDeletions.length > 0 && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          role="status"
        >
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {pendingDeletions[0].label} deleted
            </p>
            <p className="text-xs text-gray-500">
              Undo within {Math.round(DELETE_UNDO_MS / 1000)} seconds before permanent removal.
            </p>
          </div>
          <button
            type="button"
            onClick={() => undoPendingDeletion(pendingDeletions[0].id)}
            className="rounded-full border border-gray-950 bg-gray-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
          >
            Undo
          </button>
        </div>
      )}

      {activeTab === 'catalog' && (
        <>
          {isAddingProduct && (
            <div
              className={`fixed bottom-0 right-0 top-[60px] z-40 flex items-center justify-center p-4 md:p-6 ${
                isSidebarCollapsed ? 'left-0 md:left-16' : 'left-0 md:left-60'
              }`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="inventory-product-form-title"
            >
              <div className="absolute inset-0 bg-black/5 backdrop-blur-sm" onClick={resetForm} />
              <div
                ref={productFormRef}
                className="relative z-10 flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
              >
                <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-200 px-6 py-5">
                  <div>
                    <h2 id="inventory-product-form-title" className="text-xl font-bold text-gray-950">
                      {editingId ? 'Edit Product' : 'Add New Product'}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      {editingId ? 'Update catalog details, stock settings and product image' : 'Create a catalog item with pricing, stock and image details'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-950"
                    aria-label="Close product form"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                  <div className="min-h-0 flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 gap-4 rounded-2xl border border-gray-100 bg-gray-50/70 p-4 md:grid-cols-3">
                    <Input label="Product Name" name="name" value={form.name} onChange={handleFieldChange} required disabled={isSaving} />
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
                      {useCustomCategory ? (
                        <div className="flex gap-2">
                          <input name="category" value={form.category} onChange={handleFieldChange} placeholder="New category name" autoFocus className={inputClass} disabled={isSaving} />
                          <button type="button" onClick={() => { setUseCustomCategory(false); setForm((prev) => ({ ...prev, category: '' })); }} className="rounded-lg border border-gray-300 px-3 text-sm text-gray-500 hover:bg-gray-50" disabled={isSaving}>
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <select name="category" value={form.category} onChange={handleCategorySelect} className={inputClass} required disabled={isSaving}>
                          <option value="">Select Category</option>
                          {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                          <option value={NEW_CATEGORY}>+ Add New Category</option>
                        </select>
                      )}
                    </div>
                    <Input label="SKU" name="sku" value={form.sku} onChange={handleFieldChange} disabled={isSaving} />
                    <Input label="Selling Price" name="price" type="number" min="0" step="0.01" value={form.price} onChange={handleFieldChange} required disabled={isSaving} />
                    <Input label="Cost Price" name="costPrice" type="number" min="0" step="0.01" value={form.costPrice} onChange={handleFieldChange} disabled={isSaving} />
                    <Input label="Stock Quantity" name="stock" type="number" min="0" value={form.stock} onChange={handleFieldChange} required disabled={isSaving} />
                    <Input label="Reorder Threshold" name="reorderThreshold" type="number" min="0" value={form.reorderThreshold} onChange={handleFieldChange} disabled={isSaving} />
                    <Input label="Unit" name="unitName" value={form.unitName} onChange={handleFieldChange} disabled={isSaving} />
                    <Input label="Pack Size" name="packSize" type="number" min="0.001" step="0.001" value={form.packSize} onChange={handleFieldChange} disabled={isSaving} />
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Preferred Supplier</label>
                      <select name="preferredSupplierId" value={form.preferredSupplierId} onChange={handleFieldChange} className={inputClass} disabled={isSaving}>
                        <option value="">No supplier</option>
                        {operations.suppliers.map((supplier) => (
                          <option key={supplier.supplier_id} value={supplier.supplier_id}>{supplier.name}</option>
                        ))}
                      </select>
                    </div>
                    <Input label="Barcode" name="barcode" value={form.barcode} onChange={handleFieldChange} disabled={isSaving} />
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-gray-700">Image URL</label>
                      <div className="flex gap-3">
                        <InventoryImagePreview imageUrl={form.imageUrl} alt={form.name || 'Product image preview'} size="lg" />
                        <input
                          name="imageUrl"
                          value={form.imageUrl}
                          onChange={handleFieldChange}
                          disabled={isSaving}
                          placeholder="https://example.com/product-image.jpg"
                          className={inputClass}
                        />
                      </div>
                    </div>
                  </div>
                    {errorMessage && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{errorMessage}</div>}
                  </div>

                  <div className="flex shrink-0 justify-end gap-3 border-t border-gray-200 bg-gray-50/80 px-6 py-4">
                    <Button variant="outline" type="button" onClick={resetForm} disabled={isSaving}>Cancel</Button>
                    <Button variant="primary" type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : editingId ? 'Update Product' : 'Add Product'}</Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <CatalogFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            categories={categories}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            stockFilter={stockFilter}
            setStockFilter={setStockFilter}
            handleBarcodeCapture={handleBarcodeCapture}
          />

          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <span className="text-sm font-semibold text-gray-900">{selectedIds.size} selected</span>
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedIds(new Set())} className="rounded-full px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900">Clear</button>
                <button onClick={handleBulkDelete} disabled={bulkDeleting} className="inline-flex items-center rounded-full border border-red-200 bg-white px-4 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50">
                  {bulkDeleting ? 'Deleting...' : 'Delete Selected'}
                </button>
              </div>
            </div>
          )}

          <ProductTable
            products={filteredProducts}
            selectedIds={selectedIds}
            allVisibleSelected={allVisibleSelected}
            toggleSelectAll={toggleSelectAll}
            toggleSelect={toggleSelect}
            startEdit={startEdit}
            handleDeleteProduct={handleDeleteProduct}
            deleteInProgress={deleteInProgress}
          />
        </>
      )}

      {activeTab === 'purchasing' && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <Card title="Supplier Records" subtitle="Create suppliers used by products and purchase orders">
            <div className="space-y-3">
              <Input label="Supplier Name" value={supplierForm.name} onChange={(e) => setSupplierForm((p) => ({ ...p, name: e.target.value }))} />
              <Input label="Contact" value={supplierForm.contactName} onChange={(e) => setSupplierForm((p) => ({ ...p, contactName: e.target.value }))} />
              <Input label="Phone" value={supplierForm.phone} onChange={(e) => setSupplierForm((p) => ({ ...p, phone: e.target.value }))} />
              <Input label="Email" value={supplierForm.email} onChange={(e) => setSupplierForm((p) => ({ ...p, email: e.target.value }))} />
              <Input label="Address" value={supplierForm.address} onChange={(e) => setSupplierForm((p) => ({ ...p, address: e.target.value }))} />
              <Button fullWidth disabled={operationSaving || !supplierForm.name.trim()} onClick={() => runOperation(async () => {
                const result = await db.inventoryOperations.saveSupplier(currentShopId!, supplierForm);
                setSupplierForm({ name: '', contactName: '', phone: '', email: '', address: '' });
                return result;
              })}>Save Supplier</Button>
            </div>
          </Card>

          <Card title="Purchase Order" subtitle="Record ordered stock before it arrives">
            <LineOperationForm
              products={productOptions}
              suppliers={operations.suppliers}
              form={lineForm}
              setForm={setLineForm}
              submitLabel="Create PO"
              disabled={operationSaving}
              onSubmit={() => runOperation(async () => db.inventoryOperations.createPurchaseOrder(currentShopId!, {
                supplierId: lineForm.supplierId || null,
                notes: lineForm.notes,
                items: [{ inventoryCode: lineForm.inventoryCode, quantity: numberFrom(lineForm.quantity), unitCost: numberFrom(lineForm.unitCost) }],
              }))}
            />
          </Card>

          <Card title="Goods Received" subtitle="Increase stock and update cost from received goods">
            <LineOperationForm
              products={productOptions}
              suppliers={operations.suppliers}
              purchaseOrders={operations.purchaseOrders}
              form={lineForm}
              setForm={setLineForm}
              submitLabel="Receive Goods"
              disabled={operationSaving}
              onSubmit={() => runOperation(async () => db.inventoryOperations.receiveGoods(currentShopId!, {
                supplierId: lineForm.supplierId || null,
                poId: lineForm.poId || null,
                notes: lineForm.notes,
                items: [{ inventoryCode: lineForm.inventoryCode, quantity: numberFrom(lineForm.quantity), unitCost: numberFrom(lineForm.unitCost) }],
              }))}
            />
          </Card>

          <Card title="Purchase Returns" subtitle="Return goods to suppliers and reduce stock" className="xl:col-span-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
              <Select label="Product" value={returnForm.inventoryCode} onChange={(value) => setReturnForm((p) => ({ ...p, inventoryCode: value }))}>{productOptions}</Select>
              <Select label="Supplier" value={returnForm.supplierId} onChange={(value) => setReturnForm((p) => ({ ...p, supplierId: value }))}><option value="">No supplier</option>{operations.suppliers.map((s) => <option key={s.supplier_id} value={s.supplier_id}>{s.name}</option>)}</Select>
              <Input label="Quantity" type="number" min="0" value={returnForm.quantity} onChange={(e) => setReturnForm((p) => ({ ...p, quantity: e.target.value }))} />
              <Input label="Unit Cost" type="number" min="0" step="0.01" value={returnForm.unitCost} onChange={(e) => setReturnForm((p) => ({ ...p, unitCost: e.target.value }))} />
              <Input label="Reason" value={returnForm.reason} onChange={(e) => setReturnForm((p) => ({ ...p, reason: e.target.value }))} />
              <div className="flex items-end"><Button fullWidth disabled={operationSaving || !returnForm.inventoryCode || !returnForm.quantity} onClick={() => runOperation(async () => db.inventoryOperations.createPurchaseReturn(currentShopId!, {
                supplierId: returnForm.supplierId || null,
                poId: returnForm.poId || null,
                reason: returnForm.reason,
                items: [{ inventoryCode: returnForm.inventoryCode, quantity: numberFrom(returnForm.quantity), unitCost: numberFrom(returnForm.unitCost) }],
              }))}>Create Return</Button></div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'stock' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card title="Stock Adjustments" subtitle="Record damaged, expired, missing or promotional stock">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Select label="Product" value={adjustForm.inventoryCode} onChange={(value) => setAdjustForm((p) => ({ ...p, inventoryCode: value }))}>{productOptions}</Select>
              <Input label="Quantity" type="number" min="0" value={adjustForm.quantity} onChange={(e) => setAdjustForm((p) => ({ ...p, quantity: e.target.value }))} />
              <Select label="Direction" value={adjustForm.direction} onChange={(value) => setAdjustForm((p) => ({ ...p, direction: value }))}><option value="decrease">Decrease</option><option value="increase">Increase</option></Select>
              <Select label="Stock Type" value={adjustForm.stockType} onChange={(value) => setAdjustForm((p) => ({ ...p, stockType: value, reason: value.charAt(0).toUpperCase() + value.slice(1) + ' stock' }))}><option value="damaged">Damaged</option><option value="expired">Expired</option><option value="missing">Missing</option><option value="promotional">Promotional</option><option value="adjustment">Manual correction</option></Select>
              <Input label="Reason" value={adjustForm.reason} onChange={(e) => setAdjustForm((p) => ({ ...p, reason: e.target.value }))} />
              <Input label="Notes" value={adjustForm.notes} onChange={(e) => setAdjustForm((p) => ({ ...p, notes: e.target.value }))} />
              <div className="md:col-span-2"><Button disabled={operationSaving || !adjustForm.inventoryCode || !adjustForm.quantity} onClick={() => runOperation(async () => db.inventoryOperations.adjustStock(currentShopId!, adjustForm))}>Save Adjustment</Button></div>
            </div>
          </Card>

          <Card title="Stock Count Session" subtitle="Count one item and post the variance">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Select label="Product" value={countForm.inventoryCode} onChange={(value) => setCountForm((p) => ({ ...p, inventoryCode: value }))}>{productOptions}</Select>
              <Input label="Counted Quantity" type="number" min="0" value={countForm.countedQuantity} onChange={(e) => setCountForm((p) => ({ ...p, countedQuantity: e.target.value }))} />
              <Input label="Reason" value={countForm.reason} onChange={(e) => setCountForm((p) => ({ ...p, reason: e.target.value }))} />
              <div className="flex items-end"><Button fullWidth disabled={operationSaving || !countForm.inventoryCode || !countForm.countedQuantity} onClick={() => runOperation(async () => db.inventoryOperations.createStockCount(currentShopId!, {
                items: [{ inventoryCode: countForm.inventoryCode, countedQuantity: numberFrom(countForm.countedQuantity), reason: countForm.reason }],
              }))}>Complete Count</Button></div>
            </div>
          </Card>

          <Card title="Product Variants" subtitle="Track barcode, SKU and pricing variants where needed" className="lg:col-span-2">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <Select label="Parent Product" value={variantForm.parentInventoryCode} onChange={(value) => setVariantForm((p) => ({ ...p, parentInventoryCode: value }))}>{productOptions}</Select>
              <Input label="Variant Code" value={variantForm.inventoryCode} onChange={(e) => setVariantForm((p) => ({ ...p, inventoryCode: e.target.value }))} />
              <Input label="Variant Name" value={variantForm.name} onChange={(e) => setVariantForm((p) => ({ ...p, name: e.target.value }))} />
              <Input label="Attributes JSON" value={variantForm.attributesJson} onChange={(e) => setVariantForm((p) => ({ ...p, attributesJson: e.target.value }))} />
              <Input label="Barcode" value={variantForm.barcode} onChange={(e) => setVariantForm((p) => ({ ...p, barcode: e.target.value }))} />
              <Input label="SKU" value={variantForm.sku} onChange={(e) => setVariantForm((p) => ({ ...p, sku: e.target.value }))} />
              <Input label="Price" type="number" min="0" step="0.01" value={variantForm.price} onChange={(e) => setVariantForm((p) => ({ ...p, price: e.target.value }))} />
              <Input label="Cost" type="number" min="0" step="0.01" value={variantForm.costPrice} onChange={(e) => setVariantForm((p) => ({ ...p, costPrice: e.target.value }))} />
              <div className="md:col-span-4"><Button disabled={operationSaving || !variantForm.parentInventoryCode || !variantForm.inventoryCode || !variantForm.name} onClick={() => runOperation(async () => db.inventoryOperations.saveVariant(currentShopId!, variantForm))}>Save Variant</Button></div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'ledger' && (
        <Card title="Inventory Movement Ledger" subtitle="Audit trail for goods received, returns, counts and adjustments">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#f3f4f6]"><tr>{['Date', 'Product', 'Type', 'Stock Type', 'Qty', 'After', 'Reason'].map((h) => <Th key={h}>{h}</Th>)}</tr></thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {operations.movements.map((movement) => (
                  <tr key={movement.movement_id}>
                    <Td>{new Date(movement.created_at).toLocaleString()}</Td>
                    <Td>{movement.product_name || movement.inventory_code}</Td>
                    <Td>{movement.movement_type.replace(/_/g, ' ')}</Td>
                    <Td>{movement.stock_type}</Td>
                    <Td><span className={movement.quantity_delta >= 0 ? 'text-green-600' : 'text-red-600'}>{movement.quantity_delta}</span></Td>
                    <Td>{movement.quantity_after}</Td>
                    <Td>{movement.reason || '—'}</Td>
                  </tr>
                ))}
                {!operations.movements.length && <tr><td colSpan={7} className="px-3 py-8 text-center text-sm text-gray-500">No inventory movements yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'labels' && (
        <Card title="Barcode Label Printing" subtitle="Print labels for selected products, or all filtered products when none are selected" actions={<Button icon={<Printer size={16} />} onClick={printBarcodeLabels}>Print Labels</Button>}>
          <CatalogFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            categories={categories}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            stockFilter={stockFilter}
            setStockFilter={setStockFilter}
            handleBarcodeCapture={handleBarcodeCapture}
          />
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            {selectedLabelProducts.slice(0, 30).map((product) => (
              <div key={product.id} className="rounded-lg border border-gray-200 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{product.name}</p>
                    <p className="text-xs text-gray-500">{product.id}</p>
                  </div>
                  <input type="checkbox" checked={selectedIds.has(product.id)} onChange={() => toggleSelect(product.id)} className="h-4 w-4 cursor-pointer accent-[#ecff76]" />
                </div>
                <div className="mt-3 rounded border border-dashed border-gray-300 px-3 py-2 font-mono text-sm">{product.barcode || 'No barcode'}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {showImportWizard && (
        <ImportWizard
          onClose={() => setShowImportWizard(false)}
          onImportComplete={() => {
            setShowImportWizard(false);
            loadProducts();
            void loadOperations();
          }}
        />
      )}
    </div>
  );
};

const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <p className="text-xs font-medium uppercase tracking-[0.1em] text-[#666661]">{label}</p>
    <p className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-gray-900">{value}</p>
  </div>
);

const Th: React.FC<{ children: React.ReactNode; align?: 'left' | 'right' }> = ({ children, align = 'left' }) => (
  <th className={`px-3 py-3 text-${align} text-[11px] font-medium uppercase tracking-[0.1em] text-[#666661]`}>{children}</th>
);

const Td: React.FC<{ children: React.ReactNode; align?: 'left' | 'right' }> = ({ children, align = 'left' }) => (
  <td className={`whitespace-nowrap px-3 py-4 text-${align} text-sm text-gray-600`}>{children}</td>
);

const Select: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}> = ({ label, value, onChange, children }) => (
  <div>
    <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
      <option value="">Select</option>
      {children}
    </select>
  </div>
);

const CatalogFilters: React.FC<{
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  categories: string[];
  selectedCategory: string | null;
  setSelectedCategory: (value: string | null) => void;
  stockFilter: StockFilter;
  setStockFilter: (value: StockFilter) => void;
  handleBarcodeCapture: (barcode: string) => void;
}> = ({
  searchTerm,
  setSearchTerm,
  categories,
  selectedCategory,
  setSelectedCategory,
  stockFilter,
  setStockFilter,
  handleBarcodeCapture,
}) => (
  <Card>
    <div className="flex flex-col gap-4 sm:flex-row">
      <Input
        placeholder="Search products, SKU or scan barcode..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && searchTerm.trim()) {
            e.preventDefault();
            handleBarcodeCapture(searchTerm);
          }
        }}
        fullWidth
      />
      <select className={inputClass} value={selectedCategory || ''} onChange={(e) => setSelectedCategory(e.target.value === '' ? null : e.target.value)}>
        <option value="">All Categories</option>
        {categories.map((category) => <option key={category} value={category}>{category}</option>)}
      </select>
      <select className={inputClass} value={stockFilter} onChange={(e) => setStockFilter(e.target.value as StockFilter)}>
        <option value="all">All Stock</option>
        <option value="in">In Stock</option>
        <option value="low">Low Stock</option>
        <option value="reorder">Needs Reorder</option>
        <option value="out">Out of Stock</option>
      </select>
    </div>
  </Card>
);

const ProductTable: React.FC<{
  products: Product[];
  selectedIds: Set<string>;
  allVisibleSelected: boolean;
  toggleSelectAll: () => void;
  toggleSelect: (id: string) => void;
  startEdit: (product: Product) => void;
  handleDeleteProduct: (product: Product) => void;
  deleteInProgress: string | null;
}> = ({
  products,
  selectedIds,
  allVisibleSelected,
  toggleSelectAll,
  toggleSelect,
  startEdit,
  handleDeleteProduct,
  deleteInProgress,
}) => (
  <Card>
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-[#f3f4f6]">
          <tr>
            <th className="w-10 px-3 py-3"><input type="checkbox" aria-label="Select all" checked={allVisibleSelected} onChange={toggleSelectAll} className="h-4 w-4 cursor-pointer accent-gray-950" /></th>
            <Th>Product</Th>
            <Th>Category</Th>
            <Th>Price</Th>
            <Th>Cost</Th>
            <Th>Stock</Th>
            <Th>Reorder</Th>
            <Th>Unit</Th>
            <Th>Barcode</Th>
            <Th align="right">Actions</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {products.length > 0 ? (
            products.map((product) => {
              const isSelected = selectedIds.has(product.id);
              return (
                <tr key={product.id} className={isSelected ? 'border-l-4 border-l-gray-950 bg-gray-50/80' : 'border-l-4 border-l-transparent'}>
                  <td className="px-3 py-4"><input type="checkbox" aria-label={`Select ${product.name}`} checked={isSelected} onChange={() => toggleSelect(product.id)} className="h-4 w-4 cursor-pointer accent-gray-950" /></td>
                  <td className="whitespace-nowrap px-3 py-4">
                    <div className="flex items-center">
                      <InventoryImagePreview imageUrl={product.imageUrl} alt={product.name} />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        <div className="text-xs text-gray-400">{product.sku || product.id}</div>
                      </div>
                    </div>
                  </td>
                  <Td>{product.category}</Td>
                  <Td>{money(product.price)}</Td>
                  <Td>{money(product.costPrice || 0)}</Td>
                  <Td>
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      product.stock > (product.reorderThreshold || LOW_STOCK_THRESHOLD)
                        ? 'bg-green-50 text-green-600'
                        : product.stock > 0
                          ? 'bg-yellow-50 text-yellow-600'
                          : 'bg-red-50 text-red-600'
                    }`}>
                      {product.stock}
                    </span>
                  </Td>
                  <Td>{product.reorderThreshold || 0}</Td>
                  <Td>{product.unitName || 'unit'} x {product.packSize || 1}</Td>
                  <Td>{product.barcode || <span className="text-gray-300">—</span>}</Td>
                  <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-medium">
                    <button type="button" onClick={() => startEdit(product)} className="mr-3 rounded-lg border border-[#dfdfda] bg-white px-3 py-1.5 text-xs font-medium text-[#555550] hover:border-black hover:text-black" aria-label={`Edit ${product.name}`}>Edit</button>
                    <button type="button" onClick={() => handleDeleteProduct(product)} disabled={deleteInProgress === product.id} className={`rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 ${deleteInProgress === product.id ? 'cursor-not-allowed opacity-50' : ''}`} aria-label={`Delete ${product.name}`}>Delete</button>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr><td colSpan={10} className="px-3 py-8 text-center text-sm text-gray-500">No products found. Try adjusting your search or add a new product.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  </Card>
);

const LineOperationForm: React.FC<{
  products: React.ReactNode;
  suppliers: InventoryOperationsSnapshot['suppliers'];
  purchaseOrders?: InventoryOperationsSnapshot['purchaseOrders'];
  form: { inventoryCode: string; supplierId: string; poId: string; quantity: string; unitCost: string; notes: string };
  setForm: React.Dispatch<React.SetStateAction<{ inventoryCode: string; supplierId: string; poId: string; quantity: string; unitCost: string; notes: string }>>;
  submitLabel: string;
  disabled: boolean;
  onSubmit: () => void;
}> = ({ products, suppliers, purchaseOrders, form, setForm, submitLabel, disabled, onSubmit }) => (
  <div className="space-y-3">
    <Select label="Product" value={form.inventoryCode} onChange={(value) => setForm((p) => ({ ...p, inventoryCode: value }))}>{products}</Select>
    <Select label="Supplier" value={form.supplierId} onChange={(value) => setForm((p) => ({ ...p, supplierId: value }))}><option value="">No supplier</option>{suppliers.map((supplier) => <option key={supplier.supplier_id} value={supplier.supplier_id}>{supplier.name}</option>)}</Select>
    {purchaseOrders && (
      <Select label="Purchase Order" value={form.poId} onChange={(value) => setForm((p) => ({ ...p, poId: value }))}><option value="">No PO</option>{purchaseOrders.map((po) => <option key={po.po_id} value={po.po_id}>{po.po_number}</option>)}</Select>
    )}
    <Input label="Quantity" type="number" min="0" value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))} />
    <Input label="Unit Cost" type="number" min="0" step="0.01" value={form.unitCost} onChange={(e) => setForm((p) => ({ ...p, unitCost: e.target.value }))} />
    <Input label="Notes" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
    <Button fullWidth disabled={disabled || !form.inventoryCode || !form.quantity} onClick={onSubmit}>{submitLabel}</Button>
  </div>
);
