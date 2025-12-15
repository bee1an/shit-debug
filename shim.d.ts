import type { ProtocolWithReturn } from 'webext-bridge'

declare module 'webext-bridge' {
  export interface ProtocolMap {
    // define message protocol types
    // see https://github.com/antfu/webext-bridge#type-safe-protocols
    'tab-prev': { title: string | undefined }
    'get-current-tab': ProtocolWithReturn<{ tabId: number }, { title?: string }>
  }
}

// Chrome sidePanel API 类型声明
declare namespace chrome {
  namespace sidePanel {
    interface PanelBehavior {
      openPanelOnActionClick?: boolean
    }
    interface OpenOptions {
      tabId?: number
      windowId?: number
    }
    function setPanelBehavior(behavior: PanelBehavior): Promise<void>
    function open(options: OpenOptions): Promise<void>
  }
}

// 扩展 browser 类型
declare namespace browser {
  const sidePanel: typeof chrome.sidePanel | undefined
}
