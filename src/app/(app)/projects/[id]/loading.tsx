
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
      <>
        <PageHeader title={<Skeleton className="h-10 w-64" />} description={<Skeleton className="h-6 w-48" />}>
            <div className="flex gap-2">
                <Skeleton className="h-10 w-28" />
                <Skeleton className="h-10 w-36" />
            </div>
        </PageHeader>
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            <Skeleton className="h-[500px] w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div className="lg:col-span-1 space-y-6">
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </>
    );
}
