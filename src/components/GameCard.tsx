type GameCardProps = {
  title: string;
  image: string;
  slug: string;
};

export function GameCard({ title, image, slug }: GameCardProps) {
  const openInEpic = () => {
    window.open(`com.epicgames.launcher://store/p/${slug}`);
  };

  return (
    <div
      className="bg-gray-800 rounded overflow-hidden 
hover:scale-105 hover:shadow-xl transition-all duration-200"
    >
      <img src={image} alt={title} className="h-40 w-full object-cover" />
      <div className="p-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <button
          onClick={openInEpic}
          className="mt-2 w-full bg-blue-600 hover:bg-blue-700 p-1 rounded text-sm"
        >
          Abrir na Epic
        </button>
      </div>
    </div>
  );
}
