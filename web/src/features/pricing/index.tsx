/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { useCallback, useMemo, useState } from 'react'

import { PublicLayout } from '@/components/layout'
import { PageTransition } from '@/components/page-transition'
import { cn } from '@/lib/utils'

import {
  LoadingSkeleton,
  EmptyState,
  PricingTable,
  PricingSidebar,
  PricingToolbar,
  PricingHero,
  ModelCardGrid,
  ModelDetailsDrawer,
} from './components'
import { EXCLUDED_GROUPS, VIEW_MODES } from './constants'
import { useFilters } from './hooks/use-filters'
import { usePricingData } from './hooks/use-pricing-data'
import { pricingLayout } from './lib/layout'

function PricingAtmosphere() {
  return (
    <>
      <div
        aria-hidden
        data-slot='pricing-atmosphere-fill'
        className={pricingLayout.atmosphereFill}
      />
      <div
        aria-hidden
        data-slot='pricing-atmosphere-glow'
        className={pricingLayout.atmosphereGlow}
        style={{
          background: [
            'radial-gradient(ellipse 70% 55% at 18% 12%, oklch(0.72 0.18 280 / 90%) 0%, transparent 72%)',
            'radial-gradient(ellipse 55% 45% at 82% 8%, oklch(0.65 0.16 250 / 70%) 0%, transparent 70%)',
            'radial-gradient(ellipse 50% 40% at 48% 42%, oklch(0.70 0.14 290 / 50%) 0%, transparent 72%)',
          ].join(', '),
        }}
      />
      <div
        aria-hidden
        data-slot='pricing-atmosphere-grid'
        className={pricingLayout.atmosphereGrid}
      />
    </>
  )
}

export function Pricing() {
  const [selectedModelName, setSelectedModelName] = useState<string | null>(
    null
  )

  const {
    models,
    vendors,
    groupRatio,
    usableGroup,
    endpointMap,
    autoGroups,
    isLoading,
    priceRate,
    usdExchangeRate,
  } = usePricingData()

  const {
    searchInput,
    sortBy,
    vendorFilter,
    groupFilter,
    quotaTypeFilter,
    endpointTypeFilter,
    tagFilter,
    tokenUnit,
    viewMode,
    showRechargePrice,
    setSearchInput,
    setSortBy,
    setVendorFilter,
    setGroupFilter,
    setQuotaTypeFilter,
    setEndpointTypeFilter,
    setTagFilter,
    setTokenUnit,
    setViewMode,
    setShowRechargePrice,
    filteredModels,
    hasActiveFilters,
    activeFilterCount,
    availableTags,
    clearFilters,
    clearSearch,
  } = useFilters(models || [])

  const handleModelClick = useCallback((modelName: string) => {
    setSelectedModelName(modelName)
  }, [])

  const selectedModel = useMemo(
    () =>
      selectedModelName
        ? (models || []).find(
            (model) => model.model_name === selectedModelName
          ) || null
        : null,
    [models, selectedModelName]
  )

  const availableGroups = useMemo(
    () =>
      Object.keys(usableGroup || {}).filter(
        (g) => !EXCLUDED_GROUPS.includes(g)
      ),
    [usableGroup]
  )

  const handleClearAll = useCallback(() => {
    clearFilters()
    clearSearch()
  }, [clearFilters, clearSearch])

  const renderPricingContent = () => {
    if (filteredModels.length === 0) {
      return (
        <EmptyState
          searchQuery={searchInput}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={handleClearAll}
        />
      )
    }

    if (viewMode === VIEW_MODES.CARD) {
      return (
        <ModelCardGrid
          models={filteredModels}
          onModelClick={handleModelClick}
          priceRate={priceRate}
          usdExchangeRate={usdExchangeRate}
          tokenUnit={tokenUnit}
          showRechargePrice={showRechargePrice}
          selectedGroup={groupFilter}
        />
      )
    }

    return (
      <PricingTable
        models={filteredModels}
        priceRate={priceRate}
        usdExchangeRate={usdExchangeRate}
        tokenUnit={tokenUnit}
        showRechargePrice={showRechargePrice}
        selectedGroup={groupFilter}
        onModelClick={handleModelClick}
      />
    )
  }

  const sidebarProps = {
    quotaTypeFilter,
    endpointTypeFilter,
    vendorFilter,
    groupFilter,
    tagFilter,
    onQuotaTypeChange: setQuotaTypeFilter,
    onEndpointTypeChange: setEndpointTypeFilter,
    onVendorChange: setVendorFilter,
    onGroupChange: setGroupFilter,
    onTagChange: setTagFilter,
    vendors: vendors || [],
    groups: availableGroups,
    groupRatios: groupRatio,
    tags: availableTags,
    models: models || [],
    hasActiveFilters,
    onClearFilters: clearFilters,
  }

  return (
    <PublicLayout showMainContainer={false}>
      <div className={pricingLayout.pageShell}>
        <PricingAtmosphere />
        <PageTransition className={cn('relative', pricingLayout.pageContainer)}>
          {isLoading ? (
            <LoadingSkeleton viewMode={viewMode} />
          ) : (
            <div className={pricingLayout.pageGrid}>
              <PricingSidebar
                {...sidebarProps}
                className={pricingLayout.sidebarSticky}
              />

              <div className='min-w-0'>
                <PricingHero
                  modelCount={models?.length || 0}
                  searchInput={searchInput}
                  onSearchChange={setSearchInput}
                  onSearchClear={clearSearch}
                />

                <div className='flex flex-col gap-4'>
                  <PricingToolbar
                    filteredCount={filteredModels.length}
                    totalCount={models?.length}
                    sortBy={sortBy}
                    onSortChange={setSortBy}
                    tokenUnit={tokenUnit}
                    onTokenUnitChange={setTokenUnit}
                    showRechargePrice={showRechargePrice}
                    onRechargePriceChange={setShowRechargePrice}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    quotaTypeFilter={quotaTypeFilter}
                    endpointTypeFilter={endpointTypeFilter}
                    vendorFilter={vendorFilter}
                    groupFilter={groupFilter}
                    tagFilter={tagFilter}
                    onQuotaTypeChange={setQuotaTypeFilter}
                    onEndpointTypeChange={setEndpointTypeFilter}
                    onVendorChange={setVendorFilter}
                    onGroupChange={setGroupFilter}
                    onTagChange={setTagFilter}
                    vendors={vendors || []}
                    groups={availableGroups}
                    groupRatios={groupRatio}
                    tags={availableTags}
                    models={models || []}
                    hasActiveFilters={hasActiveFilters}
                    activeFilterCount={activeFilterCount}
                    onClearFilters={clearFilters}
                  />

                  {renderPricingContent()}
                </div>
              </div>
            </div>
          )}

          {selectedModel && (
            <ModelDetailsDrawer
              open={Boolean(selectedModel)}
              onOpenChange={(open) => {
                if (!open) setSelectedModelName(null)
              }}
              model={selectedModel}
              groupRatio={groupRatio || {}}
              usableGroup={usableGroup || {}}
              endpointMap={
                (endpointMap as Record<
                  string,
                  { path?: string; method?: string }
                >) || {}
              }
              autoGroups={autoGroups || []}
              priceRate={priceRate ?? 1}
              usdExchangeRate={usdExchangeRate ?? 1}
              tokenUnit={tokenUnit}
              showRechargePrice={showRechargePrice}
            />
          )}
        </PageTransition>
      </div>
    </PublicLayout>
  )
}
