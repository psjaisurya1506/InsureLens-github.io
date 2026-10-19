import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InsureLens – AI-Powered Financial Clarity for Health Insurance",
  description: "Upload your insurance policy and hospital documents to understand potential coverage, patient responsibility, and the reasons behind claim deductions.",
  keywords: "health insurance, claim analysis, insurance coverage, medical bills, AI insurance",
  openGraph: {
    title: "InsureLens – AI-Powered Financial Clarity for Health Insurance",
    description: "Understand your insurance. Know your financial responsibility.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "InsureLens – AI-Powered Financial Clarity for Health Insurance",
    description: "Understand your insurance. Know your financial responsibility.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
