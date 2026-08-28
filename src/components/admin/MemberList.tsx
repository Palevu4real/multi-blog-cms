"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

interface Member {
  id: string;
  role: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

interface MemberListProps {
  blogId: string;
  members: Member[];
  currentUserRole: string;
}

export function MemberList({ blogId, members, currentUserRole }: MemberListProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "EDITOR" | "AUTHOR">("AUTHOR");

  const canManageMembers = currentUserRole === "OWNER" || currentUserRole === "ADMIN";

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageMembers) return;

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/blogs/${blogId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to invite member");
      }

      setSuccess(`Invited ${inviteEmail} as ${inviteRole}`);
      setInviteEmail("");
      
      // Refresh the page
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string, userName: string) => {
    if (!confirm(`Remove ${userName} from this blog?`)) return;

    try {
      const response = await fetch(`/api/blogs/${blogId}/members/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to remove member");
      }

      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: "ADMIN" | "EDITOR" | "AUTHOR") => {
    try {
      const response = await fetch(`/api/blogs/${blogId}/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update role");
      }

      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getRoleColor = (role: string) => {
    const map: Record<string, "success" | "warning" | "info" | "default"> = {
      OWNER: "success",
      ADMIN: "warning",
      EDITOR: "info",
      AUTHOR: "default",
    };
    return map[role] || "default";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Members</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Invite Form */}
        {canManageMembers && (
          <form onSubmit={handleInvite} className="mb-6 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                label="Email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
                required
                className="flex-1"
              />
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="AUTHOR">Author</option>
                  <option value="EDITOR">Editor</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            {success && <p className="text-sm text-green-500">{success}</p>}
            <Button type="submit" disabled={isLoading} size="sm">
              {isLoading ? "Inviting..." : "Invite Member"}
            </Button>
          </form>
        )}

        {/* Members List */}
        <div className="space-y-3">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                  {member.user.name?.[0] || member.user.email[0]}
                </div>
                <div>
                  <p className="font-medium text-sm">{member.user.name || member.user.email}</p>
                  <p className="text-xs text-gray-500">{member.user.email}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Badge variant={getRoleColor(member.role)}>
                  {member.role}
                </Badge>
                {canManageMembers && member.role !== "OWNER" && (
                  <div className="flex items-center space-x-2">
                    <select
                      value={member.role}
                      onChange={(e) => handleUpdateRole(member.user.id, e.target.value as any)}
                      className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="AUTHOR">Author</option>
                      <option value="EDITOR">Editor</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                    <button
                      onClick={() => handleRemoveMember(member.user.id, member.user.name || member.user.email)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {members.length === 0 && (
            <p className="text-gray-500 text-sm">No members yet.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}