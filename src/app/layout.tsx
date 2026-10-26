import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "CYPHERFX — Your next move. In focus.",
  description:
    "A focused forex practice website with interactive charts, virtual trading and clear risk-planning tools. Live services are not yet available.",
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
