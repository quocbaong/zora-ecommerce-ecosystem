import React, { useState, useEffect } from 'react';

interface FilterParams {
  keyword?: string;
  sort?: string;
}

interface ProductFiltersProps {
  onFilter: (params: FilterParams) => void;
}

const ProductFilters: React.FC<ProductFiltersProps> = ({ onFilter }) => {
  const [sort, setSort] = useState('');

  useEffect(() => {
    onFilter({
      sort: sort || undefined,
    });
  }, [sort, onFilter]);

  const handleSortChange = (value: string) => {
    setSort(value);
  };

  return (
    <div className="flex items-center gap-3 bg-muted/60 p-3 px-4 rounded-sm w-full">
      <span className="text-sm text-muted-foreground mr-2 whitespace-nowrap">
        Sắp xếp theo
      </span>
      
      <div className="flex flex-wrap gap-2 items-center">

        <button
          onClick={() => handleSortChange('newest')}
          className={`px-4 py-2 text-sm rounded-sm transition-colors shadow-sm border ${
            sort === 'newest' 
              ? 'bg-primary text-primary-foreground border-primary' 
              : 'bg-background text-foreground border-transparent hover:border-border'
          }`}
        >
          Mới Nhất
        </button>
        <button
          onClick={() => handleSortChange('sales')}
          className={`px-4 py-2 text-sm rounded-sm transition-colors shadow-sm border ${
            sort === 'sales' 
              ? 'bg-primary text-primary-foreground border-primary' 
              : 'bg-background text-foreground border-transparent hover:border-border'
          }`}
        >
          Bán Chạy
        </button>
        
        <select
          value={sort.startsWith('price') ? sort : ''}
          onChange={(e) => handleSortChange(e.target.value)}
          className={`h-[38px] min-w-[150px] px-3 py-2 text-sm rounded-sm outline-none cursor-pointer shadow-sm border ${
            sort.startsWith('price')
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background text-foreground border-transparent hover:border-border'
          }`}
        >
          <option value="" disabled className="bg-background text-foreground">Giá</option>
          <option value="price_asc" className="bg-background text-foreground">Giá: Thấp đến Cao</option>
          <option value="price_desc" className="bg-background text-foreground">Giá: Cao đến Thấp</option>
        </select>
      </div>
    </div>
  );
};

export default React.memo(ProductFilters);
