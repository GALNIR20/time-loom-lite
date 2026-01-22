import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Mail, MoreHorizontal } from 'lucide-react';

const teamMembers = [
  { id: 1, name: 'Alex Johnson', role: 'Project Manager', email: 'alex@example.com', status: 'online' },
  { id: 2, name: 'Sarah Chen', role: 'Lead Developer', email: 'sarah@example.com', status: 'online' },
  { id: 3, name: 'Mike Wilson', role: 'UX Designer', email: 'mike@example.com', status: 'away' },
  { id: 4, name: 'Emily Davis', role: 'QA Engineer', email: 'emily@example.com', status: 'offline' },
  { id: 5, name: 'Chris Brown', role: 'Backend Developer', email: 'chris@example.com', status: 'online' },
];

export default function TeamPage() {
  return (
    <div className="flex-1 p-8 bg-muted/30 overflow-auto">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Team</h1>
            <p className="text-muted-foreground">Manage your project team members</p>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Member
          </Button>
        </div>

        <div className="grid gap-4">
          {teamMembers.map((member) => (
            <Card key={member.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="relative">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${
                    member.status === 'online' ? 'bg-green-500' :
                    member.status === 'away' ? 'bg-yellow-500' : 'bg-muted-foreground'
                  }`} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{member.name}</p>
                  <p className="text-sm text-muted-foreground">{member.role}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {member.status}
                  </Badge>
                  <Button variant="ghost" size="icon">
                    <Mail className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
