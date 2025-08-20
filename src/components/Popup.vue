<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleSetting } from '@/components/ui/toggleSetting';
import Settings from '@/components/Settings.vue';
import { useColorMode } from '@vueuse/core';

// Navigation state
const currentPage = ref<'main' | 'settings'>('main');

// State variables (no logic, just placeholders)
const textInput = ref('');
const toggleEnabled = ref(true);
const showToggle = ref(true); // For conditional visibility
const extensionName = ref('Twitch Chat for YouTube');

const goToSettings = () => {
  currentPage.value = 'settings';
};

const goToMain = () => {
  currentPage.value = 'main';
};

// Initialize color mode (this applies the theme immediately)
useColorMode({
  initialValue: 'auto',
  storageKey: 'yt-twitch-chat-toggle-theme'
});

onMounted(() => {
  if (typeof chrome !== 'undefined' && chrome.i18n) {
    extensionName.value = chrome.i18n.getMessage('extension_name');
  }
});
</script>

<template>
  <div class="overflow-hidden relative">
    <Transition enter-active-class="transition-all duration-200 ease-out"
      leave-active-class="transition-all duration-200 ease-out" enter-from-class="opacity-0 translate-x-5"
      enter-to-class="opacity-100 translate-x-0" leave-from-class="opacity-100 translate-x-0"
      leave-to-class="opacity-0 -translate-x-5" mode="out-in">
      <!-- Main Page -->
      <div v-if="currentPage === 'main'" key="main" class="min-w-[320px] min-h-[240px] max-h-[400px] p-4 space-y-4">
        <!-- Title -->
        <h1 class="text-lg font-semibold text-center border-b pb-2">
          {{ extensionName }}
        </h1>

        <div class="flex gap-2">
          <Input v-model="textInput" placeholder="Enter channel name..." class="flex-1" />
          <Button variant="default" size="sm">
            Add
          </Button>
        </div>

        <div v-if="showToggle">
          <ToggleSetting id="chat-toggle" label="Use Twitch Chat"
            description="Enable Twitch chat integration for YouTube" v-model="toggleEnabled" />
        </div>

        <div class="pt-2 border-t">
          <Button variant="outline" class="w-full" @click="goToSettings">
            Settings
          </Button>
        </div>
      </div>

      <!-- Settings Page -->
      <Settings 
        v-else-if="currentPage === 'settings'" 
        key="settings" 
        @back="goToMain" 
      />
    </Transition>
  </div>
</template>