import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "react-hot-toast";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "SplitFlow",
  description: "Premium Expense Splitting Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className={`${inter.variable}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <Toaster 
            position="top-center"
            toastOptions={{
              className: 'dark:bg-slate-800 dark:text-slate-100',
              style: {
                background: 'var(--bg-card)',
                color: 'inherit',
                border: '1px solid var(--glass-border)',
                borderRadius: '16px',
              }
            }}
          />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}