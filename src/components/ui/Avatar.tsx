"use client";

import Image from "next/image";

import { cn, getInitials } from "@/lib/utils";

interface AvatarProps {
  src?: string | null;

  name?: string | null;

  size?:
    | "xs"
    | "sm"
    | "md"
    | "lg"
    | "xl";

  className?: string;
}

const sizes = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-xl",
};

const gradients = [
  "from-blue-500 to-indigo-600",
  "from-violet-500 to-purple-600",
  "from-cyan-500 to-sky-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-amber-600",
];

function getGradient(
  name?: string | null
) {
  if (!name) return gradients[0];

  return gradients[
    name.charCodeAt(0) %
      gradients.length
  ];
}

export function Avatar({
  src,
  name,
  size = "md",
  className,
}: AvatarProps) {
  if (src) {
    return (
      <div
        className={cn(
          sizes[size],
          "overflow-hidden rounded-full ring-2 ring-white/10",
          className
        )}
      >
        <Image
          src={src}
          alt={name ?? "Avatar"}
          width={100}
          height={100}
          className="
            w-full
            h-full
            object-cover
          "
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        sizes[size],
        getGradient(name),
        `
        flex
        items-center
        justify-center
        rounded-full
        bg-gradient-to-br
        text-white
        font-bold
        ring-2
        ring-white/10
        `,
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}