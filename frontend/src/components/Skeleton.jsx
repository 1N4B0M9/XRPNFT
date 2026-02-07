// Base skeleton block
export function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse bg-surface-800 rounded-xl ${className}`} />
  );
}

// Matches NFTCard layout
export function SkeletonCard() {
  return (
    <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden">
      <div className="aspect-square animate-pulse bg-surface-800" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex items-center justify-between pt-2">
          <div className="space-y-1.5">
            <Skeleton className="h-2 w-12" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="space-y-1.5 text-right">
            <Skeleton className="h-2 w-8 ml-auto" />
            <Skeleton className="h-4 w-14" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Matches stat card layout
export function SkeletonStat() {
  return (
    <div className="bg-surface-900 border border-surface-800 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="w-4 h-4 rounded-full" />
        <Skeleton className="h-2 w-20" />
      </div>
      <Skeleton className="h-7 w-24" />
    </div>
  );
}

// Skeleton grid for marketplace
export function SkeletonMarketplace() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

// Skeleton for NFT detail page
export function SkeletonNFTDetail() {
  return (
    <div className="animate-fade-in">
      <Skeleton className="h-4 w-16 mb-6" />
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left: image */}
        <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden">
          <div className="aspect-square animate-pulse bg-surface-800" />
        </div>
        {/* Right: details */}
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-surface-900 border border-surface-800 rounded-xl p-4 space-y-2">
                <Skeleton className="h-2 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </div>
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// Skeleton for portfolio page
export function SkeletonPortfolio() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStat key={i} />
        ))}
      </div>
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
