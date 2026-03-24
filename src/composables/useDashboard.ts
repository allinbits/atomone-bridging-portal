import { useQuery } from "@tanstack/vue-query";
import { computed, ref } from "vue";

import {
  CHAIN_IDS,
  fetchAtomOneTransfers,
  fetchAtomOneTransferStats,
  fetchLatencyStats,
  type Transfer,
  type TransferStats
} from "@/union/dashboard-graphql";

export type TokenFilter = "all" | "ATONE" | "PHOTON";
export type RouteFilter = "all" | "atomone-ethereum" | "atomone-base";
export type TimeRange = 7 | 30 | 90;

export function useDashboard () {
  const tokenFilter = ref<TokenFilter>("all");
  const routeFilter = ref<RouteFilter>("all");
  const timeRange = ref<TimeRange>(30);
  const currentPage = ref(0);
  const cursors = ref<string[]>([]);

  // --- Transfer History ---
  const {
    data: transfers,
    isLoading: transfersLoading,
    error: transfersError
  } = useQuery({
    queryKey: computed(() => ["dashboard-transfers", routeFilter.value, currentPage.value, cursors.value[currentPage.value]]),
    queryFn: () => fetchAtomOneTransfers({
      route: routeFilter.value === "all" ? undefined : routeFilter.value,
      limit: 20,
      sortOrder: cursors.value[currentPage.value],
      comparison: "lt"
    }),
    staleTime: 30_000,
    refetchInterval: 60_000
  });

  // Client-side token filter on the fetched transfers
  const filteredTransfers = computed<Transfer[]>(() => {
    if (!transfers.value) return [];
    if (tokenFilter.value === "all") return transfers.value;
    return transfers.value.filter((t) => t.token_symbol === tokenFilter.value);
  });

  // --- Transfer Stats (for chart) ---
  const {
    data: transferStats,
    isLoading: statsLoading
  } = useQuery({
    queryKey: computed(() => ["dashboard-stats", timeRange.value]),
    queryFn: () => fetchAtomOneTransferStats(timeRange.value),
    staleTime: 300_000,
    refetchInterval: 300_000
  });

  // --- Latency Stats ---
  const { data: latencyEth } = useQuery({
    queryKey: ["dashboard-latency-eth"],
    queryFn: () => fetchLatencyStats(CHAIN_IDS.osmosis, CHAIN_IDS.ethereum),
    staleTime: 300_000
  });

  const { data: latencyBase } = useQuery({
    queryKey: ["dashboard-latency-base"],
    queryFn: () => fetchLatencyStats(CHAIN_IDS.osmosis, CHAIN_IDS.base),
    staleTime: 300_000
  });

  // --- Computed metrics ---
  const totalTransfers = computed(() => {
    if (!transferStats.value) return 0;
    return transferStats.value.reduce((sum, s) => sum + Number(s.total_transfers), 0);
  });

  const successRate = computed(() => {
    if (!transfers.value || transfers.value.length === 0) return null;
    const succeeded = transfers.value.filter((t) => t.success === true).length;
    const total = transfers.value.filter((t) => t.success !== null).length;
    return total > 0 ? Math.round((succeeded / total) * 100) : null;
  });

  const medianLatency = computed(() => {
    const eth = latencyEth.value?.[0]?.secs_until_packet_ack?.median;
    const base = latencyBase.value?.[0]?.secs_until_packet_ack?.median;
    const vals = [eth, base].filter((v): v is number => v != null);
    if (vals.length === 0) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  });

  // --- Chart data ---
  const chartData = computed(() => {
    if (!transferStats.value) return [];
    return aggregateChartData(transferStats.value, tokenFilter.value);
  });

  // --- Pagination ---
  function nextPage () {
    if (transfers.value && transfers.value.length > 0) {
      const lastSortOrder = transfers.value[transfers.value.length - 1].sort_order;
      const newCursors = [...cursors.value];
      newCursors[currentPage.value + 1] = lastSortOrder;
      cursors.value = newCursors;
      currentPage.value++;
    }
  }

  function prevPage () {
    if (currentPage.value > 0) {
      currentPage.value--;
    }
  }

  function resetPagination () {
    currentPage.value = 0;
    cursors.value = [];
  }

  return {
    // Filters
    tokenFilter,
    routeFilter,
    timeRange,

    // Data
    filteredTransfers,
    transfersLoading,
    transfersError,
    transferStats,
    statsLoading,
    chartData,

    // Metrics
    totalTransfers,
    successRate,
    medianLatency,
    latencyEth,
    latencyBase,

    // Pagination
    currentPage,
    nextPage,
    prevPage,
    resetPagination,
    hasNextPage: computed(() => (transfers.value?.length ?? 0) >= 20),
    hasPrevPage: computed(() => currentPage.value > 0)
  };
}

interface ChartPoint {
  date: string;
  total: number;
  atomoneToEth: number;
  ethToAtomone: number;
  atomoneToBase: number;
  baseToAtomone: number;
}

function aggregateChartData (stats: TransferStats[], _tokenFilter: TokenFilter): ChartPoint[] {
  const byDate = new Map<string, ChartPoint>();

  for (const s of stats) {
    const date = s.day_date;
    if (!byDate.has(date)) {
      byDate.set(date, { date, total: 0, atomoneToEth: 0, ethToAtomone: 0, atomoneToBase: 0, baseToAtomone: 0 });
    }
    const point = byDate.get(date)!;
    const count = Number(s.total_transfers);
    point.total += count;

    const src = s.source_universal_chain_id;
    const dest = s.destination_universal_chain_id;
    if (src === CHAIN_IDS.osmosis && dest === CHAIN_IDS.ethereum) point.atomoneToEth += count;
    else if (src === CHAIN_IDS.ethereum && dest === CHAIN_IDS.osmosis) point.ethToAtomone += count;
    else if (src === CHAIN_IDS.osmosis && dest === CHAIN_IDS.base) point.atomoneToBase += count;
    else if (src === CHAIN_IDS.base && dest === CHAIN_IDS.osmosis) point.baseToAtomone += count;
  }

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}
