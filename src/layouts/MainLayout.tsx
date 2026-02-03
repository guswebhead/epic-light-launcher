import { Outlet } from "react-router-dom";
import { NavLink } from "react-router-dom";

const navClass = ({ isActive }: { isActive: boolean }) =>
 `p-2 rounded flex items-center gap-2 ${
    isActive ? "bg-gray-700 text-white" : "text-gray-400 hover:bg-gray-700"
  }`;

export function MainLayout() {
  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <aside className="w-60 bg-gray-800 p-4 flex flex-col gap-4">
        <h2 className="text-xl font-bold mb-4">Epic Light</h2>

        <NavLink to="/" end className={navClass}>
          🏪 Store
        </NavLink>

        <NavLink to="/library" className={navClass}>
          🎮 Library
        </NavLink>

        <NavLink to="/profile" className={navClass}>
          👤 Profile
        </NavLink>

        <NavLink to="/settings" className={navClass}>
          ⚙️ Settings
        </NavLink>
      </aside>

      <main className="flex-1 p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
