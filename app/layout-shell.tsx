"use client";

import { usePathname } from "next/navigation";
import { Header } from "./header";
import { Footer } from "./footer";

export function LayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isCanvasPage =
    pathname === "/work" ||
    pathname === "/figma-test";

  const isProjectPage =
  pathname.startsWith("/work/") &&
  pathname !== "/work";

  if (isCanvasPage || isProjectPage) {
    return <>{children}</>;
  }

  return (
    <div className="relative mx-auto w-full max-w-screen-md flex-1 px-4 pt-20">
      <Header />
      {children}
      <Footer />
    </div>
  );
}