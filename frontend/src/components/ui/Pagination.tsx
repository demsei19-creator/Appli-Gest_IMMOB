import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  hasNext: boolean;
  hasPrevious: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  hasNext,
  hasPrevious,
}) => {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  if (totalCount === 0) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-xl mt-4">
      <div className="text-xs text-slate-500">
        Affichage de <span className="font-semibold text-slate-700">{startItem}</span> à{' '}
        <span className="font-semibold text-slate-700">{endItem}</span> sur{' '}
        <span className="font-semibold text-slate-700">{totalCount}</span> résultats
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!hasPrevious}
          onClick={() => onPageChange(currentPage - 1)}
          leftIcon={<ChevronLeft className="w-4 h-4" />}
        >
          Précédent
        </Button>

        <span className="text-xs font-medium text-slate-600 px-2">
          Page {currentPage} sur {Math.max(totalPages, 1)}
        </span>

        <Button
          variant="outline"
          size="sm"
          disabled={!hasNext}
          onClick={() => onPageChange(currentPage + 1)}
          rightIcon={<ChevronRight className="w-4 h-4" />}
        >
          Suivant
        </Button>
      </div>
    </div>
  );
};
