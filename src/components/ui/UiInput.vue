<template>
  <label
    v-bind="$attrs"
    class="z-1 relative flex gap-3"
    :class="variant === 'col' ? 'flex-col' : 'flex-row items-center'"
  >
    <div class="grow-0">{{ label }}</div>
    <input
      v-model="model"
      :placeholder="props.placeholder"
      class="rounded bg-grey-300 p-4 outline-none border border-transparent focus:border-light w-full"
      :class="[props.variant === 'row' && 'max-w-32', props.disabled && 'opacity-50 cursor-not-allowed']"
      :type="props.type"
      :min="props.type === 'number' ? props.min : undefined"
      :max="props.type === 'number' ? props.max : undefined"
      :disabled="props.disabled"
      @focus="focusHandler(true)"
      @blur="focusHandler(false)"
      @input="(e: Event) => { const v = (e.target as HTMLInputElement).valueAsNumber; if (!isNaN(v)) model = MaxValue(MinValue(v)); }"
    />
  </label>
  <Transition
    enter-from-class="opacity-0"
    leave-to-class="opacity-0"
    enter-active-class="transition duration-300"
    leave-active-class="transition duration-300"
  >
    <p v-if="isError" class="text-body-reg text-red-300 mt-4">{{ errorMessage }}</p>
  </Transition>
</template>

<script lang="ts" setup>
import { computed, ref } from "vue";

interface Props {
  modelValue: string | number | null;
  type?: string;
  variant?: "col" | "row";
  label?: string;
  placeholder?: string;
  isError?: boolean;
  errorMessage?: string;
  min?: number;
  max?: number;
  disabled?: boolean;
}
const props = withDefaults(
  defineProps<Props>(),
  {
    modelValue: "",
    type: "text",
    variant: "col",
    label: "",
    placeholder: "",
    isError: false,
    errorMessage: "Input Error",
    min: 0,
    max: 1,
    icon: null,
    disabled: false
  }
);

const focused = ref(false);

const MinValue = (val: number) => {
  return Math.min(
    props.max,
    val
  );
};
const MaxValue = (val: number) => {
  return Math.max(
    props.min,
    val
  );
};

const emit = defineEmits([
  "update:modelValue",
  "focus"
]);
const model = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit(
      "update:modelValue",
      value
    );
  }
});

const focusHandler = (isFocused: boolean) => {
  emit(
    "focus",
    isFocused
  );
  focused.value = isFocused;
};

// TODO: error system
</script>

<style scoped>
/* Chrome, Safari, Edge, Opera */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Firefox */
input[type="number"] {
  -moz-appearance: textfield;
}
</style>
