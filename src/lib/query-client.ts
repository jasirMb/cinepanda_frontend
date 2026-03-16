"use client";

import { QueryClient } from "@tanstack/react-query";

let browserQueryClient: QueryClient | null = null;

export function getQueryClient() {
  if (!browserQueryClient) {
    browserQueryClient = new QueryClient();
  }
  return browserQueryClient;
}

