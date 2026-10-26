import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "CYPHERFX — Your edge in every market",
  description:
    "Your trading workspace. Practice with confidence. Build your edge.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
