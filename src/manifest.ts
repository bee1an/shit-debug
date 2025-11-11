import fs from 'fs-extra'
import type { Manifest } from 'webextension-polyfill'
import type PkgType from '../package.json'
import { isDev, port, r } from '../scripts/utils'

export async function getManifest() {
  const pkg = await fs.readJSON(r('package.json')) as typeof PkgType

  // update this file to update this manifest.json
  // can also be conditional based on your need
  const manifest: Manifest.WebExtensionManifest = {
    manifest_version: 3,
    name: pkg.displayName || pkg.name,
    version: pkg.version,
    description: pkg.description,
    applications: {
      gecko: {
        update_url: 'https://raw.githubusercontent.com/bee1an/shit-debug/refs/heads/main/updates.xml',
      },
    },
    action: {
      default_icon: 'assets/icon-512.png',
      default_popup: 'dist/popup/index.html',
    },
    options_ui: {
      page: 'dist/options/index.html',
      open_in_tab: true,
    },
    background: {
      service_worker: 'dist/background/index.mjs',
    },
    icons: {
      16: 'assets/icon-512.png',
      48: 'assets/icon-512.png',
      128: 'assets/icon-512.png',
    },
    permissions: [
      'tabs',
      'storage',
      'activeTab',
      'scripting',
      'webRequest',
    ],
    host_permissions: ['*://*/*'],
    content_scripts: [
      {
        matches: [
          '<all_urls>',
        ],
        js: [
          'dist/contentScripts/index.global.js',
        ],
      },
    ],
    web_accessible_resources: [
      {
        resources: ['dist/contentScripts/style.css'],
        matches: ['<all_urls>'],
      },
    ],
    content_security_policy: {
      extension_pages: isDev
        // this is required on dev for Vite script to load
        ? `script-src \'self\' http://localhost:${port}; object-src \'self\'`
        : 'script-src \'self\'; object-src \'self\'',
    },
  }

  // 注释掉侧边栏配置，优先使用popup
  // if (isFirefox) {
  //   manifest.sidebar_action = {
  //     default_panel: 'dist/sidepanel/index.html',
  //   }
  // }
  // else {
  //   // the sidebar_action does not work for chromium based
  //   (manifest as any).side_panel = {
  //     default_path: 'dist/sidepanel/index.html',
  //   }
  // }

  return manifest
}
