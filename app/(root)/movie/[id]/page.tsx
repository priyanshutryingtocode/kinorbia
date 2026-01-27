import { Calendar, Clock, Star } from "lucide-react";

async function getMovie(id: string) {
  const res = await fetch(
    `https://api.themoviedb.org/3/movie/${id}?api_key=${process.env.TMDB_API_KEY}`,
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) throw new Error("Movie not found");
  return res.json();
}

// 1. Update the type definition to wrap params in Promise
type Props = {
  params: Promise<{ id: string }>;
};

// 2. Make the component async and accept the new Props type
export default async function MoviePage({ params }: Props) {
  // 3. AWAIT the params to get the ID
  const { id } = await params; 
  
  const movie = await getMovie(id);

  const hours = Math.floor(movie.runtime / 60);
  const minutes = movie.runtime % 60;

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Backdrop */}
      <div 
        className="absolute top-0 left-0 w-full h-[60vh] bg-cover bg-center opacity-30 mask-image-b"
        style={{ backgroundImage: `url(https://image.tmdb.org/t/p/original${movie.backdrop_path})` }}
      >
        <div className="absolute inset-0 bg-linear-to-t from-neutral-950 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-32 flex flex-col md:flex-row gap-10">
        <img 
          src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`} 
          alt={movie.title}
          className="w-64 md:w-80 rounded-lg shadow-2xl border border-white/10"
        />

        <div className="flex-1 mt-4">
          <h1 className="text-5xl font-bold tracking-tighter mb-2">
            {movie.title} 
            <span className="text-neutral-500 font-normal ml-4 text-4xl">
              ({movie.release_date.split("-")[0]})
            </span>
          </h1>
          <p className="text-xl text-neutral-400 italic mb-6">{movie.tagline}</p>
          
          <div className="flex items-center gap-6 text-sm font-medium text-neutral-300 mb-8">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              <span>{movie.vote_average.toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-neutral-500" />
              <span>{hours}h {minutes}m</span>
            </div>
          </div>
          
          <h3 className="text-lg font-semibold mb-2 text-neutral-200">Overview</h3>
          <p className="text-neutral-400 leading-relaxed max-w-2xl">{movie.overview}</p>
        </div>
      </div>
    </div>
  );
}