'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export function QueryProvider({ children }: any) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}