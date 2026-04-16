import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "@/components/layout/Navigation";
import QueryProvider from "@/components/providers/QueryProvider";
import { UIProvider } from "@/components/providers/UIProvider";
import { ClientLayoutWrapper } from "@/components/layout/ClientLayoutWrapper";

// Using system fonts to bypass next/font/google build errors in this environment
const inter = { variable: "--font-inter" };
const outfit = { variable: "--font-outfit" };

export const metadata: Metadata = {
  title: "Nemo2 - Language Learning",
  description: "Next-generation language learning platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${outfit.variable} font-sans`} suppressHydrationWarning>
        <QueryProvider>
          <UIProvider>
            <Navigation />
            <ClientLayoutWrapper>
              {children}
            </ClientLayoutWrapper>
          </UIProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
