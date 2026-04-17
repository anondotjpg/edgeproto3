import * as React from "react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type DotPatternProps = React.SVGProps<SVGSVGElement> & {
  width?: number;
  height?: number;
  cx?: number;
  cy?: number;
  cr?: number;
};

export function DotPattern({
  width = 16,
  height = 16,
  cx = 1,
  cy = 1,
  cr = 1,
  className,
  ...props
}: DotPatternProps) {
  const patternId = React.useId();

  return (
    <svg
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full fill-zinc-700/80",
        className
      )}
      {...props}
    >
      <defs>
        <pattern
          id={patternId}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          x="0"
          y="0"
        >
          <circle cx={cx} cy={cy} r={cr} />
        </pattern>
      </defs>

      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}