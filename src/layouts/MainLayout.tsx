import { NavLink, Outlet } from "react-router-dom";
import { useState } from "react";

export function MainLayout() {
  const [openStore, setOpenStore] = useState(false);

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `p-2 rounded block ${
      isActive ? "bg-gray-700 text-white" : "text-gray-400 hover:bg-gray-700"
    }`;

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <aside className="w-64 bg-gray-800 p-4 flex flex-col gap-2">
        <h2 className="text-xl font-bold mb-4">Omega</h2>

        {/* Store */}
        <div
          onMouseEnter={() => setOpenStore(true)}
          onMouseLeave={() => setOpenStore(false)}
        >
          <div className="p-2 cursor-pointer hover:bg-gray-700 rounded">
            Loja
          </div>

          {openStore && (
            <div className="ml-4 flex flex-col gap-1">
              <NavLink to="/store/highlights" className={navClass}>
                Destaques
              </NavLink>
              <NavLink to="/store/wishlist" className={navClass}>
                Lista de desejos
              </NavLink>
              <NavLink to="/store/all" className={navClass}>
                Todos os jogos
              </NavLink>
            </div>
          )}
        </div>

        {/* Outros menus */}
        <NavLink to="/library" className={navClass}>
          Biblioteca
        </NavLink>

        <NavLink to="/profile" className={navClass}>
          Perfil
        </NavLink>

        <NavLink to="/settings" className={navClass}>
          Configurações
        </NavLink>
      </aside>

      <main className="flex-1 p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
