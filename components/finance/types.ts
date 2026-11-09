export type TransactionType = "expense" | "income" | "transfer";
export type TransactionScope = "personal" | "group";

export interface TransactionItem {
  _id: string;
  userEmail: string;
  scope: TransactionScope;
  groupId?: string;
  type: TransactionType;
  amount: number;
  category: string;
  isRecurring: boolean; // 정기(고정비) vs 변동비
  recurringCycle?: "monthly" | "weekly" | "yearly";
  date: string; // "YYYY-MM-DD"
  title: string;
  memo?: string;
  tags: string[];
  images: string[];
  paymentMethod?: string;
  ocrData?: {
    merchant?: string;
    amount?: number;
    date?: string;
    items?: string[];
  };
  payerEmail?: string;
  splitMembers?: Array<{
    name: string;
    email?: string;
    amount: number;
    isPaid: boolean;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface FinanceCategoryItem {
  id: string;
  name: string;
  type: "expense" | "income";
  iconName: string;
  color: string;
  isRecurringDefault?: boolean;
}

export interface MonthBudget {
  _id?: string;
  userEmail: string;
  monthKey: string;
  totalBudget: number;
  categoryBudgets: Array<{
    category: string;
    amount: number;
  }>;
  rolloverToNextMonth?: boolean;
}

export interface AssetSummary {
  grossAssets: number;
  netWorth: number;
  totalSavings: number;
  totalRealEstate: number;
  totalStock: number;
  totalLoan: number;
  totalLoanMonthly: number;
  totalInsuranceMonthly: number;
}

export interface AssetDoc {
  _id: string;
  type: "savings" | "insurance" | "loan" | "real_estate" | "stock";
  name: string;
  institution?: string;
  amount: number;
  currentBalance?: number;
  monthlyPayment?: number;
  interestRate?: number;
  repaymentType?: "equal_principal_interest" | "equal_principal" | "bullet";
  startDate?: string;
  endDate?: string;
  maturityDate?: string;
  memo?: string;
}

export type FinanceTransaction = TransactionItem & {
  isFixed?: boolean;
  receiptImage?: string;
};
export type FinanceCategory = FinanceCategoryItem;
export type FinanceBudget = MonthBudget;
export type FinanceAsset = AssetDoc & {
  currentBalance: number;
  maturityDate?: string;
};
export type AssetType = "savings" | "insurance" | "loan" | "real_estate" | "stock";
