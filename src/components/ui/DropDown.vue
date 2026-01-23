<script lang="ts" setup>
import { computed, ref } from "vue";

interface DropDownItem {
  name: string;
  status?: string;
}

const model = defineModel<number>({ required: true });

const props = defineProps<{
  items: DropDownItem[];
}>();
const emits = defineEmits<{ (e: "select", value: number): void }>();
const open = ref<boolean>(false);

function handleSelect (index: number) {
  open.value = false;
  emits(
    "select",
    index
  );
}

const currentItems = computed(() => {
  return props.items.
    map((item, index) => ({
      ...item,
      index
    })).
    filter((item) => item.index !== model.value);
});

const getStatusColor = (status?: string) => {
  return status === "active"
    ? "bg-gradient-900"
    : "bg-red-400";
};
</script>

<template>
  <div class="relative flex flex-col min-w-56 select-none">
    <!-- Backdrop -->
    <Teleport to="body">
      <Transition name="bg">
        <div
          v-show="open"
          class="fixed w-screen h-screen top-0 left-0 z-[10000] bg-darkblur backdrop-blur-xs"
          @click="open = false"
        ></div>
      </Transition>
    </Teleport>

    <!-- Trigger button -->
    <div
      class="relative bg-grey-400 duration-200 rounded"
      :class="open ? ['hover:bg-grey-200'] : ['hover:bg-grey-200']"
    >
      <div class="flex flex-row justify-between cursor-pointer gap-3 px-5 py-4" @click="open = !open">
        <div>{{ props.items[model].name }}</div>
        <Icon icon="CaretDown" />
      </div>
    </div>

    <!-- Centered dropdown list -->
    <Teleport to="body">
      <Transition name="drop">
        <div
          v-if="open"
          class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10001] flex flex-col min-w-96 max-w-2xl max-h-[80vh] overflow-y-auto text-left px-5 py-4 bg-grey-200 rounded-sm shadow-2xl"
        >
          <div
            v-for="item in currentItems"
            :key="item.index"
            class="cursor-pointer py-3 hover:text-grey-50 text-200 flex flex-row gap-3 items-center"
            @click="handleSelect(item.index)"
          >
            <div
              v-if="item.status"
              class="w-2 h-2 rounded-full flex-shrink-0"
              :class="getStatusColor(item.status)"
            ></div>
            <span>{{ item.name }}</span>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.drop-enter-active,
.drop-leave-active {
  transition:
    transform 0.3s ease,
    color 0.15s ease;
  transition-delay: 180ms;
}

.drop-enter-from,
.drop-leave-to {
  transform: scaleY(0);
  color: transparent;
  transition-delay: 0ms;
}

.bg-enter-active,
.bg-leave-active {
  transition: opacity 0.3s ease;
}

.bg-enter-from,
.bg-leave-to {
  opacity: 0;
}

/* Custom thin scrollbar styling */
.overflow-y-auto {
  scrollbar-width: thin;
  scrollbar-color: #686868 transparent;
}

.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #686868;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #9F9F9F;
}
</style>
