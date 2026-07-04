import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Keep data considered fresh for 60s so repeat navigations render
        // from cache instantly instead of hitting the network every time.
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Preload route chunks + loaders when the user hovers/focuses a link,
    // so clicks feel instant.
    defaultPreload: "intent",
    defaultPreloadDelay: 50,
    // Let TanStack Query own freshness of preloaded data.
    defaultPreloadStaleTime: 0,
  });

  return router;
};
