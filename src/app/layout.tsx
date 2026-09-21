import type { Metadata, Viewport } from "next";
import { Fredoka, JetBrains_Mono, Nunito } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"] });
const fredoka = Fredoka({ variable: "--font-fredoka", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GitQuest — learn Git by playing",
  description:
    "Type real Git commands and watch your repository come alive. Animated staging area, commit graph and branches, bite-sized levels and your own custom commands.",
};

export const viewport: Viewport = {
  themeColor: "#05060f",
};

/** Applies the saved appearance before first paint, so light-mode users never see a dark flash. */
const APPEARANCE_SCRIPT = `try{var s=JSON.parse(localStorage.getItem("gitquest-settings")||"{}");if(s.state&&s.state.appearance==="light")document.documentElement.dataset.theme="light"}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning className={`${nunito.variable} ${fredoka.variable} ${jetbrains.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: APPEARANCE_SCRIPT }} />
      </head>
      <body className="app-backdrop min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
