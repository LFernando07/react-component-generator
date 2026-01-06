import type { FileNode } from "@/lib/file-system";
import { VirtualFileSystem } from "@/lib/file-system";
import { streamText } from "ai";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getLanguageModel } from "@/lib/provider";
import { generationPrompt } from "@/lib/prompts/generation";

export async function POST(req: Request) {
  const body = await req.json();

  const {
    messages,
    files,
    projectId,
  }: {
    messages?: any[];
    files?: Record<string, FileNode>;
    projectId?: string;
  } = body;

  // Transformar mensajes
  const transformedMessages = (messages || []).map((msg: any) => {
    if (msg.parts && Array.isArray(msg.parts)) {
      const textPart = msg.parts.find((p: any) => p.type === "text");
      return { role: msg.role, content: textPart?.text || "" };
    }
    if (msg.content) return msg;
    return { role: msg.role, content: "" };
  });

  const systemMessage = {
    role: "system" as const,
    content: generationPrompt,
    experimental_providerMetadata: {
      anthropic: {
        cacheControl: { type: "ephemeral" },
      },
    },
  };

  const allMessages = [systemMessage, ...transformedMessages];

  // Filesystem
  const fileSystem = new VirtualFileSystem();
  if (files && Object.keys(files).length > 0) {
    fileSystem.deserializeFromNodes(files);
  }

  const model = getLanguageModel();

  const result = streamText({
    model,
    messages: allMessages,
    onError(err) {
      console.error(err);
    },
    onFinish: async ({ text }) => {
      if (!projectId) return;

      try {
        const session = await getSession();
        if (!session) return;

        const lastAssistantMessage = {
          role: "assistant" as const,
          content: text || "",
        };

        const updatedMessages = [...allMessages, lastAssistantMessage];

        await prisma.project.update({
          where: {
            id: projectId,
            userId: session.userId,
          },
          data: {
            messages: JSON.stringify(
              updatedMessages.filter((m: any) => m.role !== "system")
            ),
            data: JSON.stringify(fileSystem.serialize()),
          },
        });
      } catch (error) {
        console.error("Failed to save project data:", error);
      }
    },
  });

  return result.toTextStreamResponse();
}

export const maxDuration = 120;
