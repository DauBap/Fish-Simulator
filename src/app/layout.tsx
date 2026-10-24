import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aquascape Studio 3D",
  description: "Design a living underwater landscape in a precise 3D studio.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
