import { FeedListSkeleton } from '@/components/feeds/FeedSkeleton'
import { Skeleton } from '@/components/ui/skeleton'

export default function FeedsLoading() {
  return (
    <div className="max-w-2xl mx-auto">
      <Skeleton className="h-7 w-48 mb-6" />
      <Skeleton className="h-10 w-64 mb-4 rounded-md" />
      <Skeleton className="h-32 w-full rounded-lg mb-8" />
      <Skeleton className="h-5 w-32 mb-3" />
      <FeedListSkeleton />
    </div>
  )
}
