import { Skeleton } from "@/components/ui/skeleton";

export const LoadingSkeleton = () => (
  <div className="space-y-4">
    <div className="space-y-2">
      <Skeleton className="h-4 w-[250px]" />
      <Skeleton className="h-4 w-[200px]" />
    </div>
    <Skeleton className="h-[125px] w-full rounded-lg" />
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-[80%]" />
    </div>
  </div>
);

export const StatsLoadingSkeleton = () => (
  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    ))}
  </div>
);

export const ConversationLoadingSkeleton = () => (
  <div className="space-y-3">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-4 w-[150px]" />
        </div>
      </div>
    ))}
  </div>
);

export const UserCardLoadingSkeleton = () => (
  <div className="space-y-4">
    <div className="flex items-center space-x-4">
      <Skeleton className="h-16 w-16 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-[150px]" />
        <Skeleton className="h-4 w-[100px]" />
      </div>
    </div>
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-[90%]" />
      <Skeleton className="h-4 w-[80%]" />
    </div>
  </div>
);