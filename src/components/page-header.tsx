import type * as React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, className, children }: PageHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between space-y-2 py-6 md:py-8", className)}>
      <div className="grid gap-1">
        <h1 className="font-headline text-3xl font-bold md:text-4xl">
          {title}
        </h1>
        {description && (
          <div className="text-lg text-muted-foreground">
            {description}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
