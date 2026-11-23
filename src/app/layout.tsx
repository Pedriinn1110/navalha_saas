import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Navalha — Gestão de barbearias",
  description: "Agenda, clientes e financeiro em um só lugar.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
