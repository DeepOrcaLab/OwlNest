import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/base-ui/tabs"
import { ChatPanel } from "./components/chat-panel"
import { KnowledgePanel } from "./components/knowledge-panel"

export function SidePanelApp() {
  const [activeTab, setActiveTab] = useState<string>("chat")

  return (
    <div className="flex h-screen min-h-0 flex-col bg-background">
      <header className="border-b px-4 py-3">
        <h1 className="text-sm font-semibold">OwlNest Agent</h1>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-3 mt-2 grid w-auto shrink-0 grid-cols-2">
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden">
          <ChatPanel />
        </TabsContent>

        <TabsContent value="knowledge" className="flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden">
          <KnowledgePanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}
