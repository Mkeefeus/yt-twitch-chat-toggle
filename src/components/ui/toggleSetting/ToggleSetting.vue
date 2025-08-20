<script setup lang="ts">
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface Props {
  id: string;
  label: string;
  modelValue: boolean;
  description?: string;
}

interface Emits {
  'update:modelValue': [value: boolean];
}

defineProps<Props>();
defineEmits<Emits>();
</script>

<template>
  <div class="flex items-start justify-between gap-3">
    <div class="flex-1">
      <Label :for="id" class="text-sm font-medium cursor-pointer">
        {{ label }}
      </Label>
      <p v-if="description" class="text-xs text-muted-foreground mt-1">
        {{ description }}
      </p>
    </div>
    <Switch 
      :id="id" 
      :checked="modelValue"
      @update:checked="$emit('update:modelValue', $event)"
      class="flex-shrink-0"
    />
  </div>
</template>
