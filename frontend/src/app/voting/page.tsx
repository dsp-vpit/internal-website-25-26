'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useUser } from '../context/UserContext';
import { supabase } from '../../lib/supabaseClient';
import ExecutiveVotingSection from './ExecutiveVotingSection';

type VoteValue = 'yes' | 'no' | 'abstain';
type VoteType = 'opinion' | 'final';

interface VoteData {
  user_id: string;
  event_id: string;
  candidate_id: string;
  type: VoteType;
  vote_value: VoteValue;
  is_anonymous: boolean;
}

interface Candidate {
  id: string;
  name: string;
  major?: string;
  grad_year?: string;
  gpa?: string;
  classification?: string;
  position?: string;
  image_url?: string;
  resume_url?: string;
  event_id: string;
  order_index: number;
}

export default function VotingPage() {
  const { user, loading } = useUser();
  const [event, setEvent] = useState<any>(null);
  const [candidate, setCandidate] = useState<any>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [phase, setPhase] = useState<VoteType>('opinion');
  const [hasVoted, setHasVoted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Auto-refresh state
  const [lastEventId, setLastEventId] = useState<string | null>(null);
  const [lastCandidateIndex, setLastCandidateIndex] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Helper function to format date without timezone issues
  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString();
  };

  // Fetch current event, candidate, and phase
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('*')
          .eq('is_ended', false)  // Only get non-ended events
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (eventError) {
          // Only log actual errors, not "no rows found" (PGRST116)
          if (eventError.code !== 'PGRST116') {
            console.error('Error fetching event:', eventError);
            setError('Failed to load event data');
            return;
          }
          // PGRST116 means no rows found, which is normal when no active event
          setEvent(null);
          setCandidate(null);
          setCandidates([]);
          setError(null);
          return;
        }
        
        if (!eventData) {
          setEvent(null);
          setCandidate(null);
          setCandidates([]);
          setError(null);
          return;
        }

        setEvent(eventData);
        // For exec events, always use 'final' phase (no opinion poll)
        // For member events, use the event's phase
        setPhase(eventData.type === 'exec' ? 'final' : (eventData.phase || 'opinion'));
        
        const { data: candData, error: candError } = await supabase
          .from('candidates')
          .select('*')
          .eq('event_id', eventData.id)
          .order('order_index', { ascending: true });
        
        if (candError) {
          console.error('Error fetching candidates:', candError);
          setError('Failed to load candidate data');
          return;
        }
        
        if (!candData || candData.length === 0) {
          setError('No candidates found for this event');
          return;
        }

        setCandidates(candData);
        
        // For exec events, we don't need current_candidate_index
        // For member events, we need to set the current candidate
        if (eventData.type === 'exec') {
          // Exec events: all candidates are shown at once, no current candidate needed
          setCandidate(null);
        } else {
          // Member events: show one candidate at a time
          const currentCandidate = candData[eventData.current_candidate_index] || null;
          if (!currentCandidate) {
            setError('No current candidate available');
            return;
          }
          setCandidate(currentCandidate);
        }
        
        // Update tracking variables for auto-refresh
        setLastEventId(eventData.id);
        setLastCandidateIndex(eventData.current_candidate_index);
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('An unexpected error occurred');
      }
    };
    
    fetchData();
  }, []);

  // Auto-refresh mechanism - check for updates every 3 seconds
  useEffect(() => {
    if (!user || !event) return;

    const checkForUpdates = async () => {
      try {
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('*')
          .eq('id', event.id)
          .single();

        if (!eventError && eventData) {
          let needsUpdate = false;
          
          // Check if candidate index has changed (for both member and exec events)
          if (eventData.current_candidate_index !== lastCandidateIndex) {
            console.log('Candidate index changed from', lastCandidateIndex, 'to', eventData.current_candidate_index);
            needsUpdate = true;
          }
          
          // Check if phase has changed (only for member events, exec always uses 'final')
          if (eventData.type === 'member' && eventData.phase !== phase) {
            console.log('Phase changed from', phase, 'to', eventData.phase);
            needsUpdate = true;
          }

          // If changes detected, fetch fresh data
          if (needsUpdate) {
            console.log('Fetching updated candidates...');
            // Fetch updated candidates
            const { data: candData, error: candError } = await supabase
              .from('candidates')
              .select('*')
              .eq('event_id', eventData.id)
              .order('order_index', { ascending: true });
            
            if (!candError && candData && candData.length > 0) {
              console.log('Candidates fetched:', candData.length, 'candidates');
              
              setCandidates(candData);
              setEvent(eventData);
              // For exec events, always use 'final' phase (no opinion poll)
              // For member events, use the event's phase
              setPhase(eventData.type === 'exec' ? 'final' : (eventData.phase || 'opinion'));
              
              // Update tracking variable
              setLastCandidateIndex(eventData.current_candidate_index);
              
              // For exec events, we don't need to set current candidate
              // For member events, set the current candidate
              if (eventData.type === 'exec') {
                setCandidate(null);
                // For exec events, reset error/message when position changes
                setMessage(null);
                setError(null);
              } else {
                console.log('Current candidate index:', eventData.current_candidate_index);
                console.log('Available candidates:', candData.map((c, i) => `${i}: ${c.name}`));
                const newCurrentCandidate = candData[eventData.current_candidate_index] || null;
                if (newCurrentCandidate) {
                  console.log('Setting new candidate:', newCurrentCandidate.name);
                  // Force re-render by creating a new object reference
                  setCandidate({ ...newCurrentCandidate });
                  setHasVoted(false); // Reset vote status for new candidate
                  setMessage(null);
                  setError(null);
                } else {
                  console.error('No candidate found at index:', eventData.current_candidate_index);
                }
              }
            } else {
              console.error('Error fetching candidates:', candError);
            }
          }
        }
      } catch (err) {
        console.error('Error checking for updates:', err);
      }
    };

    // Set up interval to check for updates every 3 seconds
    intervalRef.current = setInterval(checkForUpdates, 3000);

    // Cleanup interval on unmount or when dependencies change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user, event, lastCandidateIndex, phase]);

  // Check if user has already voted for this candidate/phase (only for member events)
  useEffect(() => {
    const checkVote = async () => {
      // Only check votes for member events (exec events handle voting differently)
      if (!user || !event || !candidate || event.type === 'exec') return;
      
      try {
        const { data, error } = await supabase
          .from('votes')
          .select('id')
          .eq('user_id', user.id)
          .eq('event_id', event.id)
          .eq('candidate_id', candidate.id)
          .eq('type', phase)
          .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Error checking vote:', error);
          return;
        }
        
        setHasVoted(!!data);
      } catch (err) {
        console.error('Error checking vote status:', err);
      }
    };
    
    checkVote();
  }, [user, event, candidate, phase]);

  const validateVote = (value: string, phase: VoteType): value is VoteValue => {
    if (phase === 'opinion') {
      return ['yes', 'no', 'abstain'].includes(value);
    } else {
      return ['yes', 'no'].includes(value);
    }
  };

  const handleVote = async (value: string) => {
    if (!user || !event || !candidate) {
      setError('Missing required data for voting');
      return;
    }

    // Validate vote value
    if (!validateVote(value, phase)) {
      setError(`Invalid vote value: ${value}`);
      return;
    }

    // Check if user is approved
    if (!user.is_approved) {
      setError('Your account must be approved to vote');
      return;
    }

    // Check if user can vote
    if (!user.can_vote) {
      setError('You do not have voting privileges');
      return;
    }

    // Confirm vote before submitting
    const voteOptions = {
      yes: 'YES',
      no: 'NO', 
      abstain: 'ABSTAIN'
    };
    const confirmMessage = `Are you sure you want to vote "${voteOptions[value as keyof typeof voteOptions]}" for ${candidate.name}?`;
    if (!window.confirm(confirmMessage)) return;
    
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const voteData: VoteData = {
        user_id: user.id,
        event_id: event.id,
        candidate_id: candidate.id,
        type: phase,
        vote_value: value as VoteValue,
        is_anonymous: phase === 'opinion',
      };

      const { error } = await supabase
        .from('votes')
        .insert(voteData);

      if (error) {
        console.error('Vote submission error:', error);
        
        // Handle specific error cases
        if (error.code === '23505') { // Unique constraint violation
          setError('You have already voted for this candidate in this phase');
        } else if (error.code === '23514') { // Check constraint violation
          setError('Invalid vote value or type');
        } else {
          setError(`Failed to submit vote: ${error.message}`);
        }
      } else {
        setMessage('Vote submitted successfully!');
        setHasVoted(true);
      }
    } catch (err) {
      console.error('Unexpected error during vote submission:', err);
      setError('An unexpected error occurred while submitting your vote');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="stack-l" style={{ placeItems: 'center', minHeight: 'calc(100vh - 200px)' }}>
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <div className="title">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user.is_approved) {
    return (
      <div className="stack-l" style={{ placeItems: 'center', minHeight: 'calc(100vh - 200px)' }}>
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <div className="title">Account Not Approved</div>
          <p style={{ color: 'var(--muted)', marginTop: '1rem' }}>
            Your account must be approved by an administrator to access voting.
          </p>
        </div>
      </div>
    );
  }

  if (!user.can_vote) {
    return (
      <div className="stack-l" style={{ placeItems: 'center', minHeight: 'calc(100vh - 200px)' }}>
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <div className="title">No Voting Privileges</div>
          <p style={{ color: 'var(--muted)', marginTop: '1rem' }}>
            You do not currently have voting privileges.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="stack-l" style={{ placeItems: 'center', minHeight: 'calc(100vh - 200px)' }}>
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <div className="title">Error</div>
          <p style={{ color: 'var(--danger)', marginTop: '1rem' }}>{error}</p>
          <button 
            className="btn btn-ghost" 
            onClick={() => window.location.reload()}
            style={{ marginTop: '1rem' }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="stack-l" style={{ placeItems: 'center', minHeight: 'calc(100vh - 200px)' }}>
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <div className="title">No Active Event</div>
          <p style={{ color: 'var(--muted)', marginTop: '1rem' }}>
            There is currently no active voting event.
          </p>
        </div>
      </div>
    );
  }

  // For exec events, render executive voting section
  if (event.type === 'exec') {
    if (candidates.length === 0) {
      return (
        <div className="stack-l" style={{ placeItems: 'center', minHeight: 'calc(100vh - 200px)' }}>
          <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
            <div className="title">No Candidates</div>
            <p style={{ color: 'var(--muted)', marginTop: '1rem' }}>
              No candidates found for this executive election.
            </p>
          </div>
        </div>
      );
    }
    
    return <ExecutiveVotingSection event={{ ...event, current_candidate_index: event.current_candidate_index || 0 }} candidates={candidates} user={user} />;
  }

  // For member events, render existing member voting UI
  if (!candidate) {
    return (
      <div className="stack-l" style={{ placeItems: 'center', minHeight: 'calc(100vh - 200px)' }}>
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <div className="title">No Active Candidate</div>
          <p style={{ color: 'var(--muted)', marginTop: '1rem' }}>
            There is currently no active candidate for this event.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="stack-l">
      {/* Event Header */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div className="title" style={{ marginBottom: '1rem' }}>
          {event.event_name || (event.type === 'member' ? 'New Member Voting' : 'Executive Committee Voting')}
        </div>
        <div className="row-m" style={{ color: 'var(--muted)' }}>
          <span className="mono">Date: {formatDate(event.date)}</span>
          <span className="mono">Phase: {phase === 'opinion' ? 'Opinion Poll' : 'Final Vote'}</span>
        </div>
      </div>

      {/* Candidate Information */}
      <div className="card" style={{ padding: '2rem' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'flex-start', 
          gap: '2rem',
          flexWrap: 'wrap'
        }}>
          {/* Left side - Candidate details */}
          <div style={{ flex: 1, minWidth: '300px' }}>
            <div className="title" style={{ 
              marginBottom: '1.5rem', 
              fontSize: '1.75rem'
            }}>
              {candidate.name}
            </div>
            
            <div className="stack-m">
          {candidate.major && (
            <div className="row-m">
              <span style={{ color: 'var(--muted)', minWidth: '120px' }}>Major:</span>
              <span style={{ fontWeight: '600' }}>{candidate.major}</span>
            </div>
          )}
          
          {candidate.grad_year && (
            <div className="row-m">
              <span style={{ color: 'var(--muted)', minWidth: '120px' }}>Grad Year:</span>
              <span style={{ fontWeight: '600' }}>{candidate.grad_year}</span>
            </div>
          )}
          
          {candidate.classification && (
            <div className="row-m">
              <span style={{ color: 'var(--muted)', minWidth: '120px' }}>Classification:</span>
              <span style={{ fontWeight: '600' }}>{candidate.classification}</span>
            </div>
          )}
          
          {candidate.gpa && (
            <div className="row-m">
              <span style={{ color: 'var(--muted)', minWidth: '120px' }}>GPA:</span>
              <span style={{ fontWeight: '600' }}>{parseFloat(candidate.gpa).toFixed(2)}</span>
            </div>
          )}
          
          {candidate.position && (
            <div className="row-m">
              <span style={{ color: 'var(--muted)', minWidth: '120px' }}>Position:</span>
              <span style={{ fontWeight: '600' }}>{candidate.position}</span>
            </div>
          )}
          
          {candidate.resume_url && (
            <div className="row-m" style={{ marginTop: '1rem' }}>
              <a 
                href={candidate.resume_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-ghost"
                style={{ minWidth: '120px', textDecoration: 'none' }}
              >
                Resume
              </a>
            </div>
          )}
            </div>
          </div>
          
          {/* Right side - Candidate image */}
          {candidate.image_url && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center',
              alignItems: 'center',
              minWidth: '200px'
            }}>
              <img
                key={`${candidate.id}-${candidate.image_url}`}
                src={candidate.image_url}
                alt={`${candidate.name} photo`}
                style={{
                  width: '200px',
                  height: '200px',
                  objectFit: 'cover',
                  borderRadius: '12px',
                  border: '2px solid var(--border)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                }}
                onError={(e) => {
                  // Hide image if it fails to load
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Voting Section */}
      <div className="card" style={{ padding: '2rem' }}>
        {hasVoted ? (
          <div style={{ textAlign: 'center' }}>
            <div className="title" style={{ color: 'var(--brand)', marginBottom: '0.5rem' }}>
              ✓ Vote Submitted
            </div>
            <p style={{ color: 'var(--muted)' }}>
              You have already voted for this candidate in the {phase === 'opinion' ? 'opinion poll' : 'final vote'}.
            </p>
          </div>
        ) : (
          <div className="stack-m">
            <div className="title" style={{ textAlign: 'center', marginBottom: '1rem' }}>
              {phase === 'opinion' ? 'Opinion Poll' : 'Final Vote'}
            </div>
            
            <div className="row-m" style={{ justifyContent: 'center', gap: '1rem' }}>
              {phase === 'opinion' ? (
                <>
                  <button 
                    className="btn btn-primary" 
                    disabled={submitting}
                    onClick={() => handleVote('yes')}
                    style={{ minWidth: '120px' }}
                  >
                    {submitting ? 'Submitting...' : 'Yes'}
                  </button>
                  <button 
                    className="btn btn-ghost" 
                    disabled={submitting}
                    onClick={() => handleVote('no')}
                    style={{ minWidth: '120px' }}
                  >
                    {submitting ? 'Submitting...' : 'No'}
                  </button>
                  <button 
                    className="btn btn-ghost" 
                    disabled={submitting}
                    onClick={() => handleVote('abstain')}
                    style={{ minWidth: '120px' }}
                  >
                    {submitting ? 'Submitting...' : 'Abstain'}
                  </button>
                </>
              ) : (
                <>
                  <button 
                    className="btn btn-primary" 
                    disabled={submitting}
                    onClick={() => handleVote('yes')}
                    style={{ minWidth: '120px' }}
                  >
                    {submitting ? 'Submitting...' : 'Yes'}
                  </button>
                  <button 
                    className="btn btn-ghost" 
                    disabled={submitting}
                    onClick={() => handleVote('no')}
                    style={{ minWidth: '120px' }}
                  >
                    {submitting ? 'Submitting...' : 'No'}
                  </button>
                </>
              )}
            </div>
            
            {phase === 'opinion' && (
              <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.9rem', marginTop: '1rem' }}>
                Opinion polls are anonymous and help assess initial sentiment.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Status Messages */}
      {message && (
        <div className="card" style={{ 
          padding: '1rem', 
          textAlign: 'center',
          borderColor: 'var(--brand)',
          color: 'var(--brand)'
        }}>
          {message}
        </div>
      )}

      {error && (
        <div className="card" style={{ 
          padding: '1rem', 
          textAlign: 'center',
          borderColor: 'var(--danger)',
          color: 'var(--danger)'
        }}>
          {error}
        </div>
      )}
    </div>
  );
}