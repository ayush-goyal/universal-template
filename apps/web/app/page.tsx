"use client";

import { useQuery } from "@tanstack/react-query";

import { useORPC } from "@/orpc/react";

export default function HomePage() {
  const orpc = useORPC();
  const { data } = useQuery(orpc.getUserCount.queryOptions());

  return (
    <main className="h-screen">
      <div className="flex h-full flex-1 flex-col items-center justify-center gap-4 bg-black">
        <h1 className="text-xl font-bold text-white">hello world</h1>
        <p className="text-sm text-white">total users: {data}</p>
      </div>
    </main>
  );
}
