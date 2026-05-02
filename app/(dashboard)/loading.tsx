import { ArticleListSkeleton } from '@/components/articles/ArticleSkeleton'
import { Skeleton } from '@/components/ui/skeleton'

export default function FeedLoading() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-4 w-20" />
      </div>
      <ArticleListSkeleton />
    </div>
  )
}
