export const CATEGORIES = [
  {
    id: "product_quality",
    label: "Product quality",
    hint: "Overall quality and finish of the product",
  },
  {
    id: "value_for_money",
    label: "Value for money",
    hint: "Whether the product feels worth its price",
  },
  {
    id: "sewing_performance",
    label: "Sewing performance",
    hint: "How the machine sews in general",
  },
  {
    id: "ease_of_use",
    label: "Ease of use",
    hint: "How approachable and simple the machine feels",
  },
  {
    id: "features_design",
    label: "Features and design",
    hint: "Useful features and thoughtful design",
  },
  {
    id: "product_variety",
    label: "Product variety",
    hint: "Range of sewing machine choices available",
  },
  {
    id: "shop_service",
    label: "Shop service and staff",
    hint: "Helpful service or respectful staff behaviour",
  },
  {
    id: "purchase_experience",
    label: "Purchase experience",
    hint: "The overall buying experience",
  },
] as const;
export type CategoryId = (typeof CATEGORIES)[number]["id"];
export const CATEGORY_IDS = new Set<string>(
  CATEGORIES.map((category) => category.id)
);
