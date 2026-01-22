import { Calendar } from '@/components/ui/calendar';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function CalendarPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());

  const events = [
    { date: new Date(), title: 'Sprint Planning', type: 'meeting' },
    { date: new Date(Date.now() + 86400000), title: 'Design Review', type: 'review' },
    { date: new Date(Date.now() + 172800000), title: 'Release v1.0', type: 'milestone' },
  ];

  return (
    <div className="flex-1 p-8 bg-muted/30 overflow-auto">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-2">Calendar</h1>
        <p className="text-muted-foreground mb-8">View and manage your project schedule</p>

        <div className="grid md:grid-cols-[350px_1fr] gap-6">
          <Card>
            <CardContent className="pt-6">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {date ? format(date, 'MMMM d, yyyy') : 'Select a date'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {events.map((event, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-semibold text-sm">
                        {format(event.date, 'd')}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{event.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(event.date, 'EEEE, MMMM d')}
                      </p>
                    </div>
                    <Badge variant={event.type === 'milestone' ? 'default' : 'secondary'}>
                      {event.type}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
