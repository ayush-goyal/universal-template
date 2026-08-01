"use client";

import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "@/trpc/react";

export default function HomePage() {
  const trpc = useTRPC();
  const { data } = useQuery(trpc.getUserCount.queryOptions());

  return (
    <main className="h-screen">
      <div className="flex h-full flex-1 flex-col items-center justify-center gap-4 bg-black">
        <h1 className="text-xl font-bold text-white">hello world</h1>
        <p className="text-sm text-white">total users: {data}</p>
      </div>
    </main>
  );
}
