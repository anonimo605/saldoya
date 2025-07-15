



export type Transaction = {
  id: string;
  userId: string; // Link to the user
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  date: Date;
};

export type Product = {
  id: string;
  name: string;
  price: number;
  dailyYield: number; // as a percentage
  purchaseLimit: number; // Max number of this product a user can own.
  imageUrl: string;
  durationDays: number;
  isTimeLimited?: boolean;
  timeLimitHours?: number;
  timeLimitSetAt?: Date;
};

export type PurchasedProduct = {
  id: string; // This will now be the document ID in the subcollection
  productId: string;
  name: string;
  purchaseDate: Date;
  lastYieldDate?: Date;
  dailyYield: number;
  status: 'Activo' | 'Expirado';
  price: number;
  durationDays: number;
  imageUrl: string;
};

export type WithdrawalInfo = {
  nequiAccount: string;
  fullName: string;
  idNumber: string;
};

export type User = {
    id: string; // The actual Firestore document ID
    displayId: string; // The user-facing 6-digit ID
    phone: string;
    password?: string; // For prototype login ONLY. In a real app, this should be a hash.
    balance: number;
    referralCode: string; // 6-digit random code
    referredBy?: string;
    referredUsers: string[];
    role: 'user' | 'support' | 'admin' | 'superadmin';
    // purchasedProducts has been moved to a subcollection
    withdrawalInfo?: WithdrawalInfo | null;
    version: number;
    hasMadeFirstRecharge?: boolean;
};

export type RechargeRequest = {
  uniqueId: string; // Internal unique ID
  id: string; // The user-provided referenceId
  userId: string;
  userPhone: string; // For display
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Date;
};

export type WithdrawalRequest = {
  id: string;
  userId: string;
  userPhone: string;
  amount: number;
  nequiAccount: string;
  fullName: string;
  idNumber: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Date;
  processedAt?: Date;
};

export type GiftCode = {
  id: string; // Firestore document ID
  code: string;
  amount: number;
  usageLimit: number; // How many users can redeem it
  expiresInMinutes: number; // Duration after creation
  createdAt: Date;
  redeemedBy: string[]; // Array of user IDs who have redeem it
};

export type WithdrawalSettings = {
    minWithdrawal: number;
    dailyLimit: number;
    withdrawalFeePercentage: number;
    withdrawalStartTime: number; // Hour of the day (0-23)
    withdrawalEndTime: number;   // Hour of the day (0-23)
    allowedWithdrawalDays: number[]; // Array of numbers 0 (Sun) to 6 (Sat)
};
