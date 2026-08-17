"use client";

import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import type { ChatTransport, UIMessage } from "ai";
import { useMemo } from "react";
import Link from "next/link";
import { convertAsyncIteratorToReadableStream } from "@ai-sdk/provider-utils";
import { useChat } from "@ai-sdk/react";
import { useQuery } from "@tanstack/react-query";
import { SparklesIcon } from "lucide-react";
import { toast } from "sonner";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTRPC, useTRPCClient } from "@/trpc/react";

export default function Dashboard() {
  const trpc = useTRPC();
  const trpcClient = useTRPCClient();
  const billing = useQuery(trpc.getStripeBillingStatus.queryOptions());

  // Streams over the existing tRPC client so chat reuses the app's auth and links.
  const transport = useMemo<ChatTransport<UIMessage>>(
    () => ({
      async sendMessages({ messages, abortSignal }) {
        const chunks = await trpcClient.chat.mutate({ messages }, { signal: abortSignal });
        return convertAsyncIteratorToReadableStream(chunks[Symbol.asyncIterator]());
      },
      // tRPC streams cannot be resumed after a disconnect.
      reconnectToStream: async () => null,
    }),
    [trpcClient]
  );

  const { messages, sendMessage, status, stop } = useChat({
    transport,
    onError: (error) => toast.error(error.message),
  });

  function handleSubmit(message: PromptInputMessage) {
    const text = message.text?.trim();
    if (!text) return;

    void sendMessage({ text });
  }

  if (billing.isPending) return null;

  if (!billing.data?.isPro) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-1 items-center">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Pro chat</CardTitle>
            <CardDescription>Upgrade your web account to use Pro server features.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/pricing">View Pro</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col gap-4">
      <Conversation className="min-h-0">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={<SparklesIcon className="size-5" />}
              title="Start a conversation"
              description="Responses stream over tRPC using the Vercel AI SDK and OpenAI."
            />
          ) : (
            messages.map((message) => (
              <Message from={message.role} key={message.id}>
                <MessageContent>
                  {message.parts.map((part, index) =>
                    part.type === "text" ? (
                      <MessageResponse key={`${message.id}-${index}`}>{part.text}</MessageResponse>
                    ) : null
                  )}
                </MessageContent>
              </Message>
            ))
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <PromptInput onSubmit={handleSubmit}>
        <PromptInputBody>
          <PromptInputTextarea placeholder="Ask anything..." />
        </PromptInputBody>
        <PromptInputFooter className="justify-end">
          <PromptInputSubmit status={status} onStop={stop} />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}
