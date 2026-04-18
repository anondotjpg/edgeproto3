import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppSidebar from "./components/AppSidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Edge - Funding Your Bets.",
  description: "fund your bets.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="relative min-h-screen bg-[#09090b] text-white">
        <style>{`
          @keyframes buttonShimmer {
            0% {
              transform: translateX(0) skewX(-20deg);
              opacity: 0;
            }
            8% {
              opacity: 0.42;
            }
            24% {
              opacity: 0.42;
            }
            38% {
              transform: translateX(520%) skewX(-20deg);
              opacity: 0;
            }
            100% {
              transform: translateX(520%) skewX(-20deg);
              opacity: 0;
            }
          }
        `}</style>

        <AppSidebar />

        <div className="pointer-events-none absolute top-0 right-0 z-50 w-fit md:hidden">
          <div className="w-fit px-4 py-5 sm:px-6 sm:py-6">
            <div className="pointer-events-auto flex w-fit justify-end">
              <div className="flex items-center gap-3">
                <div
                  className="inline-block rounded-full"
                  style={{
                    background: "#0369a1",
                    paddingBottom: "2px",
                    lineHeight: 0,
                  }}
                >
                  <Link
                    href="/accounts"
                    className="relative inline-flex h-8 items-center overflow-hidden rounded-full bg-linear-to-br from-sky-300 via-sky-400 to-sky-500 px-4 text-[13px] font-bold text-sky-950 transition-transform duration-100 hover:translate-y-px active:translate-y-0"
                    style={{
                      transform: "translateY(-2px)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-[-35%] left-[-22%] w-[18%] skew-x-[-20deg] bg-white/35 blur-md animate-[buttonShimmer_3.4s_ease-out_infinite]"
                    />
                    <span className="relative z-10">Start Challenge</span>
                  </Link>
                </div>

                <Link href="/accounts" className="shrink-0">
                  <Image
                    src="/pfp.jpg"
                    alt="Account"
                    width={40}
                    height={40}
                    priority
                    className="h-9 w-9 rounded-full border border-zinc-800 object-cover"
                  />
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="pointer-events-none fixed top-4 right-6 z-50 hidden md:block">
          <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-zinc-800 bg-[#09090b]/90 px-2 py-2 backdrop-blur-md">
            <div
              className="inline-block rounded-full"
              style={{
                background: "#0369a1",
                paddingBottom: "2px",
                lineHeight: 0,
              }}
            >
              <Link
                href="/accounts"
                className="relative inline-flex h-8 items-center overflow-hidden rounded-full bg-linear-to-br from-sky-300 via-sky-400 to-sky-500 px-4 text-[13px] font-bold text-sky-950 transition-transform duration-100 hover:translate-y-px active:translate-y-0"
                style={{
                  transform: "translateY(-2px)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
                }}
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-[-35%] left-[-22%] w-[18%] skew-x-[-20deg] bg-white/35 blur-md animate-[buttonShimmer_3.4s_ease-out_infinite]"
                />
                <span className="relative z-10">Start Challenge</span>
              </Link>
            </div>

            <Link href="/accounts" className="shrink-0">
              <Image
                src="/pfp.jpg"
                alt="Account"
                width={40}
                height={40}
                priority
                className="h-9 w-9 rounded-full border border-zinc-700 object-cover"
              />
            </Link>
          </div>
        </div>

        <main className="min-h-screen md:pl-[220px]">{children}</main>
      </body>
    </html>
  );
}