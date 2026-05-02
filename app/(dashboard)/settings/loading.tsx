import { Skeleton } from '@/components/ui/skeleton'

export default function SettingsLoading() {
  return (
    <div className="max-w-xl mx-auto">
      <Skeleton className="h-7 w-36 mb-6" />
      <div className="border rounded-lg p-6 flex flex-col gap-4">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-24 w-full rounded-md" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-5 w-40 mt-2" />
        <Skeleton className="h-4 w-full rounded-full" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-10 w-28 rounded-md" />
      </div>
    </div>
  )
}
