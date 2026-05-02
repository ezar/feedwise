import { ArticleListSkeleton } from '@/components/articles/ArticleSkeleton'
import { Skeleton } from '@/components/ui/skeleton'

export default function SavedLoading() {
  return (
    <div className="max-w-2xl mx-auto">
      <Skeleton className="h-7 w-48 mb-6" />
      <ArticleListSkeleton />
    </div>
  )
}
