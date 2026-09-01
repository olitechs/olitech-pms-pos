import { QueryClient } from '@tanstack/react-query';

// Single shared React Query client for the app.
export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			retry: 1,
			refetchOnWindowFocus: false,
			staleTime: 30_000,
		},
	},
});
