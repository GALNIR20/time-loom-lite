import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin, AdminUser, AdminProject } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { Loader2, Users, FolderOpen, Shield, ShieldOff, Trash2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    isAdmin, 
    loading, 
    users, 
    allProjects, 
    loadingUsers, 
    loadingProjects,
    fetchUsers, 
    fetchAllProjects,
    promoteToAdmin,
    demoteFromAdmin,
    deleteProject
  } = useAdmin();

  const [userToPromote, setUserToPromote] = useState<AdminUser | null>(null);
  const [userToDemote, setUserToDemote] = useState<AdminUser | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<AdminProject | null>(null);

  // Redirect non-admins
  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/');
    }
  }, [loading, isAdmin, navigate]);

  // Fetch data when admin status confirmed
  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchAllProjects();
    }
  }, [isAdmin, fetchUsers, fetchAllProjects]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const adminCount = users.filter(u => u.role === 'admin').length;
  const totalUsers = users.length;
  const totalProjects = allProjects.length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage users and projects</p>
        </div>
        <Badge variant="outline" className="text-primary border-primary">
          <Shield className="w-3 h-3 mr-1" />
          Admin
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {adminCount} admin{adminCount !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProjects}</div>
            <p className="text-xs text-muted-foreground">Across all users</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Projects/User</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalUsers > 0 ? (totalProjects / totalUsers).toFixed(1) : 0}
            </div>
            <p className="text-xs text-muted-foreground">Per registered user</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Users and Projects */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" className="gap-2">
            <Users className="w-4 h-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="projects" className="gap-2">
            <FolderOpen className="w-4 h-4" />
            Projects
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>User Management</CardTitle>
                <CardDescription>View and manage user roles</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loadingUsers}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loadingUsers ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User ID</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Projects</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.user_id}>
                        <TableCell className="font-mono text-sm">
                          {u.user_id.slice(0, 8)}...
                          {u.user_id === user?.id && (
                            <Badge variant="secondary" className="ml-2">You</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                            {u.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                            {u.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{u.project_count}</TableCell>
                        <TableCell>{format(new Date(u.role_assigned_at), 'PP')}</TableCell>
                        <TableCell className="text-right">
                          {u.role === 'admin' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setUserToDemote(u)}
                              disabled={u.user_id === user?.id}
                              className="text-destructive hover:text-destructive"
                            >
                              <ShieldOff className="w-4 h-4 mr-1" />
                              Remove Admin
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setUserToPromote(u)}
                            >
                              <Shield className="w-4 h-4 mr-1" />
                              Make Admin
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>All Projects</CardTitle>
                <CardDescription>View and manage all user projects</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchAllProjects} disabled={loadingProjects}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loadingProjects ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {loadingProjects ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project Name</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Preset</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allProjects.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell className="font-medium">{project.feature_name}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {project.user_id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{project.preset}</Badge>
                        </TableCell>
                        <TableCell>{format(new Date(project.created_at), 'PP')}</TableCell>
                        <TableCell>{format(new Date(project.updated_at), 'PP')}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setProjectToDelete(project)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Promote Confirmation Dialog */}
      <AlertDialog open={!!userToPromote} onOpenChange={(open) => !open && setUserToPromote(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Promote to Admin</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to give admin privileges to user {userToPromote?.user_id.slice(0, 8)}...?
              They will be able to manage all users and projects.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (userToPromote) {
                  promoteToAdmin(userToPromote.user_id);
                  setUserToPromote(null);
                }
              }}
            >
              Promote
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Demote Confirmation Dialog */}
      <AlertDialog open={!!userToDemote} onOpenChange={(open) => !open && setUserToDemote(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Admin Privileges</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove admin privileges from user {userToDemote?.user_id.slice(0, 8)}...?
              They will no longer be able to access the admin dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (userToDemote) {
                  demoteFromAdmin(userToDemote.user_id);
                  setUserToDemote(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Admin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Project Confirmation Dialog */}
      <AlertDialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{projectToDelete?.feature_name}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (projectToDelete) {
                  deleteProject(projectToDelete.id);
                  setProjectToDelete(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
