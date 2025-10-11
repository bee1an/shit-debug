/**
 * 注入到iframe中的脚本，用于获取sessionStorage数据
 */

// 监听来自父页面的消息请求
window.addEventListener('message', async (event) => {
  // 只处理来自父页面的消息
  if (event.data.type === 'REQUEST_SESSION_STORAGE') {
    try {
      const { key } = event.data
      let data = null

      if (key === 'SET_LOGIN_DATA') {
        const loginData = sessionStorage.getItem('SET_LOGIN_DATA')
        if (loginData) {
          try {
            data = JSON.parse(loginData)
          }
          catch {
            data = loginData
          }
        }
      }

      // 将数据发送回父页面
      if (event.source && event.source.postMessage) {
        event.source.postMessage({
          type: 'SESSION_STORAGE_RESPONSE',
          key,
          data,
          success: true,
        }, { targetOrigin: '*' })
      }
    }
    catch (error) {
      console.error('Error handling sessionStorage request:', error)

      // 发送错误响应
      if (event.source && event.source.postMessage) {
        event.source.postMessage({
          type: 'SESSION_STORAGE_RESPONSE',
          key: event.data.key,
          data: null,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }, { targetOrigin: '*' })
      }
    }
  }
})

// 通知父页面脚本已注入
if (window.parent && window.parent.postMessage) {
  window.parent.postMessage({
    type: 'IFRAME_SCRIPT_INJECTED',
    url: window.location.href,
  }, '*')
}
