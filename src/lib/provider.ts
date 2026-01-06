import { anthropic } from "@ai-sdk/anthropic";

// ✅ v6: Tipos básicos que necesitamos
type LanguageModelV1StreamPart =
  | { type: "text-delta"; textDelta: string }
  | { type: "tool-call"; toolCallType: "function"; toolCallId: string; toolName: string; args: string }
  | { type: "finish"; finishReason: string; usage: { promptTokens: number; completionTokens: number } };

type LanguageModelV1CallOptions = {
  prompt: Array<{
    role: string;
    content: string | Array<{ type: string; text?: string;[key: string]: any }>;
  }>;
  maxTokens?: number;
  temperature?: number;
  [key: string]: any;
};

type LanguageModelV1FinishReason = "stop" | "length" | "content-filter" | "tool-calls" | "error" | "other" | "unknown";

const MODEL = "claude-haiku-4-5";

// ✅ v6: MockLanguageModel con especificación v2
export class MockLanguageModel {
  readonly specificationVersion = "v2" as const; // ✅ Cambiado a v2
  readonly provider = "mock";
  readonly modelId: string;
  readonly defaultObjectGenerationMode = "tool" as const;
  readonly supportsStructuredOutputs = false;

  constructor(modelId: string) {
    this.modelId = modelId;
  }

  private async delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private extractUserPrompt(messages: LanguageModelV1CallOptions["prompt"]): string {
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.role === "user") {
        const content = message.content;
        if (Array.isArray(content)) {
          const textParts = content
            .filter((part: any) => part.type === "text")
            .map((part: any) => part.text);
          return textParts.join(" ");
        } else if (typeof content === "string") {
          return content;
        }
      }
    }
    return "";
  }

  private async *generateMockStream(
    messages: LanguageModelV1CallOptions["prompt"],
    userPrompt: string
  ): AsyncGenerator<LanguageModelV1StreamPart> {
    const toolMessageCount = messages.filter((m) => m.role === "tool").length;

    const promptLower = userPrompt.toLowerCase();
    let componentType = "counter";
    let componentName = "Counter";

    if (promptLower.includes("form")) {
      componentType = "form";
      componentName = "ContactForm";
    } else if (promptLower.includes("card")) {
      componentType = "card";
      componentName = "Card";
    }

    // Step 1: Create component
    if (toolMessageCount === 1) {
      const text = `I'll create a ${componentName} component for you.`;
      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(25);
      }

      yield {
        type: "tool-call",
        toolCallType: "function",
        toolCallId: `call_1`,
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "create",
          path: `/components/${componentName}.jsx`,
          file_text: this.getComponentCode(componentType),
        }),
      };

      yield {
        type: "finish",
        finishReason: "tool-calls",
        usage: { promptTokens: 50, completionTokens: 30 },
      };
      return;
    }

    // Step 2: Enhance
    if (toolMessageCount === 2) {
      const text = `Enhancing with better styling...`;
      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(25);
      }

      yield {
        type: "tool-call",
        toolCallType: "function",
        toolCallId: `call_2`,
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "str_replace",
          path: `/components/${componentName}.jsx`,
          old_str: this.getOldStringForReplace(componentType),
          new_str: this.getNewStringForReplace(componentType),
        }),
      };

      yield {
        type: "finish",
        finishReason: "tool-calls",
        usage: { promptTokens: 50, completionTokens: 30 },
      };
      return;
    }

    // Step 3: App.jsx
    if (toolMessageCount === 0) {
      const text = `Mock mode active. Add ANTHROPIC_API_KEY to .env for full functionality. Creating App.jsx...`;
      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(15);
      }

      yield {
        type: "tool-call",
        toolCallType: "function",
        toolCallId: `call_3`,
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "create",
          path: "/App.jsx",
          file_text: this.getAppCode(componentName),
        }),
      };

      yield {
        type: "finish",
        finishReason: "tool-calls",
        usage: { promptTokens: 50, completionTokens: 30 },
      };
      return;
    }

    // Step 4: Done
    if (toolMessageCount >= 3) {
      const text = `✅ Done! Created ${componentName}.jsx and App.jsx. Check the preview on the right!`;
      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(30);
      }

      yield {
        type: "finish",
        finishReason: "stop",
        usage: { promptTokens: 50, completionTokens: 50 },
      };
    }
  }

  private getComponentCode(type: string): string {
    if (type === "form") {
      return `import React, { useState } from 'react';

const ContactForm = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  
  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Submitted:', formData);
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Contact Us</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="text" placeholder="Name" className="w-full px-3 py-2 border rounded-md" />
        <input type="email" placeholder="Email" className="w-full px-3 py-2 border rounded-md" />
        <textarea placeholder="Message" rows={4} className="w-full px-3 py-2 border rounded-md" />
        <button type="submit" className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600">
          Send Message
        </button>
      </form>
    </div>
  );
};

export default ContactForm;`;
    }

    return `import { useState } from 'react';

const Counter = () => {
  const [count, setCount] = useState(0);
  
  return (
    <div className="flex flex-col items-center p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Counter</h2>
      <div className="text-4xl font-bold mb-6">{count}</div>
      <div className="flex gap-4">
        <button onClick={() => setCount(count - 1)} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
          -
        </button>
        <button onClick={() => setCount(0)} className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
          Reset
        </button>
        <button onClick={() => setCount(count + 1)} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
          +
        </button>
      </div>
    </div>
  );
};

export default Counter;`;
  }

  private getOldStringForReplace(type: string): string {
    return type === "form"
      ? "console.log('Submitted:', formData);"
      : "const [count, setCount] = useState(0);";
  }

  private getNewStringForReplace(type: string): string {
    return type === "form"
      ? "console.log('Submitted:', formData);\n    alert('Thank you for your message!');"
      : "const [count, setCount] = useState(0); // Enhanced counter";
  }

  private getAppCode(componentName: string): string {
    return `import ${componentName} from './components/${componentName}';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
      <${componentName} />
    </div>
  );
}`;
  }

  async doGenerate(options: LanguageModelV1CallOptions): Promise<any> {
    const userPrompt = this.extractUserPrompt(options.prompt);
    const parts: LanguageModelV1StreamPart[] = [];

    for await (const part of this.generateMockStream(options.prompt, userPrompt)) {
      parts.push(part);
    }

    const text = parts
      .filter((p) => p.type === "text-delta")
      .map((p) => (p as any).textDelta)
      .join("");

    const toolCalls = parts
      .filter((p) => p.type === "tool-call")
      .map((p) => ({
        toolCallType: "function" as const,
        toolCallId: (p as any).toolCallId,
        toolName: (p as any).toolName,
        args: (p as any).args,
      }));

    const finishPart = parts.find((p) => p.type === "finish") as any;

    return {
      text,
      toolCalls,
      finishReason: (finishPart?.finishReason || "stop") as LanguageModelV1FinishReason,
      usage: { promptTokens: 100, completionTokens: 200 },
      rawCall: { rawPrompt: options.prompt, rawSettings: {} },
    };
  }

  async doStream(options: LanguageModelV1CallOptions): Promise<any> {
    const userPrompt = this.extractUserPrompt(options.prompt);
    const self = this;

    return {
      stream: new ReadableStream<LanguageModelV1StreamPart>({
        async start(controller) {
          try {
            for await (const chunk of self.generateMockStream(options.prompt, userPrompt)) {
              controller.enqueue(chunk);
            }
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        },
      }),
      rawCall: { rawPrompt: options.prompt, rawSettings: {} },
      rawResponse: { headers: {} },
    };
  }
}

export function getLanguageModel() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || apiKey.trim() === "") {
    console.log("⚠️  No ANTHROPIC_API_KEY found, using mock provider");
    return new MockLanguageModel("mock-claude-sonnet-4-0") as any;
  }

  return anthropic(MODEL);
}