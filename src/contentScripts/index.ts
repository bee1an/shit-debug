/* eslint-disable no-console */
import { onMessage } from 'webext-bridge/content-script'
// import { createApp } from 'vue'
// import App from './views/App.vue'
// import { setupApp } from '~/logic/common-setup'

// Firefox `browser.tabs.executeScript()` requires scripts return a primitive value
(() => {
  console.info('[vitesse-webext] Hello world from content script')

  // communication example: send previous tab title from background page
  onMessage('tab-prev', ({ data }) => {
    console.log(`[vitesse-webext] Navigate from page "${data.title}"`)
  })

  // 处理iframe检测请求
  onMessage('get-iframe-info', () => {
    console.log('[vitesse-webext] Getting iframe info')

    try {
      // 获取页面中的所有iframe
      const iframes = document.querySelectorAll('iframe')
      const count = iframes.length

      if (count === 0) {
        return { count: 0 }
      }

      if (count > 1) {
        return { count }
      }

      // 只有一个iframe的情况
      const iframe = iframes[0] as HTMLIFrameElement
      const src = iframe.src || ''

      let hashContent = ''
      if (src && src.includes('#')) {
        const url = new URL(src)
        hashContent = url.hash.slice(1) // 去掉#号
      }

      return {
        count: 1,
        src,
        hashContent: hashContent || undefined,
      }
    }
    catch (error) {
      console.error('[vitesse-webext] Error getting iframe info:', error)
      return { count: 0 }
    }
  })

  // mount component to context window
  // const container = document.createElement('div')
  // container.id = __NAME__
  // const root = document.createElement('div')
  // const styleEl = document.createElement('link')
  // const shadowDOM = container.attachShadow?.({ mode: __DEV__ ? 'open' : 'closed' }) || container
  // styleEl.setAttribute('rel', 'stylesheet')
  // styleEl.setAttribute('href', browser.runtime.getURL('dist/contentScripts/style.css'))
  // shadowDOM.appendChild(styleEl)
  // shadowDOM.appendChild(root)
  // document.body.appendChild(container)
  // const app = createApp(App)
  // setupApp(app)
  // app.mount(root)
})()
