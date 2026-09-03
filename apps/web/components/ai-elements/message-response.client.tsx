"use client";

import type { StreamdownProps } from "streamdown";
import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import { Streamdown } from "streamdown";

import { cn } from "@/lib/utils";

const streamdownPlugins = { cjk, code, math, mermaid };

export const MessageResponseClient = ({ className, ...props }: StreamdownProps) => (
  <Streamdown
    className={cn("size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0", className)}
    plugins={streamdownPlugins}
    {...props}
  />
);
