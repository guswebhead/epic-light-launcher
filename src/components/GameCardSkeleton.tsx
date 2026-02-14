import { memo } from "react";

function GameCardSkeletonComponent() {
  return (
    <div className="animate-pulse overflow-hidden rounded-lg border border-gray-800 bg-gray-900">
      <div className="h-40 bg-gray-800" />
      <div className="space-y-2 p-3">
        <div className="h-4 w-3/4 rounded bg-gray-700" />
        <div className="h-3 w-1/2 rounded bg-gray-700" />
      </div>
    </div>
  );
}

export const GameCardSkeleton = memo(GameCardSkeletonComponent);
