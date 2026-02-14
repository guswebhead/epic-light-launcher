/**
 * Common image types in Epic ecosystem
 */
export type ImageType =
  | "DieselGameBoxTall"
  | "DieselGameBox"
  | "Thumbnail"
  | "Logo"
  | "Featured";

/**
 * Image information from Epic
 */
export type GameImage = {
  type: ImageType;
  url: string;
};

/**
 * Base game metadata from Legendary
 */
export type GameMetadata = {
  title: string;
  description: string;
  keyImages: GameImage[];
  shortDescription?: string;
  longDescription?: string;
  developer?: string;
  publisher?: string;
  releaseDate?: string;
  categories?: string[];
  [key: string]: unknown; // Allow additional fields from API
};

/**
 * Epic game from Legendary library with full details
 */
export type EpicGame = {
  app_name: string;
  app_title: string;
  metadata: GameMetadata;
  title?: string;
  name?: string;
  namespace?: string;
  developer?: string;
  publisher?: string;
  releaseDate?: string;
  categories?: string[];
  [key: string]: unknown; // Allow additional fields from API
};

/**
 * Promotional offer from Epic Store
 */
export type PromoOffer = {
  startDate: string;
  endDate: string;
  discountSetting: {
    discountType: string;
    discountPercentage: number;
  };
};

/**
 * Price information from Epic Store
 */
export type PriceInfo = {
  basePrice: number;
  discount: number;
  discountPrice: number;
  currencyCode: string;
};

/**
 * Game from Epic Store catalog (with promotion info)
 */
export type StoreGame = {
  id: string;
  title: string;
  slug: string;
  keyImage?: GameImage;
  keyImages?: GameImage[];
  productSlug?: string;
  price?: PriceInfo;
  promotions?: {
    promotionalOffers?: Array<{
      promotionalOffers: PromoOffer[];
    }>;
  };
};

/**
 * Paginated response structure
 */
export type PaginatedData<T> = {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

/**
 * GraphQL response types (generic for flexibility)
 */
export type GraphQLWishlistItem = Record<string, unknown>;
export type GraphQLFriend = Record<string, unknown>;
export type GraphQLProfileData = Record<string, unknown>;
export type LegendaryStatusData = Record<string, unknown>;
