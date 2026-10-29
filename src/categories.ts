import { CATEGORIES } from "../shared/categories";
export const categories = CATEGORIES.map(({ id, label, hint }) => ({
  id,
  label,
  description: hint,
}));
