type GameCardProps = {
  title: string;
  image: string;
};

export function GameCard({ title, image }: GameCardProps) {
  return (
    <div className="game-card">
      <img src={image} alt={title} />
      <h3>{title}</h3>
    </div>
  );
}
