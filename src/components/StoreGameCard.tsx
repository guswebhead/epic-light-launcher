type StoreImage = {
  type?: string;
  url?: string;
};

type StorePrice = {
  discountPrice?: number;
  originalPrice?: number;
  discountPercentage?: number;
  currencyCode?: string;
};

type StoreGame = {
  title?: string;
  productSlug?: string;
  keyImages?: StoreImage[];
  price?: {
    totalPrice?: StorePrice;
  };
};

type Props = {
  game: StoreGame;
};

const IMAGE_PRIORITY = [
  "OfferImageWide",
  "DieselStoreFrontWide",
  "Thumbnail",
  "ProductImage",
  "Screenshot",
];

function pickImage(images?: StoreImage[]) {
  if (!images || images.length === 0) {
    return undefined;
  }
  for (const preferred of IMAGE_PRIORITY) {
    const match = images.find((image) => image.type === preferred && image.url);
    if (match?.url) {
      return match.url;
    }
  }
  return images[0]?.url;
}

function formatPrice(value?: number, currency = "BRL") {
  if (typeof value !== "number") {
    return "";
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(value / 100);
}

function resolvePrice(total?: StorePrice) {
  if (!total) {
    return { label: "Preco indisponivel", original: "", discount: "" };
  }

  const hasPrice =
    typeof total.discountPrice === "number" ||
    typeof total.originalPrice === "number";
  if (!hasPrice) {
    return { label: "Preco indisponivel", original: "", discount: "" };
  }

  const currency = total.currencyCode ?? "BRL";
  const discountPrice = total.discountPrice ?? 0;
  const originalPrice = total.originalPrice ?? 0;
  const discountPercentage = total.discountPercentage ?? 0;
  const isFree = discountPrice === 0 && originalPrice === 0;
  const isPromoFree = discountPrice === 0 && originalPrice > 0;

  if (isFree || isPromoFree) {
    return {
      label: "Gratis",
      original: isPromoFree ? formatPrice(originalPrice, currency) : "",
      discount: "",
    };
  }

  const hasDiscount =
    discountPrice > 0 && originalPrice > 0 && discountPrice < originalPrice;

  if (hasDiscount) {
    return {
      label: formatPrice(discountPrice, currency),
      original: formatPrice(originalPrice, currency),
      discount: `-${discountPercentage}%`,
    };
  }

  if (originalPrice > 0) {
    return { label: formatPrice(originalPrice, currency), original: "", discount: "" };
  }

  return { label: "Preco indisponivel", original: "", discount: "" };
}

export function StoreGameCard({ game }: Props) {
  const image = pickImage(game.keyImages);
  const priceInfo = resolvePrice(game.price?.totalPrice);

  const handleOpen = () => {
    if (!game.productSlug) {
      return;
    }
    const slug = game.productSlug.replace(/^\/+/, "");
    const url = `https://store.epicgames.com/pt-BR/p/${slug}`;
    window.open(url, "_blank");
  };

  return (
    <div
      onClick={handleOpen}
      className="group cursor-pointer rounded-lg overflow-hidden bg-gray-900 border border-gray-800 hover:border-gray-700 hover:shadow-xl transition"
    >
      <div className="relative h-40 bg-gradient-to-br from-gray-800 to-gray-950">
        {image ? (
          <img
            src={image}
            alt={game.title ?? "Epic Store"}
            className="w-full h-full object-cover group-hover:scale-105 transition"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
            Sem imagem
          </div>
        )}
        {priceInfo.discount && (
          <span className="absolute top-2 right-2 text-xs font-semibold bg-green-500 text-black px-2 py-1 rounded">
            {priceInfo.discount}
          </span>
        )}
      </div>

      <div className="p-3 space-y-1">
        <h3 className="text-sm font-semibold text-gray-100 truncate">
          {game.title ?? "Sem titulo"}
        </h3>
        <div className="flex items-center gap-2 text-sm">
          {priceInfo.original && (
            <span className="text-gray-400 line-through text-xs">
              {priceInfo.original}
            </span>
          )}
          <span className="text-gray-100 font-semibold">{priceInfo.label}</span>
        </div>
      </div>
    </div>
  );
}
