'use client'

/**
 * What page the chat was opened from, without plumbing a prop through every page and the shell
 * (`AGENTS.md`: the header and the page are siblings under `SiteShell`, each rendered server-side
 * independently). `ChatPageContext` is the one-line mount an item or product page adds to its own
 * JSX (8.2's owned "mount/prop line"); `ChatPageProvider` wraps the shell once, in `site-shell.tsx`,
 * so the panel (also a descendant) can read it. Only a title is carried — for the "Asking about:
 * <title>" line. The item or product id the model receives is never taken from here: the panel
 * sends the current `pagePath`, and the server resolves the id itself (`itemOfPage()`).
 */
import { createContext, useContext, useEffect, useState } from 'react'

export type ChatPageInfo = { readonly title: string } | null

const ChatPageReactContext = createContext<{
  info: ChatPageInfo
  setInfo: (info: ChatPageInfo) => void
}>({ info: null, setInfo: () => undefined })

export function ChatPageProvider({ children }: { readonly children: React.ReactNode }) {
  const [info, setInfo] = useState<ChatPageInfo>(null)
  return (
    <ChatPageReactContext.Provider value={{ info, setInfo }}>
      {children}
    </ChatPageReactContext.Provider>
  )
}

export function useChatPageInfo(): ChatPageInfo {
  return useContext(ChatPageReactContext).info
}

/** Mounted once by the item or product page, with the title the chat should show when it opens. */
export function ChatPageContext({ title }: { readonly title: string }): null {
  const { setInfo } = useContext(ChatPageReactContext)
  useEffect(() => {
    setInfo({ title })
    return () => setInfo(null)
  }, [title, setInfo])
  return null
}
