<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { ToggleSetting } from '@/components/ui/toggleSetting';
import { Label } from '@/components/ui/label';
import { ref, computed } from 'vue';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select/';
import { useColorMode } from '@vueuse/core';

const emit = defineEmits<{
  back: []
}>();

// Use colorMode for applying themes
const { store } = useColorMode({
  initialValue: 'auto',
  storageKey: 'yt-twitch-chat-toggle-theme'
});

// Create a computed that shows the user preference, not the resolved value
const userPreference = computed({
  get: () => {
    // Return the stored preference, not the resolved value
    return store.value || 'auto';
  },
  set: (newValue: 'light' | 'dark' | 'auto') => {
    // Update the store directly
    store.value = newValue;
  }
});

// Sample settings state
const syncSettings = ref(false);
</script>

<template>
  <div class="min-w-[320px] min-h-[240px] max-h-[400px] p-4 space-y-4">
    <!-- Header with Back Button -->
    <div class="flex items-center gap-2 border-b pb-2">
      <Button variant="ghost" size="sm" @click="emit('back')" class="p-1">
        ← Back
      </Button>
      <h1 class="text-lg font-semibold flex-1 text-center">
        Settings
      </h1>
    </div>

    <!-- Settings Options -->
    <div class="space-y-4">
      <ToggleSetting id="sync-settings" label="Sync Settings" description="Sync your preferences across all devices"
        v-model="syncSettings" />

      <div class="flex items-start justify-between gap-3">
        <div class="flex-1">
          <Label class="text-sm font-medium cursor-pointer">
            Theme
          </Label>
          <p class="text-xs text-muted-foreground mt-1">
            Select your preferred theme
          </p>
        </div>
        <div class="flex-shrink-0">
          <Select v-model="userPreference">
            <SelectTrigger class="w-[120px]">
              <SelectValue placeholder="Select theme" />
            </SelectTrigger>
            <SelectContent side="bottom" align="end">
              <SelectItem value="light">☀️ Light</SelectItem>
              <SelectItem value="dark">🌙 Dark</SelectItem>
              <SelectItem value="auto">🖥️ System</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  </div>
</template>
