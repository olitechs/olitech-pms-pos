import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Merges Tailwind class lists, resolving conflicting utility classes.
// Standard shadcn/ui helper used throughout components/ui/*.
export function cn(...inputs) {
	return twMerge(clsx(inputs));
}
