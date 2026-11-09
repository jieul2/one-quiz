import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITransactionItem extends Document {
  userEmail: string;
  scope: "personal" | "group";
  groupId?: string;
  type: "expense" | "income" | "transfer";
  amount: number;
  category: string;
  isRecurring: boolean; // 정기(고정비) vs 변동비
  recurringCycle?: "monthly" | "weekly" | "yearly";
  date: string; // "YYYY-MM-DD"
  title: string;
  memo?: string;
  tags: string[];
  images: string[];
  paymentMethod?: string; // 카드, 현금, 계좌이체 등
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
  createdAt: Date;
  updatedAt: Date;
}

export interface IFinanceBudget extends Document {
  userEmail: string;
  monthKey: string; // "YYYY-MM"
  totalBudget: number;
  categoryBudgets: Array<{
    category: string;
    amount: number;
  }>;
  rolloverToNextMonth?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFinanceAsset extends Document {
  userEmail: string;
  type: "savings" | "insurance" | "loan" | "real_estate" | "stock";
  name: string;
  institution?: string;
  amount: number;
  monthlyPayment?: number;
  interestRate?: number;
  repaymentType?: "equal_principal_interest" | "equal_principal" | "bullet";
  startDate?: string;
  endDate?: string;
  memo?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransactionItem>(
  {
    userEmail: { type: String, required: true, index: true },
    scope: { type: String, enum: ["personal", "group"], default: "personal" },
    groupId: { type: String },
    type: { type: String, enum: ["expense", "income", "transfer"], required: true },
    amount: { type: Number, required: true },
    category: { type: String, required: true },
    isRecurring: { type: Boolean, default: false },
    recurringCycle: { type: String, enum: ["monthly", "weekly", "yearly"] },
    date: { type: String, required: true, index: true },
    title: { type: String, required: true },
    memo: { type: String },
    tags: { type: [String], default: [] },
    images: { type: [String], default: [] },
    paymentMethod: { type: String, default: "카드" },
    ocrData: {
      merchant: String,
      amount: Number,
      date: String,
      items: [String],
    },
    payerEmail: { type: String },
    splitMembers: [
      {
        name: { type: String, required: true },
        email: String,
        amount: { type: Number, required: true },
        isPaid: { type: Boolean, default: false },
      },
    ],
  },
  { timestamps: true }
);

const FinanceBudgetSchema = new Schema<IFinanceBudget>(
  {
    userEmail: { type: String, required: true, index: true },
    monthKey: { type: String, required: true },
    totalBudget: { type: Number, default: 0 },
    categoryBudgets: [
      {
        category: { type: String, required: true },
        amount: { type: Number, required: true },
      },
    ],
    rolloverToNextMonth: { type: Boolean, default: false },
  },
  { timestamps: true }
);

FinanceBudgetSchema.index({ userEmail: 1, monthKey: 1 }, { unique: true });

const FinanceAssetSchema = new Schema<IFinanceAsset>(
  {
    userEmail: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ["savings", "insurance", "loan", "real_estate", "stock"],
      required: true,
    },
    name: { type: String, required: true },
    institution: { type: String },
    amount: { type: Number, required: true },
    monthlyPayment: { type: Number, default: 0 },
    interestRate: { type: Number, default: 0 },
    repaymentType: {
      type: String,
      enum: ["equal_principal_interest", "equal_principal", "bullet"],
      default: "equal_principal_interest",
    },
    startDate: { type: String },
    endDate: { type: String },
    memo: { type: String },
  },
  { timestamps: true }
);

export const Transaction: Model<ITransactionItem> =
  mongoose.models.Transaction || mongoose.model<ITransactionItem>("Transaction", TransactionSchema);

export const FinanceBudget: Model<IFinanceBudget> =
  mongoose.models.FinanceBudget ||
  mongoose.model<IFinanceBudget>("FinanceBudget", FinanceBudgetSchema);

export const FinanceAsset: Model<IFinanceAsset> =
  mongoose.models.FinanceAsset || mongoose.model<IFinanceAsset>("FinanceAsset", FinanceAssetSchema);
