import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@repo/ui/globals.css";
import { Toaster } from "@repo/ui/components/sonner.tsx";
import type React from "react";
import { Footer } from "@/app/components/footer.tsx";
import { Header } from "@/app/components/header.tsx";
import ApiClientProviderWrapper from "@/app/providers/api-client-provider-wrapper.tsx";
import FieldSnippetProviderWrapper from "@/app/providers/field-snippet-provider-wrapper.tsx";
import I18nProviderWrapper from "@/app/providers/i18n-provider-wrapper.tsx";
import SheetProviderWrapper from "@/app/providers/sheet-provider-wrapper.tsx";
import { ThemeProvider } from "@/app/providers/theme-provider.tsx";

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Form Forge - PDF Form Processing",
  description:
    "Upload PDF forms, extract form fields, and attach JavaScript actions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontMono.variable} min-h-screen bg-background text-foreground antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
          enableSystem
        >
          <I18nProviderWrapper>
            <ApiClientProviderWrapper>
              <SheetProviderWrapper>
                <FieldSnippetProviderWrapper>
                  <div className="flex min-h-screen flex-col">
                    <Header />
                    <main className="container mx-auto flex-1 px-4 py-8">
                      {children}
                    </main>
                    <Footer />
                  </div>

                  <Toaster />
                </FieldSnippetProviderWrapper>
              </SheetProviderWrapper>
            </ApiClientProviderWrapper>
          </I18nProviderWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
