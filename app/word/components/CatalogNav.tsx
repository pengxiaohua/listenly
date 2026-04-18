'use client';

import CourseFilter, { type LevelType, type ProFilterType } from '@/components/common/CourseFilter';
import SortFilter, { type SortType } from '@/components/common/SortFilter';
import { LiquidTabs } from '@/components/ui/liquid-tabs';
import type { CatalogFirst, CatalogSecond, CatalogThird } from '../lib/types';

interface CatalogNavProps {
  catalogs: CatalogFirst[];
  availableSeconds: CatalogSecond[];
  availableThirds: CatalogThird[];
  selectedFirstId: string;
  selectedSecondId: string;
  selectedThirdId: string;
  filterLevels: LevelType[];
  filterPro: ProFilterType[];
  sortBy: SortType;
  isMobile: boolean;
  onSelectFirst: (id: string) => void;
  onSelectSecond: (id: string) => void;
  onSelectThird: (id: string) => void;
  onChangeLevels: (levels: LevelType[]) => void;
  onChangePro: (filters: ProFilterType[]) => void;
  onChangeSort: (sort: SortType) => void;
  onFeedbackClick: () => void;
}

export default function CatalogNav({
  catalogs,
  availableSeconds,
  availableThirds,
  selectedFirstId,
  selectedSecondId,
  selectedThirdId,
  filterLevels,
  filterPro,
  sortBy,
  isMobile,
  onSelectFirst,
  onSelectSecond,
  onSelectThird,
  onChangeLevels,
  onChangePro,
  onChangeSort,
  onFeedbackClick,
}: CatalogNavProps) {
  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
      <div className="container mx-auto py-3 relative px-2 sm:px-0">
        <div className="absolute top-3 right-2 sm:right-0 flex items-center gap-1 md:gap-2">
          <button
            onClick={onFeedbackClick}
            className="text-sm text-indigo-500 hover:text-indigo-600 hover:underline cursor-pointer hidden md:block"
          >
            没找到想要的课程？
          </button>
          <CourseFilter
            selectedLevels={filterLevels}
            selectedProFilters={filterPro}
            onLevelsChange={onChangeLevels}
            onProFiltersChange={onChangePro}
            size={isMobile ? 'sm' : 'md'}
          />
          <SortFilter
            sortBy={sortBy}
            onSortChange={onChangeSort}
            size={isMobile ? 'sm' : 'md'}
            className="hidden md:block"
          />
        </div>

        <div>
          <LiquidTabs
            items={[
              { value: 'ALL', label: '全部' },
              ...catalogs.map((cat) => ({ value: String(cat.id), label: cat.name })),
            ]}
            value={selectedFirstId}
            onValueChange={onSelectFirst}
            size={isMobile ? 'sm' : 'md'}
            align="left"
            className="overflow-x-auto"
            id="first"
          />
        </div>

        {selectedFirstId && availableSeconds.length > 0 && (
          <div className="mt-2">
            <LiquidTabs
              items={[
                { value: '', label: '全部' },
                ...availableSeconds.map((cat) => ({ value: String(cat.id), label: cat.name })),
              ]}
              value={selectedSecondId || ''}
              onValueChange={onSelectSecond}
              size="sm"
              align="left"
              className="overflow-x-auto"
              id="second"
            />
          </div>
        )}

        {selectedSecondId && availableThirds.length > 0 && (
          <div className="mt-2">
            <LiquidTabs
              items={[
                { value: '', label: '全部' },
                ...availableThirds.map((cat) => ({ value: String(cat.id), label: cat.name })),
              ]}
              value={selectedThirdId || ''}
              onValueChange={onSelectThird}
              size="sm"
              align="left"
              className="overflow-x-auto"
              id="third"
            />
          </div>
        )}
      </div>
    </div>
  );
}
