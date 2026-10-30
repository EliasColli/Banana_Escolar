import type { Role, User } from '@banana/api-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { api } from '@/shared/api/client';
import {
  ErrorState,
  LoadingState,
  PageHeader,
  RoleBadge,
} from '@/shared/components/ui';
import { useUsers } from '@/shared/hooks/use-catalogs';
import { formatDate } from '@/shared/lib/labels';

export function UsersPage() {
  const query = useUsers();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<Role | ''>('');

  const mutation = useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) =>
      api.setUserActive(id, activo),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const users = useMemo(() => {
    const list = query.data ?? [];
    const term = search.trim().toLowerCase();
    return list.filter((user) => {
      const matchesRole = !role || user.rol === role;
      const matchesTerm =
        !term ||
        user.nombre.toLowerCase().includes(term) ||
        user.correo.toLowerCase().includes(term);
      return matchesRole && matchesTerm;
    });
  }, [query.data, search, role]);

  if (query.isPending) return <LoadingState />;
  if (query.isError) {
    return <ErrorState message={query.error.message} onRetry={() => void query.refetch()} />;
  }

  return (
    <div>
      <PageHeader
        eyebrow="Administración"
        title="Usuarios"
        description="Solicitantes, técnicos y administradores registrados. Puedes desactivar cuentas sin borrar su historial."
      />

      <div className="card mb-5 p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              className="input pl-9"
              placeholder="Buscar por nombre o correo…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select
            className="input sm:w-56"
            value={role}
            onChange={(event) => setRole(event.target.value as Role | '')}
            aria-label="Filtrar por rol"
          >
            <option value="">Todos los roles</option>
            <option value="ADMIN">Administradores</option>
            <option value="TECNICO">Técnicos</option>
            <option value="USUARIO">Solicitantes</option>
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-base min-w-[720px]">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Alta</th>
                <th>Estado</th>
                <th className="text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user: User) => (
                <tr key={user.id}>
                  <td>
                    <p className="font-medium text-slate-800">{user.nombre}</p>
                    <p className="text-xs text-slate-400">{user.correo}</p>
                  </td>
                  <td>
                    <RoleBadge role={user.rol} />
                  </td>
                  <td className="text-sm text-slate-500">{formatDate(user.creadoEn)}</td>
                  <td>
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                        user.activo ? 'text-emerald-700' : 'text-slate-400'
                      }`}
                    >
                      <span
                        className={`size-2 rounded-full ${
                          user.activo ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}
                      />
                      {user.activo ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="text-right">
                    <button
                      type="button"
                      className="btn-ghost px-3 py-1.5 text-xs"
                      disabled={mutation.isPending}
                      onClick={() => mutation.mutate({ id: user.id, activo: !user.activo })}
                    >
                      {user.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-slate-500">
            No hay usuarios que coincidan con la búsqueda.
          </p>
        )}
      </div>

      {mutation.isError && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {mutation.error.message}
        </p>
      )}
    </div>
  );
}
