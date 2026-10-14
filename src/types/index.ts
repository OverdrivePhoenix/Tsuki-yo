export type BranchSemester = 'S4 CSE' | 'S2 ECE' | 'S6 ME' | 'S8 CE' | 'S4 EEE';

export type ProductCategory = 'All' | 'Textbooks' | 'Lab Supplies' | 'Stationery' | 'MEC Merch';

export interface ProductVariant {
  id: string;
  name: string; // e.g. "S", "M", "L", "XL" or "Standard"
  stock: number;
  priceModifier?: number;
}

export interface Product {
  id: string;
  name: string;
  subtitle: string;
  category: ProductCategory;
  departmentTag: string;
  price: number;
  originalPrice?: number;
  rackLocation: string;
  fastVelocityText?: string;
  variants?: ProductVariant[];
  selectedVariantId?: string;
  stock: number; // aggregate or single stock
}

export interface CurriculumBundle {
  id: string;
  branch: BranchSemester;
  title: string;
  subtitle: string;
  scheme: string;
  items: {
    name: string;
    price: number;
    sku: string;
  }[];
  originalPrice: number;
  bundlePrice: number;
  savings: number;
  discountPercentage: number;
  inStock: number;
  statusBadge?: string;
}

export interface CartItem {
  productId: string;
  name: string;
  spec?: string;
  price: number;
  quantity: number;
  rackLocation: string;
}

export type OrderStatus = 'PAID' | 'PREPARING' | 'READY FOR PICKUP' | 'COLLECTED';

export interface OrderItem {
  name: string;
  spec?: string;
  sku: string;
  price: number;
  quantity: number;
  rackLocation: string;
  checked?: boolean;
}

export interface Order {
  id: string; // e.g. "#FETCH-8802"
  studentName: string;
  rollNumber: string;
  branch: string;
  items: OrderItem[];
  totalAmount: number;
  paymentRoute: string;
  status: OrderStatus;
  createdAt: string; // e.g. "1m 45s ago" or timestamp
  verificationHash: string;
}
