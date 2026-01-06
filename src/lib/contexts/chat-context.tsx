"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useState,
  FormEvent,
  ChangeEvent,
  useRef,
} from "react";
import { useFileSystem } from "./file-system-context";
import { setHasAnonWork } from "@/lib/anon-work-tracker";

interface ChatContextProps {
  projectId?: string;
  initialMessages?: any[];
}

interface ChatContextType {
  messages: any[];
  input: string;
  handleInputChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void;
  status: string;
  isLoading: boolean;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({
  children,
  projectId,
  initialMessages = [],
}: ChatContextProps & { children: ReactNode }) {
  const { fileSystem } = useFileSystem();

  const [messages, setMessages] = useState<any[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const messagesRef = useRef<any[]>(initialMessages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = {
      id: crypto.randomUUID(),
      role: "user" as const,
      content: input.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    messagesRef.current = [...messagesRef.current, userMessage];

    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messagesRef.current,
          files: fileSystem.serialize(),
          projectId,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Chat API error");
      }

      // 🔥 Crear el assistant UNA SOLA VEZ
      const assistantId = crypto.randomUUID();
      let assistantContent = "";

      setMessages(prev => [
        ...prev,
        { id: assistantId, role: "assistant", content: "" },
      ]);

      messagesRef.current = [
        ...messagesRef.current,
        { id: assistantId, role: "assistant", content: "" },
      ];

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("0:")) continue;

          try {
            const data = JSON.parse(line.slice(2));
            if (!data?.text) continue;

            assistantContent += data.text;

            setMessages(prev =>
              prev.map(msg =>
                msg.id === assistantId
                  ? { ...msg, content: assistantContent }
                  : msg
              )
            );
          } catch {
            // ignore
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!projectId && messages.length > 0) {
      setHasAnonWork(messages, fileSystem.serialize());
    }
  }, [messages, fileSystem, projectId]);

  return (
    <ChatContext.Provider
      value={{
        messages,
        input,
        handleInputChange,
        handleSubmit,
        status: isLoading ? "streaming" : "ready",
        isLoading,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
