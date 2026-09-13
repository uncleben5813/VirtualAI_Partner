import "./globals.css";

export const metadata = {
  title: "Maya — AI Companion",
  description: "Maya AI assistant with Groq, memory, mood, voice and persistence",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ms">
      <body>{children}</body>
    </html>
  );
}
