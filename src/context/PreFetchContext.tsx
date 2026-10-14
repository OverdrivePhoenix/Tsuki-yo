import React, { createContext, useContext, useState, useEffect } from 'react';
import type {
  BranchSemester,
  CartItem,
  CurriculumBundle,
  Order,
  Product,
} from '../types';
import { INITIAL_BUNDLES, INITIAL_ORDERS, INITIAL_PRODUCTS } from '../data/mockData';

interface PreFetchContextType {
  activeView: 'landing' | 'catalog' | 'checkout' | 'admin';
  setActiveView: (view: 'landing' | 'catalog' | 'checkout' | 'admin') => void;
  checkoutTab: 'checkout' | 'token';
  setCheckoutTab: (tab: 'checkout' | 'token') => void;
  currentBranch: BranchSemester;
  setCurrentBranch: (branch: BranchSemester) => void;
  products: Product[];
  bundles: CurriculumBundle[];
  cart: CartItem[];
  orders: Order[];
  activeStudentOrder: Order | null;
  selectedAdminOrder: Order | null;
  setSelectedAdminOrder: (order: Order | null) => void;
  isMobileFrame: boolean;
  setIsMobileFrame: (val: boolean | ((prev: boolean) => boolean)) => void;
  
  // Stock Lock Timer
  lockRemainingSeconds: number;
  resetLockTimer: () => void;
  
  // Cart Actions
  addToCart: (product: Product, variantId?: string, qty?: number) => void;
  addBundleToCart: (bundle: CurriculumBundle) => void;
  updateCartQty: (productId: string, spec: string | undefined, delta: number) => void;
  removeFromCart: (productId: string, spec?: string) => void;
  clearCart: () => void;
  cartSubtotal: number;
  subsidyDiscount: number;
  cartFinalTotal: number;
  totalCartItemCount: number;

  // Variant Selection
  selectProductVariant: (productId: string, variantId: string) => void;

  // Checkout & Concurrency
  simulateGooglePayCheckout: () => void;

  // Admin Actions
  toggleAdminCheckItem: (orderId: string, itemIdx: number) => void;
  markOrderReady: (orderId: string) => void;
  markOrderCollected: (orderId: string) => void;
  addLiveMockOrder: () => void;
  resetAllData: () => void;
}

const PreFetchContext = createContext<PreFetchContextType | undefined>(undefined);

export const PreFetchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeView, setActiveView] = useState<'landing' | 'catalog' | 'checkout' | 'admin'>('landing');
  const [checkoutTab, setCheckoutTab] = useState<'checkout' | 'token'>('checkout');
  const [currentBranch, setCurrentBranch] = useState<BranchSemester>('S4 CSE');
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [bundles] = useState<CurriculumBundle[]>(INITIAL_BUNDLES);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [selectedAdminOrderId, setSelectedAdminOrderId] = useState<string>('#FETCH-8802');
  const [isMobileFrame, setIsMobileFrame] = useState<boolean>(false);
  const [lockRemainingSeconds, setLockRemainingSeconds] = useState<number>(4 * 60 + 32);

  // Initial cart prefilled matching the Stitch mockup
  const [cart, setCart] = useState<CartItem[]>([
    {
      productId: 'prod-labcoat',
      name: 'S4 CSE Lab Coat',
      spec: 'SPEC: SIZE L • STARCHED',
      price: 420,
      quantity: 1,
      rackLocation: 'RACK A-04',
    },
    {
      productId: 'prod-graph-record',
      name: 'Hardbound Record (200-pg)',
      spec: 'MEC SEAL EMBOSSED • RULED',
      price: 95,
      quantity: 1,
      rackLocation: 'RACK C-12',
    },
    {
      productId: 'prod-cst204',
      name: 'CST204 DBMS Guide',
      spec: 'KTU 2024 ED • PROF NOTES',
      price: 550,
      quantity: 1,
      rackLocation: 'STACK 02',
    },
  ]);

  // Lock timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setLockRemainingSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const resetLockTimer = () => {
    setLockRemainingSeconds(5 * 60);
  };

  // Cart Calculations
  const cartSubtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const subsidyDiscount = cartSubtotal > 500 ? 65 : 0;
  const cartFinalTotal = Math.max(0, cartSubtotal - subsidyDiscount);
  const totalCartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Active student order (default to #FETCH-8802 or the latest created)
  const activeStudentOrder = orders.find((o) => o.id === '#FETCH-8802') || orders[0] || null;

  // Selected admin order for packet inspection
  const selectedAdminOrder = orders.find((o) => o.id === selectedAdminOrderId) || orders[0] || null;

  const selectProductVariant = (productId: string, variantId: string) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        return {
          ...p,
          selectedVariantId: variantId,
        };
      })
    );
  };

  const addToCart = (product: Product, variantId?: string, qty: number = 1) => {
    let specText = undefined;
    let effectivePrice = product.price;

    if (product.variants && product.variants.length > 0) {
      const activeVariant = product.variants.find((v) => v.id === (variantId || product.selectedVariantId)) || product.variants[0];
      if (activeVariant.stock <= 0) {
        alert(`Size ${activeVariant.name} is currently out of stock!`);
        return;
      }
      specText = `SIZE ${activeVariant.name}`;
      if (activeVariant.priceModifier) {
        effectivePrice += activeVariant.priceModifier;
      }
    } else {
      if (product.stock <= 0) {
        alert('This item is currently out of stock!');
        return;
      }
    }

    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (item) => item.productId === product.id && item.spec === specText
      );
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx].quantity += qty;
        return updated;
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          spec: specText,
          price: effectivePrice,
          quantity: qty,
          rackLocation: product.rackLocation,
        },
      ];
    });
  };

  const addBundleToCart = (bundle: CurriculumBundle) => {
    bundle.items.forEach((item) => {
      const matchingProduct = products.find((p) => p.name.includes(item.name.substring(0, 8)));
      setCart((prev) => {
        const existingIdx = prev.findIndex((c) => c.name === item.name);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx].quantity += 1;
          return updated;
        }
        return [
          ...prev,
          {
            productId: matchingProduct?.id || `bundle-item-${Date.now()}-${Math.random()}`,
            name: item.name,
            spec: 'CURRICULUM SPEC',
            price: item.price,
            quantity: 1,
            rackLocation: matchingProduct?.rackLocation || 'COUNTER BAY',
          },
        ];
      });
    });
    // Jump straight to checkout
    setActiveView('checkout');
    setCheckoutTab('checkout');
    resetLockTimer();
  };

  const updateCartQty = (productId: string, spec: string | undefined, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId && item.spec === spec) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string, spec?: string) => {
    setCart((prev) => prev.filter((item) => !(item.productId === productId && item.spec === spec)));
  };

  const clearCart = () => setCart([]);

  // Simulate Google Pay UPI checkout with atomic transaction lock
  const simulateGooglePayCheckout = () => {
    if (cart.length === 0) return;

    // Concurrency atomic decrement on products
    setProducts((prev) =>
      prev.map((prod) => {
        const cartMatches = cart.filter((c) => c.productId === prod.id);
        if (cartMatches.length === 0) return prod;
        
        let newStock = prod.stock;
        let newVariants = prod.variants ? [...prod.variants] : undefined;

        cartMatches.forEach((cartItem) => {
          if (newVariants && cartItem.spec) {
            const variantName = cartItem.spec.replace('SIZE ', '').trim();
            newVariants = newVariants.map((v) =>
              v.name === variantName ? { ...v, stock: Math.max(0, v.stock - cartItem.quantity) } : v
            );
          } else {
            newStock = Math.max(0, newStock - cartItem.quantity);
          }
        });

        return {
          ...prod,
          stock: newStock,
          variants: newVariants,
        };
      })
    );

    // Generate new verifiable collection token
    const randomTokenNum = Math.floor(1000 + Math.random() * 9000);
    const newTokenId = `#FETCH-${randomTokenNum}`;
    const hash = Math.random().toString(16).substring(2, 10);

    const newOrder: Order = {
      id: newTokenId,
      studentName: 'Rahul K. Nair',
      rollNumber: 'MEC22CS089',
      branch: currentBranch,
      totalAmount: cartFinalTotal,
      paymentRoute: `UPI INTENT #MEC-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'READY FOR PICKUP',
      createdAt: 'Just now',
      verificationHash: hash,
      items: cart.map((c) => ({
        name: c.name,
        spec: c.spec,
        sku: `MEC-SKU-${Math.floor(10 + Math.random() * 90)}`,
        price: c.price,
        quantity: c.quantity,
        rackLocation: c.rackLocation,
        checked: false,
      })),
    };

    setOrders((prev) => [newOrder, ...prev]);
    setSelectedAdminOrderId(newOrder.id);
    setCheckoutTab('token');

    // Haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]);
    }
  };

  const toggleAdminCheckItem = (orderId: string, itemIdx: number) => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;
        const updatedItems = [...order.items];
        updatedItems[itemIdx] = {
          ...updatedItems[itemIdx],
          checked: !updatedItems[itemIdx].checked,
        };
        return {
          ...order,
          items: updatedItems,
        };
      })
    );
  };

  const markOrderReady = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: 'READY FOR PICKUP' } : o))
    );
  };

  const markOrderCollected = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          status: 'COLLECTED',
          items: o.items.map((i) => ({ ...i, checked: true })),
        };
      })
    );
  };

  const addLiveMockOrder = () => {
    const studentNames = ['Kavya Ramesh', 'Adithya V. M.', 'Siddharth Menon', 'Fathima Noor', 'Nikhil Raj'];
    const branches = ['S4 CSE', 'S2 ECE', 'S6 ME', 'S4 EEE', 'S8 CE'];
    const pickName = studentNames[Math.floor(Math.random() * studentNames.length)];
    const pickBranch = branches[Math.floor(Math.random() * branches.length)];
    const token = `#FETCH-${Math.floor(8800 + Math.random() * 200)}`;

    const newOrder: Order = {
      id: token,
      studentName: pickName,
      rollNumber: `MEC23${pickBranch.substring(3, 5)}0${Math.floor(10 + Math.random() * 80)}`,
      branch: pickBranch,
      totalAmount: 480,
      paymentRoute: 'UPI INTENT #MEC-LIVE',
      status: 'PREPARING',
      createdAt: 'Just now',
      verificationHash: Math.random().toString(16).substring(2, 8),
      items: [
        {
          name: '200-pg Hardbound Graph Record',
          spec: 'RULED 200-PAGE',
          sku: 'MEC-REC-01',
          price: 120,
          quantity: 2,
          rackLocation: 'RACK C-12',
          checked: false,
        },
        {
          name: 'CST202 Computer Organization & Architecture',
          sku: 'MEC-BK-202',
          price: 240,
          quantity: 1,
          rackLocation: 'RACK A-03',
          checked: false,
        },
      ],
    };

    setOrders((prev) => [newOrder, ...prev]);
  };

  const resetAllData = () => {
    setProducts(INITIAL_PRODUCTS);
    setOrders(INITIAL_ORDERS);
    setSelectedAdminOrderId('#FETCH-8802');
  };

  return (
    <PreFetchContext.Provider
      value={{
        activeView,
        setActiveView,
        checkoutTab,
        setCheckoutTab,
        currentBranch,
        setCurrentBranch,
        products,
        bundles,
        cart,
        orders,
        activeStudentOrder,
        selectedAdminOrder,
        setSelectedAdminOrder: (order) => setSelectedAdminOrderId(order ? order.id : ''),
        isMobileFrame,
        setIsMobileFrame,
        lockRemainingSeconds,
        resetLockTimer,
        addToCart,
        addBundleToCart,
        updateCartQty,
        removeFromCart,
        clearCart,
        cartSubtotal,
        subsidyDiscount,
        cartFinalTotal,
        totalCartItemCount,
        selectProductVariant,
        simulateGooglePayCheckout,
        toggleAdminCheckItem,
        markOrderReady,
        markOrderCollected,
        addLiveMockOrder,
        resetAllData,
      }}
    >
      {children}
    </PreFetchContext.Provider>
  );
};

export const usePreFetch = () => {
  const context = useContext(PreFetchContext);
  if (!context) {
    throw new Error('usePreFetch must be used within a PreFetchProvider');
  }
  return context;
};
