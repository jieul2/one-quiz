import { FinanceCategoryItem } from "./types";

export const DEFAULT_EXPENSE_CATEGORIES: FinanceCategoryItem[] = [
  { id: "c_food", name: "식비", type: "expense", iconName: "Utensils", color: "rose", isRecurringDefault: false },
  { id: "c_cafe", name: "카페/간식", type: "expense", iconName: "Coffee", color: "amber", isRecurringDefault: false },
  { id: "c_trans", name: "교통", type: "expense", iconName: "Car", color: "blue", isRecurringDefault: false },
  { id: "c_house", name: "주거/통신/공과금", type: "expense", iconName: "Home", color: "purple", isRecurringDefault: true },
  { id: "c_shop", name: "쇼핑/생필품", type: "expense", iconName: "ShoppingBag", color: "emerald", isRecurringDefault: false },
  { id: "c_leisure", name: "문화/여가", type: "expense", iconName: "Gamepad2", color: "violet", isRecurringDefault: false },
  { id: "c_health", name: "의료/건강", type: "expense", iconName: "HeartPulse", color: "rose", isRecurringDefault: false },
  { id: "c_edu", name: "교육/학습", type: "expense", iconName: "GraduationCap", color: "blue", isRecurringDefault: false },
  { id: "c_sub", name: "정기구독/OTT", type: "expense", iconName: "Tv", color: "purple", isRecurringDefault: true },
  { id: "c_event", name: "경조사/선물", type: "expense", iconName: "Gift", color: "amber", isRecurringDefault: false },
  { id: "c_etc_exp", name: "기타 지출", type: "expense", iconName: "MoreHorizontal", color: "slate", isRecurringDefault: false },
];

export const DEFAULT_INCOME_CATEGORIES: FinanceCategoryItem[] = [
  { id: "c_salary", name: "급여/월급", type: "income", iconName: "Briefcase", color: "emerald", isRecurringDefault: true },
  { id: "c_side", name: "부수입/외주", type: "income", iconName: "Laptop", color: "blue", isRecurringDefault: false },
  { id: "c_interest", name: "금융소득/이자", type: "income", iconName: "TrendingUp", color: "amber", isRecurringDefault: false },
  { id: "c_bonus", name: "상여/보너스", type: "income", iconName: "Sparkles", color: "purple", isRecurringDefault: false },
  { id: "c_pocket", name: "용돈/선물", type: "income", iconName: "Wallet", color: "rose", isRecurringDefault: false },
  { id: "c_etc_inc", name: "기타 수입", type: "income", iconName: "PlusCircle", color: "slate", isRecurringDefault: false },
];
