"use client";

import { useRouter } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";

export default function BackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push("/");
        }
      }}
      className="inline-flex items-center gap-2 text-[13px] font-medium text-zinc-300 transition-colors hover:text-white cursor-pointer"
      aria-label="Go back"
    >
      <FiArrowLeft className="h-8 w-8" />
    </button>
  );
}