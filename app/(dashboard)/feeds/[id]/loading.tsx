import { ArticleListSkeleton } from '@/components/articles/ArticleSkeleton'
import { Skeleton } from '@/components/ui/skeleton'

export default function FeedDetailLoading() {
  return (
    <div className="max-w-2xl mx-auto">
      <Skeleton className="h-4 w-24 mb-4" />
      <div className="flex items-start gap-3 mb-6">
        <Skeleton className="h-5 w-5 mt-0.5 rounded" />
        <div className="flex-1 flex flex-col gap-2">
          <Skeleton className="h-7 w-64" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </div>
      <ArticleListSkeleton />
    </div>
  )
}
