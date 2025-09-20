import { supabase } from './supabaseClient';

/**
 * Fetches all votes for an event using pagination to bypass Supabase's 1000 row limit
 * @param eventId - The event ID to fetch votes for
 * @param pageName - Name of the page calling this function (for debugging)
 * @returns Promise<{votes: any[], totalCount: number}>
 */
export async function fetchAllVotes(eventId: string, pageName: string = 'Unknown') {
  console.log(`${pageName}: Fetching votes for event:`, eventId);
  
  // Get total count first
  const { count: totalCount } = await supabase
    .from('votes')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId);
  
  console.log(`${pageName}: Total votes in database for this event:`, totalCount);
  
  // Fetch all votes using pagination
  let allVotes: any[] = [];
  let from = 0;
  const batchSize = 1000;
  
  while (true) {
    const { data: batchVotes, error: batchError } = await supabase
      .from('votes')
      .select('*')
      .eq('event_id', eventId)
      .range(from, from + batchSize - 1);
    
    if (batchError) {
      console.error(`${pageName}: Error fetching vote batch:`, batchError);
      throw batchError;
    }
    
    if (!batchVotes || batchVotes.length === 0) {
      break;
    }
    
    allVotes = allVotes.concat(batchVotes);
    console.log(`${pageName}: Fetched batch: ${batchVotes.length} votes (total so far: ${allVotes.length})`);
    
    if (batchVotes.length < batchSize) {
      break; // Last batch
    }
    
    from += batchSize;
  }
  
  console.log(`${pageName}: Votes query result:`, { 
    dataLength: allVotes.length, 
    totalInDB: totalCount
  });
  
  return {
    votes: allVotes,
    totalCount: totalCount || 0
  };
}
