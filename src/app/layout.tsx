import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Workout Intel",
  description: "Training intelligence dashboard — analyze workouts, track progress, reach goals.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="nl" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
