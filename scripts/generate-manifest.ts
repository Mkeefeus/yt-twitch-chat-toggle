#!/usr/bin/env bun

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import packageJson from '../package.json';

interface ManifestV3 {
  $schema?: string;
  manifest_version: 3;
  name: string;
  version: string;
  description: string;
  permissions: string[];
  host_permissions?: string[];
  default_locale?: string;
  action?: {
    default_popup: string;
    default_icon: {
      '16': string;
      '48': string;
      '128': string;
    };
  };
  browser_action?: {
    default_popup: string;
    default_icon: {
      '16': string;
      '48': string;
      '128': string;
    };
  };
  content_scripts: Array<{
    matches: string[];
    js: string[];
  }>;
  background: {
    service_worker?: string;
    scripts?: string[];
    persistent?: boolean;
  };
  web_accessible_resources: Array<{
    resources: string[];
    matches: string[];
  }>;
  browser_specific_settings?: {
    gecko: {
      id: string;
      strict_min_version: string;
      data_collection_permissions?: {
        required: string[];
        optional?: string[];
      };
    };
  };
}

const baseManifest = {
  manifest_version: 3 as const,
  name: '__MSG_extension_name__',
  version: packageJson.version,
  description: '__MSG_extension_description__',
  permissions: ['storage', 'tabs'],
  host_permissions: ['https://www.youtube.com/*'],
  default_locale: 'en_US',
  action: {
    default_popup: 'popup.html',
    default_icon: {
      '16': 'icons/icon16.png',
      '48': 'icons/icon48.png',
      '128': 'icons/icon128.png'
    }
  },
  content_scripts: [
    {
      matches: ['https://www.youtube.com/*'],
      js: ['content.js']
    }
  ],
  web_accessible_resources: [
    {
      resources: ['prompt.html'],
      matches: ['https://www.youtube.com/*']
    }
  ]
};

function generateChromeManifest(): ManifestV3 {
  return {
    ...baseManifest,
    background: {
      service_worker: 'serviceworker.js'
    }
  };
}

function generateFirefoxManifest(): ManifestV3 {
  return {
    ...baseManifest,
    background: {
      scripts: ['serviceworker.js'],
      persistent: false
    },
    browser_specific_settings: {
      gecko: {
        id: 'yt-twitch-chat-toggle@mkeefeus.github.io',
        strict_min_version: '128.0',
        data_collection_permissions: {
          required: ['none']
        }
      }
    }
  };
}

function writeManifest(manifest: ManifestV3, outputPath: string): void {
  try {
    // Ensure directory exists
    const dir = outputPath.substring(0, outputPath.lastIndexOf('/'));
    mkdirSync(dir, { recursive: true });

    // Write manifest with proper formatting
    writeFileSync(outputPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log(`✅ Generated manifest: ${outputPath}`);
  } catch (error) {
    console.error(`❌ Failed to write manifest to ${outputPath}:`, error);
    process.exit(1);
  }
}

function main(): void {
  const browser = process.argv[2];
  const outputDir = 'dist';

  if (browser && browser !== 'chrome' && browser !== 'firefox') {
    console.error('❌ Please specify a valid browser: "chrome" or "firefox".');
    process.exit(1);
  }

  console.log('🚀 Generating browser manifests...');

  // Generate Chrome manifest
  if (!browser || browser === 'chrome') {
    const chromeManifest = generateChromeManifest();
    writeManifest(chromeManifest, join(outputDir, 'chrome', 'manifest.json'));
  }

  // Generate Firefox manifest
  if (!browser || browser === 'firefox') {
    const firefoxManifest = generateFirefoxManifest();
    writeManifest(firefoxManifest, join(outputDir, 'firefox', 'manifest.json'));
  }

  console.log('✨ All manifests generated successfully!');
  console.log(`📁 Output directory: ${outputDir}`);
  console.log('📋 Generated manifests:');
  if (!browser || browser === 'chrome') {
    console.log(`   - Chrome: ${join(outputDir, 'chrome', 'manifest.json')}`);
  }
  if (!browser || browser === 'firefox') {
    console.log(`   - Firefox: ${join(outputDir, 'firefox', 'manifest.json')}`);
  }
}

// Run the script
if (import.meta.main) {
  main();
}

export { generateChromeManifest, generateFirefoxManifest, writeManifest };
