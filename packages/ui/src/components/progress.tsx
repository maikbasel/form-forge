"use client";

import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@repo/ui/lib/utils.ts";
import type * as React from "react";

const Progress = ({
  className,
  value,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
  ref?: React.RefObject<React.ElementRef<typeof ProgressPrimitive.Root> | null>;
}) => (
  <ProgressPrimitive.Root
    className={cn(
      "relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
      className
    )}
    ref={ref}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 bg-primary transition-all"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
);
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
