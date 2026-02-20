<script setup lang="ts">
import { ref } from "vue";

import { bus } from "@/bus";
import ModalWrap from "@/components/common/ModalWrap.vue";

const isOpen = ref(false);
const success = ref(false);
const packetHash = ref("");
const errorMessage = ref("");
const transferConfirmed = ref(false);

let pollTimer: ReturnType<typeof setInterval> | null = null;

const stopPolling = () => {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
};

const pollTransferStatus = (hash: string) => {
  transferConfirmed.value = false;
  stopPolling();

  const query = {
    query: `query TransferByPacketHash($packet_hash: String!) {
  v2_transfers(args: {p_packet_hash: $packet_hash}) {
    sender_canonical
    sender_display
    source_chain {
      universal_chain_id
    }
    transfer_send_transaction_hash
    receiver_canonical
    receiver_display
    destination_chain {
      universal_chain_id
    }
    transfer_send_timestamp
    transfer_recv_timestamp
    transfer_timeout_transaction_hash
    base_token
    base_amount
    quote_amount
    quote_token
    success
    traces {
      type
      height
      block_hash
      timestamp
      transaction_hash
      chain {
        universal_chain_id
        rpc_type
      }
    }
  }
}`,
    variables: { packet_hash: hash },
    operationName: "TransferByPacketHash"
  };

  const check = async () => {
    try {
      const res = await fetch(
        "https://graphql.union.build/v1/graphql",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(query)
        }
      );
      const data = await res.json();
      const transfers = data?.data?.v2_transfers;
      if (transfers && transfers.length > 0) {
        transferConfirmed.value = true;
        stopPolling();
      }
    } catch {
      // silently retry on next interval
    }
  };

  check();
  pollTimer = setInterval(
    check,
    5000
  );
};

bus.on(
  "bridge-success",
  (hash) => {
    success.value = true;
    packetHash.value = hash as string;
    errorMessage.value = "";
    transferConfirmed.value = false;
    isOpen.value = true;
    if (hash) {
      pollTransferStatus(hash as string);
    }
  }
);

bus.on(
  "bridge-error",
  (err) => {
    success.value = false;
    packetHash.value = "";
    errorMessage.value = String(err) || "Transaction failed";
    transferConfirmed.value = false;
    stopPolling();
    isOpen.value = true;
  }
);

const close = () => {
  isOpen.value = false;
  stopPolling();
};
</script>

<template>
  <ModalWrap :visible="isOpen">
    <div class="bg-grey-400 w-full rounded-md max-h-screen overflow-auto">
      <div class="px-10 py-12 bg-grey-400 rounded w-screen max-w-[25rem]">
        <div class="flex flex-col gap-6 relative">
          <!-- Success -->
          <template v-if="success">
            <span class="text-gradient font-termina text-700 text-center">Bridge TX Submitted</span>
            <p class="text-grey-100 text-center text-200">
              Your bridge transaction has been submitted successfully.
            </p>
            <div v-if="packetHash" class="flex items-center justify-center gap-3">
              <a
                :href="'https://app.union.build/explorer/transfers/' + packetHash"
                target="_blank"
                rel="noopener"
                class="text-light text-200 underline hover:opacity-70 duration-150"
              >
                View Transfer on Union Explorer
              </a>
              <Icon v-if="!transferConfirmed" icon="loading" :size="1.2" />
              <Icon v-else icon="check" :size="1.2" class="text-green-200" />
            </div>
          </template>

          <!-- Failure -->
          <template v-else>
            <span class="text-neg-200 font-termina text-700 text-center">Bridging Failed</span>
            <p class="text-grey-100 text-center text-200">
              {{ errorMessage }}
            </p>
          </template>

          <div class="flex flex-col gap-4">
            <button
              class="px-6 py-4 rounded text-light text-300 text-center bg-grey-200 w-full hover:opacity-50 duration-150 ease-in-out"
              @click="close"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  </ModalWrap>
</template>
