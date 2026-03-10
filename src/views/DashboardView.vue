<script lang="ts" setup>
import DashboardFilters from "@/components/dashboard/DashboardFilters.vue";
import StatsCard from "@/components/dashboard/StatsCard.vue";
import TransferChart from "@/components/dashboard/TransferChart.vue";
import TransferTable from "@/components/dashboard/TransferTable.vue";
import { useDashboard } from "@/composables/useDashboard";

const {
  tokenFilter,
  routeFilter,
  timeRange,
  filteredTransfers,
  transfersLoading,
  chartData,
  statsLoading,
  totalTransfers,
  successRate,
  medianLatency,
  currentPage,
  nextPage,
  prevPage,
  resetPagination,
  hasNextPage,
  hasPrevPage
} = useDashboard();
</script>

<template>
  <div class="flex flex-col w-full pb-12 gap-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4">
      <h1 class="text-400 font-semibold">Bridge Dashboard</h1>
      <DashboardFilters
        v-model:token-filter="tokenFilter"
        v-model:route-filter="routeFilter"
        v-model:time-range="timeRange"
        @reset="resetPagination"
      />
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatsCard
        label="Total Transfers"
        :value="totalTransfers"
        :subtitle="`Last ${timeRange} days`"
        :loading="statsLoading"
      />
      <StatsCard
        label="Success Rate"
        :value="successRate != null ? `${successRate}%` : null"
        subtitle="Based on recent transfers"
        :loading="transfersLoading"
      />
      <StatsCard
        label="Avg Bridge Time"
        :value="medianLatency != null ? `${medianLatency}s` : null"
        subtitle="Median end-to-end"
      />
      <StatsCard
        label="Active Routes"
        value="4"
        subtitle="AtomOne, Ethereum, Base"
      />
    </div>

    <!-- Chart -->
    <TransferChart :data="chartData" :loading="statsLoading" />

    <!-- Transfer History Table -->
    <TransferTable
      :transfers="filteredTransfers"
      :loading="transfersLoading"
      :has-next-page="hasNextPage"
      :has-prev-page="hasPrevPage"
      :current-page="currentPage"
      @next="nextPage"
      @prev="prevPage"
    />
  </div>
</template>
