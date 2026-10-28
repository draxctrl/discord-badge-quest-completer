<script setup lang="ts">
import { ref, watch } from 'vue';

const props = withDefaults(defineProps<{
  modelValue: number;
  min: number;
  max: number;
  step?: number;
  label: string;
  unit?: string;
}>(), { step: 1 });

const emit = defineEmits<{ 'update:modelValue': [value: number] }>();

const text = ref(String(props.modelValue));
watch(() => props.modelValue, value => (text.value = String(value)));

function clamp(value: number) {
  return Math.min(props.max, Math.max(props.min, Math.round(value)));
}

function commit(value: number) {
  const next = clamp(value);
  text.value = String(next);
  emit('update:modelValue', next);
}

function onInput(event: Event) {
  // Digits only; the number is applied on blur/Enter so typing "12" never passes through a clamped "1".
  text.value = (event.target as HTMLInputElement).value.replace(/[^0-9]/g, '');
}

function onCommit() {
  commit(text.value === '' ? props.min : Number(text.value));
}

function bump(direction: 1 | -1) {
  commit((text.value === '' ? props.modelValue : Number(text.value)) + direction * props.step);
}
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <span class="font-semibold">{{ label }}</span>
    <div class="stepper">
      <button type="button" class="stepper-btn" :disabled="modelValue <= min" :aria-label="`Decrease ${label}`" @click="bump(-1)">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8h9" /></svg>
      </button>
      <input
        :value="text"
        type="text"
        inputmode="numeric"
        role="spinbutton"
        :aria-label="label"
        :aria-valuemin="min"
        :aria-valuemax="max"
        :aria-valuenow="modelValue"
        class="stepper-input"
        @input="onInput"
        @blur="onCommit"
        @keydown.enter.prevent="onCommit"
        @keydown.up.prevent="bump(1)"
        @keydown.down.prevent="bump(-1)"
      />
      <span v-if="unit" class="pr-1 text-sm text-faint">{{ unit }}</span>
      <button type="button" class="stepper-btn" :disabled="modelValue >= max" :aria-label="`Increase ${label}`" @click="bump(1)">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8h9M8 3.5v9" /></svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.stepper {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  border-radius: 12px;
  border: 1px solid var(--color-line);
  background: var(--color-ink);
  transition: border-color 120ms;
}
.stepper:focus-within { border-color: var(--color-flame); }

.stepper-input {
  min-width: 0;
  flex: 1;
  background: transparent;
  border: 0;
  color: var(--color-cream);
  text-align: center;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  padding: 0.35rem 0.25rem;
}
.stepper-input:focus { outline: none; }

.stepper-btn {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  border: 1px solid var(--color-line-soft);
  background: var(--color-raised);
  color: var(--color-cream);
  transition: background-color 120ms, color 120ms, transform 120ms;
}
.stepper-btn svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
}
.stepper-btn:hover:not(:disabled) { background: var(--color-flame); color: #1a0c04; }
.stepper-btn:active:not(:disabled) { transform: scale(0.94); }
.stepper-btn:disabled { opacity: 0.35; }
</style>
