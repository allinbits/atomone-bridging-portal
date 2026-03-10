<script lang="ts" setup>
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import ChainBadge from "@/components/dashboard/ChainBadge.vue";
import StatusBadge from "@/components/dashboard/StatusBadge.vue";
import type { Transfer } from "@/union/dashboard-graphql";

dayjs.extend(relativeTime);

defineProps<{
  transfers: Transfer[];
  loading?: boolean;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  currentPage: number;
}>();

const emit = defineEmits<{
  (e: "next"): void;
  (e: "prev"): void;
}>();

const truncateAddr = (addr: string) => {
  if (!addr) return "--";
  if (addr.length <= 16) return addr;
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
};

const formatAmount = (amount: string, decimals: number | null) => {
  if (!amount) return "--";
  const dec = decimals ?? 6;
  const num = Number(amount) / Math.pow(10, dec);
  if (num === 0) return "0";
  if (num < 0.001) return "< 0.001";
  return num.toLocaleString(undefined, { maximumFractionDigits: 3 });
};

const formatTime = (timestamp: string | null) => {
  if (!timestamp) return "--";
  return dayjs(timestamp).fromNow();
};

const explorerUrl = (packetHash: string) => {
  return `https://app.union.build/explorer/transfers/${packetHash}`;
};
</script>

<template>
  <div class="bg-grey-300 rounded-lg p-5">
    <h3 class="text-200 font-semibold mb-4">Transfer History</h3>

    <!-- Loading -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 5" :key="i" class="h-12 bg-grey-200 rounded animate-pulse"></div>
    </div>

    <!-- Empty -->
    <div v-else-if="!transfers.length" class="py-8 text-center text-grey-100 text-100">
      No transfers found
    </div>

    <!-- Table -->
    <div v-else class="overflow-x-auto">
      <table class="w-full text-100">
        <thead>
          <tr class="text-grey-50 text-75 uppercase tracking-wide border-b border-grey-200">
            <th class="text-left py-3 px-2 font-medium">Time</th>
            <th class="text-left py-3 px-2 font-medium">Token</th>
            <th class="text-right py-3 px-2 font-medium">Amount</th>
            <th class="text-left py-3 px-2 font-medium">From</th>
            <th class="text-left py-3 px-2 font-medium">To</th>
            <th class="text-left py-3 px-2 font-medium">Sender</th>
            <th class="text-left py-3 px-2 font-medium">Receiver</th>
            <th class="text-center py-3 px-2 font-medium">Status</th>
            <th class="text-center py-3 px-2 font-medium">Link</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="t in transfers"
            :key="t.packet_hash"
            class="border-b border-grey-200 hover:bg-grey-400 transition-colors"
          >
            <td class="py-3 px-2 text-grey-50 whitespace-nowrap">{{ formatTime(t.transfer_send_timestamp) }}</td>
            <td class="py-3 px-2 font-medium whitespace-nowrap">{{ t.token_symbol || "--" }}</td>
            <td class="py-3 px-2 text-right whitespace-nowrap">{{ formatAmount(t.base_amount, t.token_decimals) }}</td>
            <td class="py-3 px-2"><ChainBadge :chain-id="t.source_universal_chain_id" /></td>
            <td class="py-3 px-2"><ChainBadge :chain-id="t.destination_universal_chain_id" /></td>
            <td class="py-3 px-2 text-grey-50 whitespace-nowrap" :title="t.sender_display">{{ truncateAddr(t.sender_display) }}</td>
            <td class="py-3 px-2 text-grey-50 whitespace-nowrap" :title="t.receiver_display">{{ truncateAddr(t.receiver_display) }}</td>
            <td class="py-3 px-2 text-center"><StatusBadge :success="t.success" /></td>
            <td class="py-3 px-2 text-center">
              <a
                :href="explorerUrl(t.packet_hash)"
                target="_blank"
                rel="noopener noreferrer"
                class="text-accent-100 hover:underline text-75"
              >
                View
              </a>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div class="flex items-center justify-between mt-4 pt-3 border-t border-grey-200">
        <button
          :disabled="!hasPrevPage"
          class="text-100 px-3 py-1.5 rounded"
          :class="hasPrevPage ? 'text-light hover:bg-grey-200 cursor-pointer' : 'text-grey-200 cursor-default'"
          @click="emit('prev')"
        >
          Previous
        </button>
        <span class="text-75 text-grey-50">Page {{ currentPage + 1 }}</span>
        <button
          :disabled="!hasNextPage"
          class="text-100 px-3 py-1.5 rounded"
          :class="hasNextPage ? 'text-light hover:bg-grey-200 cursor-pointer' : 'text-grey-200 cursor-default'"
          @click="emit('next')"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</template>
