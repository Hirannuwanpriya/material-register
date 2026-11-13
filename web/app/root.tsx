import { useState, type ReactNode } from "react";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Alert,
  Center,
  ColorSchemeScript,
  Container,
  Loader,
  MantineProvider,
  mantineHtmlProps,
} from "@mantine/core";
import "@mantine/core/styles.css";

import type { Route } from "./+types/root";
import { TRPCProvider, trpcClient } from "./lib/trpc";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <ColorSchemeScript />
        <Meta />
        <Links />
      </head>
      <body>
        <MantineProvider>{children}</MantineProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  // useState keeps one QueryClient for the app's lifetime instead of a new cache per render.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        // 30s stops paging back and forth from refetching data we just loaded.
        defaultOptions: { queries: { staleTime: 30_000 } },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        <Outlet />
      </TRPCProvider>
    </QueryClientProvider>
  );
}

// Shown while the SPA boots, before the first route renders.
export function HydrateFallback() {
  return (
    <Center h="100vh">
      <Loader />
    </Center>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let title = "Something went wrong";
  let message = "An unexpected error occurred.";

  if (isRouteErrorResponse(error)) {
    title = error.status === 404 ? "Page not found" : `Error ${error.status}`;
    message = error.statusText || message;
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <Container size="sm" py="xl">
      <Alert color="red" title={title}>
        {message}
      </Alert>
    </Container>
  );
}
