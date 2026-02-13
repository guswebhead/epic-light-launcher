import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export function MainLayout() {
  const [openStore, setOpenStore] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `p-2 rounded block ${
      isActive ? "bg-gray-700 text-white" : "text-gray-400 hover:bg-gray-700"
    }`;

  const handleLogout = async () => {
    try {
      setLogoutLoading(true);
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Falha ao sair da sessao local:", error);
    } finally {
      setLogoutLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <aside className="flex w-64 flex-col gap-2 bg-gray-800 p-4">
        <h2 className="mb-4 text-xl font-bold">Omega</h2>

        <div
          onMouseEnter={() => setOpenStore(true)}
          onMouseLeave={() => setOpenStore(false)}
        >
          <div className="cursor-pointer rounded p-2 hover:bg-gray-700">Loja</div>

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

        <NavLink to="/library" className={navClass}>
          Biblioteca
        </NavLink>

        <NavLink to="/profile" className={navClass}>
          Perfil
        </NavLink>

        <NavLink to="/settings" className={navClass}>
          Configuracoes
        </NavLink>

        <div className="mt-auto rounded border border-gray-700 bg-gray-900/70 p-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Sessao local
          </p>
          <p className="mt-1 truncate text-sm font-medium text-gray-200">
            {user?.username ?? "Sem usuario"}
          </p>
          <button
            onClick={handleLogout}
            disabled={logoutLoading}
            className="mt-3 w-full rounded bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-500 disabled:opacity-60"
          >
            {logoutLoading ? "Saindo..." : "Sair"}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
