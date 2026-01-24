import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MilestoneData {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  durationDays: number;
}

interface SyncRequest {
  boardId: string;
  groupId?: string;
  featureName: string;
  milestones: MilestoneData[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MONDAY_API_KEY = Deno.env.get('MONDAY_API_KEY');
    
    if (!MONDAY_API_KEY) {
      console.error('MONDAY_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Monday.com API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { boardId, groupId, featureName, milestones }: SyncRequest = await req.json();
    
    console.log(`Syncing ${milestones.length} milestones to Monday.com board ${boardId}`);

    if (!boardId || !milestones || milestones.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: boardId and milestones' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];
    const errors = [];

    for (const milestone of milestones) {
      try {
        // Format dates for Monday.com (YYYY-MM-DD)
        const itemName = `${featureName} - ${milestone.name}`;
        
        // Build column values - Monday.com expects specific format
        const columnValues: Record<string, unknown> = {
          // Date column - use the start date
          date: { date: milestone.startDate },
          // Timeline column if it exists - shows start to end
          timeline: { 
            from: milestone.startDate, 
            to: milestone.endDate 
          },
          // Numbers column for duration
          numbers: milestone.durationDays,
          // Text column for milestone name
          text: milestone.name
        };

        const mutation = `
          mutation {
            create_item (
              board_id: ${boardId}
              ${groupId ? `group_id: "${groupId}"` : ''}
              item_name: "${itemName.replace(/"/g, '\\"')}"
              column_values: ${JSON.stringify(JSON.stringify(columnValues))}
            ) {
              id
              name
            }
          }
        `;

        console.log(`Creating item: ${itemName}`);

        const response = await fetch('https://api.monday.com/v2', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': MONDAY_API_KEY,
            'API-Version': '2024-01'
          },
          body: JSON.stringify({ query: mutation })
        });

        const data = await response.json();
        
        if (data.errors) {
          console.error(`Error creating item ${milestone.name}:`, data.errors);
          errors.push({ milestone: milestone.name, error: data.errors });
        } else if (data.data?.create_item) {
          console.log(`Successfully created item: ${data.data.create_item.name}`);
          results.push(data.data.create_item);
        }
      } catch (itemError) {
        console.error(`Error processing milestone ${milestone.name}:`, itemError);
        errors.push({ milestone: milestone.name, error: String(itemError) });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        created: results.length,
        failed: errors.length,
        results,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sync-to-monday function:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
