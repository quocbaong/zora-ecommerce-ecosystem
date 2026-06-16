import api from '@/lib/axios';
import type { Category, CategoryAttribute } from '@/types/api.types';

const BASE = '/api/products/categories';

export const categoryService = {
  getAll: () =>
    api.get<Category[]>(BASE).then((r) => r.data),

  getById: (id: string) =>
    api.get<Category>(`${BASE}/${id}`).then((r) => r.data),

  getAttributes: (categoryId: string) =>
    api.get<CategoryAttribute[]>(`${BASE}/${categoryId}/attributes`).then((r) => r.data),
};
