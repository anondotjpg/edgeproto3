"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { label: "Dash", href: "/" },
  { label: "Accounts", href: "/accounts" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "Payouts", href: "/payouts" },
] as const;

export default function AppSidebar() {
  const pathname = usePathname();

  return (
    <>
      <aside className="fixed left-0 top-0 hidden h-screen w-[220px] bg-[#09090b] md:block">
        <div className="flex h-full w-full flex-col border-r border-zinc-800 bg-[#09090b] px-6">
          <div className="pt-5">
            <div className="flex items-center">
              <Image
                src="/logo.png"
                alt="Edge"
                width={220}
                height={64}
                priority
                className="h-11 w-auto"
              />
            </div>
          </div>

          <nav className="mt-10 flex flex-col gap-4">
            {NAV_LINKS.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={
                    isActive
                      ? "text-[30px] font-semibold leading-none tracking-tight text-zinc-100"
                      : "text-[30px] font-semibold leading-none tracking-tight text-zinc-500 transition-colors hover:text-zinc-200"
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-800 bg-[#09090b]/95 backdrop-blur md:hidden">
        <div className="grid h-16 grid-cols-4 px-[10%]">
          {NAV_LINKS.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center justify-center px-2"
              >
                <span
                  className={
                    isActive
                      ? "text-[15px] font-semibold text-zinc-100"
                      : "text-[15px] font-medium text-zinc-500"
                  }
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}