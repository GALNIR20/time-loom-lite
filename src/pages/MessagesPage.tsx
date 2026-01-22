import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const conversations = [
  { id: 1, name: 'Sarah Chen', lastMessage: 'The new feature is ready for review', time: '2m ago', unread: 2 },
  { id: 2, name: 'Mike Wilson', lastMessage: 'Updated the design mockups', time: '1h ago', unread: 0 },
  { id: 3, name: 'Alex Johnson', lastMessage: 'Sprint planning meeting at 3pm', time: '3h ago', unread: 1 },
  { id: 4, name: 'Emily Davis', lastMessage: 'All tests passed!', time: '1d ago', unread: 0 },
];

const messages = [
  { id: 1, sender: 'Sarah Chen', content: 'Hey, I just finished the new dashboard component!', time: '10:30 AM', isOwn: false },
  { id: 2, sender: 'You', content: 'That\'s great! Can you push it to the review branch?', time: '10:32 AM', isOwn: true },
  { id: 3, sender: 'Sarah Chen', content: 'Already done. The new feature is ready for review', time: '10:35 AM', isOwn: false },
];

export default function MessagesPage() {
  const [selectedConversation, setSelectedConversation] = useState(conversations[0]);
  const [newMessage, setNewMessage] = useState('');

  return (
    <div className="flex-1 p-8 bg-muted/30 overflow-auto">
      <div className="max-w-6xl mx-auto h-[calc(100vh-8rem)]">
        <h1 className="text-3xl font-bold text-foreground mb-2">Messages</h1>
        <p className="text-muted-foreground mb-6">Chat with your team members</p>

        <div className="grid md:grid-cols-[320px_1fr] gap-4 h-[calc(100%-5rem)]">
          {/* Conversations List */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search conversations..." className="pl-9" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-20rem)]">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`w-full flex items-center gap-3 p-4 text-left transition-colors ${
                      selectedConversation.id === conv.id ? 'bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                  >
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {conv.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-foreground truncate">{conv.name}</p>
                        <span className="text-xs text-muted-foreground">{conv.time}</span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
                    </div>
                    {conv.unread > 0 && (
                      <Badge className="ml-2">{conv.unread}</Badge>
                    )}
                  </button>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="flex flex-col overflow-hidden">
            <CardHeader className="border-b">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {selectedConversation.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-base">{selectedConversation.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">Online</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-4 overflow-auto">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-lg px-4 py-2 ${
                      msg.isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      <p className="text-sm">{msg.content}</p>
                      <p className={`text-xs mt-1 ${msg.isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {msg.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1"
                />
                <Button size="icon">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
