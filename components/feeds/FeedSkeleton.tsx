import { Skeleton } from '@/components/ui/skeleton'

export function FeedSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 border rounded-md">
      <Skeleton className="h-4 w-4 shrink-0" />
      <div className="flex-1 flex flex-col gap-1.5">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-20 rounded-full" />
      </div>
      <Skeleton className="h-8 w-8 rounded-md" />
    </div>
  )
}

export function FeedListSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <FeedSkeleton key={i} />
      ))}
    </div>
  )
}
