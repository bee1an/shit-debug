// 监听父页面的sessionStorage请求
window.addEventListener('message', async (event) => {
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

      // 发送数据回父页面
      if (event.source?.postMessage) {
        event.source.postMessage({
          type: 'SESSION_STORAGE_RESPONSE',
          key,
          data,
          success: true,
        }, { targetOrigin: '*' })
      }
    }
    catch (error) {
      // 发送错误响应
      if (event.source?.postMessage) {
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
