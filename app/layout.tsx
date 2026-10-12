import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Packaging Management Control and Routine System", description: "Enfield Large Pack production, performance, safety, quality and schedule management.", icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" } };
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body data-release="2026-09-10-integrated-controls">{children}</body></html>}
