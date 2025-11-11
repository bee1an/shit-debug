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
    // @ts-expect-error let me do it
    key: `MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCYZLB+/mZBvH8/XK8zcnEURn3VVkvi/kwDMrkXgqMcqSv6rht+6dDH6GWj94YvVts99Hdd5G0oVRljTef0X2A3SKoz415eDSE11ytE/1RpVQPthWqh5Ld2nj6IdELL2VxGT/3T6Mjet8JG5Koc5uvqWybTHRAXFPIKISt1vnBuuoZOc3N7l5qQW0GveUGnwieJHAu4CcHFXWW2wjmhvzt/5aewwDobOMJStq1+lpNimvoEcUNn3HXIxCJM3iMQVt7Cx++w5Swv6o9iSe3EGurGaVDa2rKrvZoFVUdenFwY33uwED/Q01juXyZfdJah5zfFBd+bkXXNJS2VRXJxlSJTAgMBAAECggEADcFc6wGUgk983t/DUq38Rfu85PJGpEUW4F0GNviMN4yPky9+/NwnA7xW3E991a0N2hBEa/2v2qmfwoZoLvci7KqK7mcSAARIYJ884Rv45w8M7TYTM2y9IKBU/aUc2GCUwyX6P9Ptuai1iQef0T8IwV0b6odfie3SkRaAYT7g0CWzQskxcwkqfWjoo37s7dhyHhLfM9Xpnuo11Vpt1FuikNjxX8StuHBk7LynZ5I46Of5kO3RuP1pzWOA4tkliFiqlzL3+mye9NsLEzbdlO6gG87K4vnDyI+oM6P4Ls+GgtF7Rl7LPfmYDM/LHSxvTlRdg4a/0uU27INLAMDwbM9PrQKBgQDO4rMSWWRd8a8+ag/flBLILeK+g0c9MjrYKL0lAYYPlEE89S7geZ2OQUBUrF+N7D8adZN6yUKI/epBKnqSJ/hNJWBOxX9VaVKm+9N6uGwbD6ku5OhoiwcXwSmAtEYFsEO8mXWhohPBQAVoJ2HFseU/EO4pMC+cwfPf2GMkD6AQXwKBgQC8kkTsjzUu4FkM4fBMuuNIqDvzfFVmIy/ZgGt2yQ5PUjTR30o57SlUABVhceuG5U1ggOSi6aLe2Cq6n/8bC6F/gnZ8fFNHVoejlH1LvO7WL8E/2lnyQ1upLihdZ9so445kR5x5UkN5t2bsgRmRcKN8Hb1sY61qcROuMsVNrfCijQKBgDrR94nLAp83HNUJALRXfDOP4Dy8RF/gzRwyEPzZfw0k4Jt9NjO6QBJ2+NxaGdzXA2X5cdHiMNmUH6shcbHmTVFZxBUBT9+vz0EMribhElNrU3WyvWUjygN19t/R4Wqyn7+affhThXxXQHJJaCH2HzCcFqp9Obw+5KCK/Dz/eEnPAoGBAKczksWmXWPJLWyM0cNXWrxL34yPzDEaNg1HHwJeV7/hhlApCum97g07XbnfhxU/MJLG9vO08eNiDNEZmNtkPriO93x9yGHSycYznb2QMr3b7iAt/d8f9qBV+xiHQ/5HdzRXgtjYJlhAVJSUDBW3qF4fCJyY7WUaCndFMUklV97pAoGAcD51cVaC0fLW2TQul6x+jhjJkPgu/Or2hvLgp2mQAScXCdI14GBbUvhcCMpqqob4VSK6OZu2o4ZMHIuxWWTfFeOwRDS4sorXuMFnlg7KWdFRAH537CznBGRqjAMcNlhaOmMyXd3QrhXRBlPxLMXl/NsTlDYOYSeEVfd+ZZgVv5c=`,
    update_url: 'https://raw.githubusercontent.com/bee1an/shit-debug/refs/heads/main/updates.xml',
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
