"use client";

import { useEffect, useRef } from "react";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { useChat } from "@/lib/contexts/chat-context";
import { useFileSystem } from "@/lib/contexts/file-system-context";

function extractCode(content: any): string | null {
  if (typeof content !== "string") return null;

  const match = content.match(/```(?:tsx|jsx)?\n([\s\S]*?)```/);
  return match ? match[1].trim() : null;
}

export function ChatInterface() {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    isLoading,
  } = useChat();

  const {
    createFile,
    updateFile,
    getFileContent,
  } = useFileSystem();

  // Auto-scroll
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop =
        scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const lastAssistantContent =
    messages.length > 0 && messages[messages.length - 1]?.role === "assistant"
      ? messages[messages.length - 1].content
      : null;

  useEffect(() => {
    if (!lastAssistantContent) return;

    const code = extractCode(lastAssistantContent);
    if (!code) return;

    const targetPath = "/App.jsx";
    const existing = getFileContent(targetPath);

    if (existing === null) {
      createFile(targetPath, code);
    } else if (existing !== code) {
      updateFile(targetPath, code);
    }
  }, [lastAssistantContent, createFile, updateFile, getFileContent]);

  const loading =
    isLoading || status === "submitted" || status === "streaming";

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollAreaRef} className="flex-1 overflow-y-auto">
        <MessageList messages={messages} isLoading={loading} />
      </div>

      <div className="shrink-0 border-t border-neutral-200/60">
        <MessageInput
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          isLoading={loading}
        />
      </div>
    </div>
  );
}
