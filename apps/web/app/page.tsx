"use client";

import { useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { useQuery } from "@tanstack/react-query";
import { DefaultChatTransport } from "ai";
import { Bot, Database, SendHorizontal, Sparkles, User } from "lucide-react";
import { DateTime } from "luxon";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getMessageText } from "@/lib/ai/chat";
import { useTRPC } from "@/trpc/react";

function MessageBubble({
  role,
  content,
  createdAt,
}: {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}) {
  const isUser = role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser ? (
        <div className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-full">
          <Bot className="size-4" />
        </div>
      ) : null}
      <div
        className={`max-w-3xl rounded-2xl border px-4 py-3 shadow-sm ${
          isUser
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-card text-card-foreground"
        }`}
      >
        <div className="mb-2 flex items-center gap-2 text-xs opacity-80">
          {isUser ? <User className="size-3.5" /> : <Sparkles className="size-3.5" />}
          <span>{isUser ? "You" : "Assistant"}</span>
          <span>{createdAt}</span>
        </div>
        <div className="prose prose-sm dark:prose-invert max-w-none break-words whitespace-pre-wrap">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </div>
      {isUser ? (
        <div className="bg-secondary text-secondary-foreground flex size-9 shrink-0 items-center justify-center rounded-full">
          <User className="size-4" />
        </div>
      ) : null}
    </div>
  );
}

export default function HomePage() {
  const trpc = useTRPC();
  const { data, isLoading } = useQuery(trpc.getAiDemoContext.queryOptions());
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error, stop, clearError } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
    onError: (chatError) => {
      toast.error(chatError.message);
    },
  });

  const messageView = useMemo(
    () =>
      messages
        .map((message) => ({
          id: message.id,
          role: message.role,
          content: getMessageText(message),
          createdAt: DateTime.fromJSDate(
            message.createdAt instanceof Date ? message.createdAt : new Date()
          ).toFormat("HH:mm:ss"),
        }))
        .filter((message) => message.content.trim().length > 0),
    [messages]
  );

  const canSubmit = input.trim().length > 0 && status !== "streaming" && status !== "submitted";

  const providerLabel = data?.providerAvailability.aiGateway
    ? "AI Gateway"
    : data?.providerAvailability.openai
      ? "OpenAI"
      : "Local demo stream";

  return (
    <main className="from-background via-background to-muted/30 min-h-screen bg-gradient-to-b">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 md:px-6">
        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <Card className="h-fit">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Vercel AI SDK + tRPC</CardTitle>
                <Badge variant={data?.providerAvailability.aiGateway ? "default" : "secondary"}>
                  {providerLabel}
                </Badge>
              </div>
              <CardDescription>
                Streaming chat on the Next.js route handler with live app context exposed through
                the existing tRPC backend.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid gap-3">
                <div className="bg-muted/50 rounded-lg border p-3">
                  <div className="mb-1 flex items-center gap-2 font-medium">
                    <Database className="size-4" />
                    App context
                  </div>
                  <p>Users in database: {isLoading ? "Loading..." : (data?.userCount ?? 0)}</p>
                  <p>Signed in: {isLoading ? "Loading..." : data?.signedIn ? "Yes" : "No"}</p>
                  <p>Email: {isLoading ? "Loading..." : (data?.currentUserEmail ?? "Anonymous")}</p>
                </div>
                <div className="bg-muted/50 rounded-lg border p-3">
                  <div className="mb-2 font-medium">Try one of these prompts</div>
                  <div className="flex flex-col gap-2">
                    {(data?.recommendedPrompts ?? []).map((prompt) => (
                      <Button
                        key={prompt}
                        variant="outline"
                        className="h-auto justify-start text-left whitespace-normal"
                        onClick={() => setInput(prompt)}
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="text-muted-foreground text-xs">
              Add `AI_GATEWAY_API_KEY` or `OPENAI_API_KEY` in `.env` to switch from the built-in
              local stream to a live model without changing the UI.
            </CardFooter>
          </Card>

          <Card className="min-h-[70vh]">
            <CardHeader>
              <CardTitle>Streaming chat example</CardTitle>
              <CardDescription>
                The assistant streams tokens through `/api/chat`, and the route can call back into
                tRPC for live application context.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex min-h-[50vh] flex-col gap-4">
              <div className="bg-muted/30 flex flex-1 flex-col gap-4 rounded-xl border p-4">
                {messageView.length === 0 ? (
                  <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
                    Send a prompt to watch the AI SDK stream response chunks into the UI.
                  </div>
                ) : (
                  messageView.map((message) => (
                    <MessageBubble
                      key={message.id}
                      role={message.role}
                      content={message.content}
                      createdAt={message.createdAt}
                    />
                  ))
                )}
              </div>
              {error ? (
                <div className="bg-destructive/10 text-destructive rounded-lg border border-current/20 p-3 text-sm">
                  <div className="font-medium">Chat request failed</div>
                  <div>{error.message}</div>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => clearError()}>
                    Dismiss
                  </Button>
                </div>
              ) : null}
            </CardContent>
            <CardFooter>
              <form
                className="flex w-full flex-col gap-3"
                onSubmit={async (event) => {
                  event.preventDefault();

                  const prompt = input.trim();
                  if (!prompt) {
                    return;
                  }

                  await sendMessage({
                    text: prompt,
                  });

                  setInput("");
                }}
              >
                <div className="flex gap-3">
                  <Input
                    value={input}
                    placeholder="Ask about the repo, the app context, or the current demo setup..."
                    onChange={(event) => setInput(event.currentTarget.value)}
                  />
                  {status === "streaming" || status === "submitted" ? (
                    <Button type="button" variant="outline" onClick={() => stop()}>
                      Stop
                    </Button>
                  ) : (
                    <Button type="submit" disabled={!canSubmit}>
                      <SendHorizontal className="size-4" />
                      Send
                    </Button>
                  )}
                </div>
                <div className="text-muted-foreground flex items-center justify-between text-xs">
                  <span>
                    Status: <span className="text-foreground font-medium capitalize">{status}</span>
                  </span>
                  <span>Streaming uses AI SDK UI message protocol end-to-end.</span>
                </div>
              </form>
            </CardFooter>
          </Card>
        </div>
      </div>
    </main>
  );
}
