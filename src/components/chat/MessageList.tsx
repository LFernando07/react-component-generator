"use client";

import { cn } from "@/lib/utils";
import { User, Bot, Loader2 } from "lucide-react";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface MessageListProps {
  messages: any[]; // ✅ Usar any[] temporalmente para evitar problemas de tipos
  isLoading?: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 text-center">
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 mb-4 shadow-sm">
          <Bot className="h-7 w-7 text-blue-600" />
        </div>
        <p className="text-neutral-900 font-semibold text-base mb-2">
          Start a conversation to generate React components
        </p>
        <p className="text-neutral-500 text-sm max-w-sm">
          I can help you create buttons, forms, cards, and more
        </p>
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-6">
      <div className="space-y-4 max-w-4xl mx-auto">{/* Reducido de space-y-6 a space-y-4 */}
        {messages.map((message: any, index: number) => {
          let textContent = "";

          if (typeof message.content === "string") {
            textContent = message.content;
          } else if (Array.isArray(message.content)) {
            textContent = message.content
              .filter((part: any) => part.type === "text")
              .map((part: any) => part.text)
              .join("");
          }

          return (
            <div
              key={message.id ?? `message-${index}`}
              className={cn(
                "flex gap-4",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >

              {message.role === "assistant" && (
                <div className="shrink-0">
                  <div className="w-9 h-9 rounded-lg bg-white border border-neutral-200 shadow-sm flex items-center justify-center">
                    <Bot className="h-4.5 w-4.5 text-neutral-700" />
                  </div>
                </div>
              )}

              <div
                className={cn(
                  "flex flex-col gap-2 max-w-[85%]",
                  message.role === "user" ? "items-end" : "items-start"
                )}
              >
                <div
                  className={cn(
                    "rounded-xl px-4 py-3",
                    message.role === "user"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-white text-neutral-900 border border-neutral-200 shadow-sm"
                  )}
                >
                  <div className="text-sm">
                    {/* Main content */}
                    {textContent && (
                      message.role === "user" ? (
                        <span className="whitespace-pre-wrap">{textContent}</span>
                      ) : (
                        <MarkdownRenderer content={textContent} className="prose-sm" />
                      )
                    )}

                    {/* Tool invocations - check multiple possible structures */}
                    {message.toolInvocations && message.toolInvocations.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {message.toolInvocations.map((tool: any, idx: number) => (
                          <div
                            key={`${message.id}-${tool.toolName}`} // ✅ ESTABLE
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200"
                          >
                            {tool.state === "result" ? (
                              <>
                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                <span className="text-neutral-700">{tool.toolName}</span>
                              </>
                            ) : (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                                <span className="text-neutral-700">{tool.toolName}</span>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Alternative: display property */}
                    {!message.toolInvocations && message.display && Array.isArray(message.display) && (
                      <div className="mt-2 space-y-2">
                        {message.display.map((item: any, idx: number) => {
                          if (item.type === "tool-call") {
                            return (
                              <div
                                key={`${message.id}-${item.toolName}`} // ✅ ESTABLE
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200"
                              >
                                {item.result ? (
                                  <>
                                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                    <span className="text-neutral-700">{item.toolName}</span>
                                  </>
                                ) : (
                                  <>
                                    <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                                    <span className="text-neutral-700">{item.toolName}</span>
                                  </>
                                )}
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    )}

                    {/* Loading indicator */}
                    {isLoading &&
                      message.role === "assistant" &&
                      index === messages.length - 1 && (
                        <div className="flex items-center gap-2 mt-3 text-neutral-500">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span className="text-sm">Generating...</span>
                        </div>
                      )}
                  </div>
                </div>
              </div>

              {message.role === "user" && (
                <div className="shrink-0">
                  <div className="w-9 h-9 rounded-lg bg-blue-600 shadow-sm flex items-center justify-center">
                    <User className="h-4.5 w-4.5 text-white" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}