import { memo } from "react";

function GameCardSkeletonComponent() {
  return (
    <div className="bg-gray-800 rounded overflow-hidden animate-pulse">
      <div className="h-64 bg-gray-700" />
      <div className="p-2">
        <div className="h-4 bg-gray-700 rounded w-3/4 mb-2" />
        <div className="h-3 bg-gray-700 rounded w-1/2" />
      </div>
    </div>
  );
}

export const GameCardSkeleton = memo(GameCardSkeletonComponent);
