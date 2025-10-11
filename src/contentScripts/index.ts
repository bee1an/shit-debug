import { onMessage } from 'webext-bridge/content-script'

(() => {
  onMessage('tab-prev', ({ data }) => {
    // Handle tab navigation from background
  })

  onMessage('get-iframe-info', () => {
    try {
      const iframes = document.querySelectorAll('iframe')
      const count = iframes.length

      if (count === 0) {
        return { count: 0 }
      }

      if (count > 1) {
        return { count }
      }

      const iframe = iframes[0] as HTMLIFrameElement
      const src = iframe.src || ''

      let hashContent = ''
      if (src && src.includes('#')) {
        const url = new URL(src)
        hashContent = url.hash.slice(1)
      }

      return {
        count: 1,
        src,
        hashContent: hashContent || undefined,
      }
    }
    catch (error) {
      return { count: 0 }
    }
  })
})()
