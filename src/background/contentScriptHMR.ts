import { isFirefox, isForbiddenUrl } from '~/env'

browser.webNavigation.onCommitted.addListener(({ tabId, frameId, url }) => {
  if (frameId !== 0)
    return
  if (isForbiddenUrl(url))
    return

  browser.tabs.executeScript(tabId, {
    file: `${isFirefox ? '' : '.'}/dist/contentScripts/index.global.js`,
    runAt: 'document_end',
  }).catch(() => {})
})
