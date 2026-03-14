import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { adminApi, type AdminUser } from "../lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useAuth } from "../context/AuthContext";

export function AdminTestPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const isAllowed = useMemo(() => Boolean(user?.is_admin), [user?.is_admin]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await adminApi.getUsers();
      setUsers(response.users || []);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAllowed) {
      void loadUsers();
    }
  }, [isAllowed]);

  const onDeleteUser = async (target: AdminUser) => {
    const confirmed = window.confirm(
      `Delete ${target.email} and all their datasets/reports? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingUserId(target.id);
    try {
      const result = await adminApi.deleteUser(target.id);
      toast.success(
        `Deleted ${result.deleted_user_email} (${result.deleted_datasets} datasets, ${result.deleted_reports} reports)`
      );
      setUsers((previous) => previous.filter((entry) => entry.id !== target.id));
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "Delete failed");
    } finally {
      setDeletingUserId(null);
    }
  };

  if (!isAllowed) {
    return (
      <div className="mx-auto max-w-[900px] px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Access denied</CardTitle>
            <CardDescription>This testing admin page is restricted.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[900px] px-4 py-8 space-y-4">
      <Card className="fv-panel fv-accent-left-warning">
        <CardHeader>
          <CardTitle>Testing Admin Cleanup</CardTitle>
          <CardDescription>
            Testing admin access only. Delete users and cascade delete their datasets/reports.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end">
            <Button variant="outline" onClick={loadUsers} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>{users.length} account(s)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {users.map((entry) => {
            const isSelf = entry.id === user?.id || entry.email === user?.email;
            return (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{entry.full_name || entry.email}</p>
                  <p className="text-xs text-muted-foreground truncate">{entry.email}</p>
                  <p className="text-xs text-muted-foreground">Datasets: {entry.dataset_count}</p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => onDeleteUser(entry)}
                  disabled={isSelf || deletingUserId === entry.id}
                >
                  {deletingUserId === entry.id ? "Deleting..." : isSelf ? "Protected" : "Delete"}
                </Button>
              </div>
            );
          })}
          {!loading && users.length === 0 && (
            <p className="text-sm text-muted-foreground">No users found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
