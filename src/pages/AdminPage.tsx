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
import { Loader2, Users, FolderOpen, Shield, ShieldOff, Trash2, RefreshCw, Check, X, Clock, UserCheck } from 'lucide-react';
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
    approveUser,
    revokeApproval,
    promoteToAdmin,
    demoteFromAdmin,
    deleteProject
  } = useAdmin();

  const [userToPromote, setUserToPromote] = useState<AdminUser | null>(null);
  const [userToDemote, setUserToDemote] = useState<AdminUser | null>(null);
  const [userToApprove, setUserToApprove] = useState<AdminUser | null>(null);
  const [userToRevoke, setUserToRevoke] = useState<AdminUser | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<AdminProject | null>(null);
  const [activeTab, setActiveTab] = useState('pending');

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

  const pendingUsers = users.filter(u => !u.is_approved);
  const approvedUsers = users.filter(u => u.is_approved);
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
      <div className="grid gap-4 md:grid-cols-4">
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
        <Card className={pendingUsers.length > 0 ? 'border-amber-500 dark:border-amber-400' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingUsers.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Users</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{approvedUsers.length}</div>
            <p className="text-xs text-muted-foreground">Active accounts</p>
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
      </div>

      {/* Tabs for Users and Projects */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="w-4 h-4" />
            Pending
            {pendingUsers.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {pendingUsers.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="w-4 h-4" />
            Approved Users
          </TabsTrigger>
          <TabsTrigger value="projects" className="gap-2">
            <FolderOpen className="w-4 h-4" />
            Projects
          </TabsTrigger>
        </TabsList>

        {/* Pending Users Tab */}
        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Pending Approvals</CardTitle>
                <CardDescription>Users waiting for account approval</CardDescription>
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
              ) : pendingUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UserCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No pending users to approve</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Signed Up</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingUsers.map((u) => (
                      <TableRow key={u.user_id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{u.email}</p>
                            <p className="text-xs text-muted-foreground font-mono">{u.user_id.slice(0, 8)}...</p>
                          </div>
                        </TableCell>
                        <TableCell>{format(new Date(u.created_at), 'PPp')}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            size="sm"
                            onClick={() => setUserToApprove(u)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Approve
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

        {/* Approved Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Approved Users</CardTitle>
                <CardDescription>Manage active user accounts and roles</CardDescription>
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
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Projects</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvedUsers.map((u) => (
                      <TableRow key={u.user_id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {u.email}
                              {u.user_id === user?.id && (
                                <Badge variant="secondary" className="ml-2">You</Badge>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">{u.user_id.slice(0, 8)}...</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                            {u.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                            {u.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{u.project_count}</TableCell>
                        <TableCell>{format(new Date(u.role_assigned_at), 'PP')}</TableCell>
                        <TableCell className="text-right space-x-2">
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
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setUserToPromote(u)}
                              >
                                <Shield className="w-4 h-4 mr-1" />
                                Make Admin
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setUserToRevoke(u)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
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
                        <TableCell>
                          <div>
                            <p className="text-sm">{project.user_email}</p>
                            <p className="text-xs text-muted-foreground font-mono">{project.user_id.slice(0, 8)}...</p>
                          </div>
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

      {/* Approve User Dialog */}
      <AlertDialog open={!!userToApprove} onOpenChange={(open) => !open && setUserToApprove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve User</AlertDialogTitle>
            <AlertDialogDescription>
              Approve <strong>{userToApprove?.email}</strong> to access the application?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (userToApprove) {
                  approveUser(userToApprove.user_id);
                  setUserToApprove(null);
                }
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke Approval Dialog */}
      <AlertDialog open={!!userToRevoke} onOpenChange={(open) => !open && setUserToRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Access</AlertDialogTitle>
            <AlertDialogDescription>
              Revoke access for <strong>{userToRevoke?.email}</strong>? They will no longer be able to use the application.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (userToRevoke) {
                  revokeApproval(userToRevoke.user_id);
                  setUserToRevoke(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revoke Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Promote Confirmation Dialog */}
      <AlertDialog open={!!userToPromote} onOpenChange={(open) => !open && setUserToPromote(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Promote to Admin</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to give admin privileges to <strong>{userToPromote?.email}</strong>?
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
              Are you sure you want to remove admin privileges from <strong>{userToDemote?.email}</strong>?
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
