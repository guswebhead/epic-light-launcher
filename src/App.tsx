import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "./layouts/MainLayout";
import { Store } from "./pages/Store";
import { Library } from "./pages/Library";
import { Profile } from "./pages/Profile";
import { Settings } from "./pages/Settings";

import { Highlights } from "./pages/store/Highlights";
import { Wishlist } from "./pages/store/Wishlist";
import { AllGames } from "./pages/store/AllGames";
import { GameDetails } from "./pages/GameDetails";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Store />} />
          <Route path="/store/highlights" element={<Highlights />} />
          <Route path="/store/wishlist" element={<Wishlist />} />
          <Route path="/store/all" element={<AllGames />} />
          <Route path="/library" element={<Library />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/game/:appName" element={<GameDetails />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
