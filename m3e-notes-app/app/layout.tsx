import type { Metadata, Viewport } from "next";
import "./notes.css";

export const metadata: Metadata = {
  title: "M3E Notes — Sổ tay & Quản lý việc cần làm",
  description: "Ứng dụng ghi chú, bảng thẻ và checklist thời gian thực theo ngôn ngữ thiết kế Material 3 Expressive.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#7d5700",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400..700,0..1,0&display=block"
        />
      </head>
      <body style={{ margin: 0, fontFamily: "Roboto, system-ui, sans-serif" }}>{children}</body>
    </html>
  );
}
