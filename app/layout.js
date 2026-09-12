import "./globals.css";

export const metadata = {
  title: "Maya — AI Companion",
  description: "A personal AI companion prototype"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
