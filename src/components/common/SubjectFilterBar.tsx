import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Filter, Search, X } from 'lucide-react';

export interface SubjectCountItem {
  name: string;
  count: number;
}

interface SubjectFilterBarProps {
  allLabel: string;
  items: SubjectCountItem[];
  selected: string;
  onSelect: (subject: string) => void;
  maxInlinePills?: number;
  showIcon?: boolean;
  className?: string;
}

export const SubjectFilterBar: React.FC<SubjectFilterBarProps> = ({
  allLabel,
  items,
  selected,
  onSelect,
  maxInlinePills = 5,
  showIcon = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const hasOverflow = items.length > maxInlinePills;

  // Sort by item count descending, then alphabetically so top popular subjects stay pinned
  const sortedItems = useMemo(
    () =>
      [...items].sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.name.localeCompare(b.name);
      }),
    [items]
  );

  const visiblePills = useMemo(() => {
    if (!hasOverflow) return sortedItems;
    const top = sortedItems.slice(0, maxInlinePills);
    if (
      selected &&
      selected !== allLabel &&
      selected !== 'All' &&
      !top.some((item) => item.name === selected)
    ) {
      const activeItem = sortedItems.find((item) => item.name === selected);
      if (activeItem) {
        return [...top, activeItem];
      }
    }
    return top;
  }, [hasOverflow, sortedItems, maxInlinePills, selected, allLabel]);

  const filteredPopoverItems = useMemo(() => {
    const clean = query.trim().toLowerCase();
    const alphaSorted = [...items].sort((a, b) => a.name.localeCompare(b.name));
    if (!clean) return alphaSorted;
    return alphaSorted.filter((item) => item.name.toLowerCase().includes(clean));
  }, [items, query]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    const focusTimer = setTimeout(() => searchInputRef.current?.focus(), 20);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
      clearTimeout(focusTimer);
    };
  }, [isOpen]);

  if (items.length === 0) return null;

  const isAllSelected = selected === allLabel || selected === 'All';

  return (
    <div className={`flex flex-wrap items-center gap-1.5 text-xs ${className}`} ref={containerRef}>
      <span className="text-[11px] font-medium text-slate-500 mr-1 shrink-0 flex items-center gap-1">
        {showIcon && <Filter className="w-3.5 h-3.5" />}
        <span>Subject:</span>
      </span>

      <button
        type="button"
        onClick={() => {
          onSelect(allLabel);
          setIsOpen(false);
        }}
        className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
          isAllSelected
            ? 'bg-slate-900 text-white font-semibold'
            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80'
        }`}
      >
        {allLabel}
      </button>

      {visiblePills.map((item) => {
        const isActive = selected === item.name;
        return (
          <button
            key={item.name}
            type="button"
            onClick={() => {
              onSelect(item.name);
              setIsOpen(false);
            }}
            className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
              isActive
                ? 'bg-slate-900 text-white font-semibold'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80'
            }`}
          >
            <span>{item.name}</span>
            {hasOverflow && (
              <span
                className={`text-[10px] font-mono ${
                  isActive ? 'text-slate-300' : 'text-slate-400'
                }`}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}

      {hasOverflow && (
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setIsOpen((prev) => !prev);
            }}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1 border ${
              isOpen
                ? 'bg-blue-50 text-blue-700 border-blue-300'
                : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
            }`}
          >
            <Search className="w-3 h-3 text-slate-500" />
            <span>All Subjects ({items.length})</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {isOpen && (
            <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-72 sm:w-80 bg-white rounded-xl border border-slate-200 shadow-xl z-40 overflow-hidden">
              <div className="p-2.5 border-b border-slate-100 bg-slate-50/70 space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={`Search ${items.length} subjects...`}
                    className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      aria-label="Clear subject search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {!isAllSelected && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 truncate">
                      Active: <strong className="text-slate-800">{selected}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(allLabel);
                        setIsOpen(false);
                      }}
                      className="text-blue-600 hover:underline font-semibold shrink-0 ml-2 cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                )}
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-slate-50 p-1">
                {filteredPopoverItems.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500">
                    No subject matches "{query}"
                  </div>
                ) : (
                  filteredPopoverItems.map((item) => {
                    const isActive = selected === item.name;
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => {
                          onSelect(item.name);
                          setIsOpen(false);
                        }}
                        className={`w-full px-2.5 py-2 rounded-lg text-left text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-slate-900 text-white font-semibold'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span className="truncate">{item.name}</span>
                        <span className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                              isActive
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {item.count}
                          </span>
                          {isActive && <Check className="w-3.5 h-3.5" />}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

