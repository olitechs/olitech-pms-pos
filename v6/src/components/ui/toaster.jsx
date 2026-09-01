import { Toaster as Sonner } from "sonner";

// Thin wrapper around sonner's Toaster so the rest of the app can just
// `import { Toaster } from "@/components/ui/toaster"` and use `toast()`
// from "sonner" wherever a notification is needed.
export function Toaster(props) {
	return (
		<Sonner
			position="top-right"
			richColors
			closeButton
			toastOptions={{
				classNames: {
					toast: "rounded-lg border shadow-lg",
				},
			}}
			{...props}
		/>
	);
}
