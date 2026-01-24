import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MilestoneData {
  id: string;
  name: string;
  phase: string;
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

    const { boardId, featureName, milestones }: SyncRequest = await req.json();
    
    console.log(`Syncing ${milestones.length} milestones to Monday.com board ${boardId}`);

    if (!boardId || !milestones || milestones.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: boardId and milestones' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // First, fetch the board's columns to get the correct column IDs
    const columnsQuery = `
      query {
        boards(ids: [${boardId}]) {
          columns {
            id
            title
            type
          }
        }
      }
    `;

    console.log('Fetching board columns...');
    const columnsResponse = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': MONDAY_API_KEY,
        'API-Version': '2024-01'
      },
      body: JSON.stringify({ query: columnsQuery })
    });

    const columnsData = await columnsResponse.json();
    const columns = columnsData.data?.boards?.[0]?.columns || [];
    
    console.log('Board columns:', JSON.stringify(columns));

    // Find column IDs by type
    const dateColumn = columns.find((c: { type: string }) => c.type === 'date');
    const timelineColumn = columns.find((c: { type: string }) => c.type === 'timeline');
    const numbersColumn = columns.find((c: { type: string }) => c.type === 'numbers' || c.type === 'numeric');
    const textColumn = columns.find((c: { type: string }) => c.type === 'text');
    // Find status columns - first one for milestone, second one for phase
    const statusColumns = columns.filter((c: { type: string }) => c.type === 'status');
    const milestoneStatusColumn = statusColumns[0];
    const phaseStatusColumn = statusColumns[1];

    console.log('Found columns - date:', dateColumn?.id, 'timeline:', timelineColumn?.id, 'numbers:', numbersColumn?.id, 'text:', textColumn?.id, 'status columns:', statusColumns.map((c: { id: string }) => c.id));

    // Find the Brief milestone to get the project start date
    const briefMilestone = milestones.find(m => m.name.toLowerCase() === 'brief');
    const projectDate = briefMilestone?.startDate || milestones[0]?.startDate;

    // Create a new group with the feature/project name
    let groupId: string | undefined;
    try {
      const createGroupMutation = `
        mutation {
          create_group (
            board_id: ${boardId}
            group_name: "${featureName.replace(/"/g, '\\"')}"
          ) {
            id
          }
        }
      `;

      console.log(`Creating group: ${featureName}`);

      const groupResponse = await fetch('https://api.monday.com/v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': MONDAY_API_KEY,
          'API-Version': '2024-01'
        },
        body: JSON.stringify({ query: createGroupMutation })
      });

      const groupData = await groupResponse.json();
      
      if (groupData.data?.create_group?.id) {
        groupId = groupData.data.create_group.id;
        console.log(`Successfully created group: ${featureName} with id: ${groupId}`);
      } else if (groupData.errors) {
        console.error('Error creating group:', groupData.errors);
      }
    } catch (groupError) {
      console.error('Error creating group:', groupError);
    }

    const results = [];
    const errors = [];

    for (const milestone of milestones) {
      try {
        const itemName = `${featureName} - ${milestone.name}`;
        
        // Build column values using the actual column IDs from the board
        const columnValues: Record<string, unknown> = {};
        
        // Date column - use each milestone's own start date
        if (dateColumn?.id) {
          columnValues[dateColumn.id] = { date: milestone.startDate };
        }
        
        // Timeline column - shows start to end for each milestone
        if (timelineColumn?.id) {
          columnValues[timelineColumn.id] = { 
            from: milestone.startDate, 
            to: milestone.endDate 
          };
        }
        
        // Numbers column for duration
        if (numbersColumn?.id) {
          columnValues[numbersColumn.id] = String(milestone.durationDays);
        }
        
        // Text column for milestone name
        if (textColumn?.id) {
          columnValues[textColumn.id] = milestone.name;
        }

        // Status column for milestone name
        if (milestoneStatusColumn?.id) {
          columnValues[milestoneStatusColumn.id] = { label: milestone.name };
        }

        // Status column for phase name
        if (phaseStatusColumn?.id && milestone.phase) {
          columnValues[phaseStatusColumn.id] = { label: milestone.phase };
        }

        console.log(`Column values for ${itemName}:`, JSON.stringify(columnValues));

        const mutation = `
          mutation {
            create_item (
              board_id: ${boardId}
              ${groupId ? `group_id: "${groupId}"` : ''}
              item_name: "${itemName.replace(/"/g, '\\"')}"
              column_values: ${JSON.stringify(JSON.stringify(columnValues))}
              create_labels_if_missing: true
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
