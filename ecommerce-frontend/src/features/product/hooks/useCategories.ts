import { useQuery } from '@tanstack/react-query';
import { categoryService } from '@/features/product/services/categoryService';
import type { Category, CategoryAttribute } from '@/types/api.types';

export const useCategories = () => {
  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => categoryService.getAll(),
    staleTime: 5 * 60 * 1000, // 5 minutes — categories change rarely
  });
};

export const useCategoryAttributes = (categoryId?: string) => {
  return useQuery<CategoryAttribute[]>({
    queryKey: ['category-attributes', categoryId],
    queryFn: () => categoryService.getAttributes(categoryId!),
    enabled: !!categoryId,
    staleTime: 5 * 60 * 1000,
  });
};
