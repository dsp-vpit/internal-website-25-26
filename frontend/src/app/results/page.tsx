'use client';

import React, { useEffect, useState } from 'react';
import { useUser } from '../context/UserContext';
import { supabase } from '../../lib/supabaseClient';

interface VoteResult {
  candidate_id: string;
  candidate_name: string;
  candidate_major?: string;
  candidate_grad_year?: number;
  candidate_gpa?: number;
  candidate_position?: string;
  opinion_yes: number;
  opinion_no: number;
  opinion_abstain: number;
  opinion_total: number;
  opinion_yes_percent: number;
  final_yes: number;
  final_no: number;
  final_total: number;
  final_yes_percent: number;
  approved: boolean;
}

interface EventData {
  id: string;
  type: 'new_member' | 'exec';
  date: string;
  phase: 'opinion' | 'final';
  current_candidate_index: number;
  approval_threshold: number;
}

interface Candidate {
  id: string;
  name: string;
  major?: string;
  grad_year?: number;
  gpa?: number;
  position?: string;
  event_id: string;
}

interface Vote {
  id: string;
  user_id: string;
  event_id: string;
  candidate_id: string;
  type: 'opinion' | 'final';
  vote_value: 'yes' | 'no' | 'abstain';
  is_anonymous: boolean;
  created_at: string;
}

export default function ResultsPage() {
  const { user, loading } = useUser();
  const [event, setEvent] = useState<EventData | null>(null);
  const [results, setResults] = useState<VoteResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approvalThreshold, setApprovalThreshold] = useState(85);
  const [updatingThreshold, setUpdatingThreshold] = useState(false);

  // Fetch current event and results
  useEffect(() => {
    const fetchResults = async () => {
      if (!user) return;
      
      setLoadingResults(true);
      setError(null);

      try {
        // Fetch current event
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('*')
          .eq('is_ended', false)  // Only get non-ended events
          .order('date', { ascending: false })
          .limit(1)
          .single();

        if (eventError) {
          console.error('Error fetching event:', eventError);
          setError('Failed to load event data');
          return;
        }

        if (!eventData) {
          setError('No active event found');
          return;
        }
        
        setEvent(eventData);
        setApprovalThreshold(eventData.approval_threshold || 85);

        // Fetch all candidates for this event
        const { data: candidates, error: candidatesError } = await supabase
          .from('candidates')
          .select('*')
          .eq('event_id', eventData.id)
          .order('id', { ascending: true });

        if (candidatesError) {
          console.error('Error fetching candidates:', candidatesError);
          setError('Failed to load candidate data');
          return;
        }

        if (!candidates || candidates.length === 0) {
          setError('No candidates found for this event');
          return;
        }

        // Fetch all votes for this event
        const { data: votes, error: votesError } = await supabase
          .from('votes')
          .select('*')
          .eq('event_id', eventData.id);

        if (votesError) {
          console.error('Error fetching votes:', votesError);
          setError('Failed to load vote data');
          return;
        }

        // Calculate results for each candidate
        const calculatedResults: VoteResult[] = candidates.map((candidate: Candidate) => {
          const candidateVotes = votes?.filter((vote: Vote) => vote.candidate_id === candidate.id) || [];
          
          // Opinion poll votes
          const opinionVotes = candidateVotes.filter((vote: Vote) => vote.type === 'opinion');
          const opinionYes = opinionVotes.filter((vote: Vote) => vote.vote_value === 'yes').length;
          const opinionNo = opinionVotes.filter((vote: Vote) => vote.vote_value === 'no').length;
          const opinionAbstain = opinionVotes.filter((vote: Vote) => vote.vote_value === 'abstain').length;
          const opinionTotal = opinionVotes.length;
          const opinionYesPercent = opinionTotal > 0 ? Math.round((opinionYes / opinionTotal) * 100) : 0;

          // Final vote votes
          const finalVotes = candidateVotes.filter((vote: Vote) => vote.type === 'final');
          const finalYes = finalVotes.filter((vote: Vote) => vote.vote_value === 'yes').length;
          const finalNo = finalVotes.filter((vote: Vote) => vote.vote_value === 'no').length;
          const finalTotal = finalVotes.length;
          const finalYesPercent = finalTotal > 0 ? Math.round((finalYes / finalTotal) * 100) : 0;

          // Determine if approved (for new member events)
          const approved = eventData.type === 'new_member' && finalYesPercent >= approvalThreshold;

          return {
            candidate_id: candidate.id,
            candidate_name: candidate.name,
            candidate_major: candidate.major,
            candidate_grad_year: candidate.grad_year,
            candidate_gpa: candidate.gpa,
            candidate_position: candidate.position,
            opinion_yes: opinionYes,
            opinion_no: opinionNo,
            opinion_abstain: opinionAbstain,
            opinion_total: opinionTotal,
            opinion_yes_percent: opinionYesPercent,
            final_yes: finalYes,
            final_no: finalNo,
            final_total: finalTotal,
            final_yes_percent: finalYesPercent,
            approved
          };
        });

        setResults(calculatedResults);
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoadingResults(false);
      }
    };

    fetchResults();
  }, [user, approvalThreshold]);

  const updateApprovalThreshold = async (newThreshold: number) => {
    if (!event || !user?.is_admin) return;
    
    setUpdatingThreshold(true);
    try {
      const { error } = await supabase
        .from('events')
        .update({ approval_threshold: newThreshold })
        .eq('id', event.id);

      if (error) {
        console.error('Error updating threshold:', error);
        setError('Failed to update approval threshold');
      } else {
        setApprovalThreshold(newThreshold);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred');
    } finally {
      setUpdatingThreshold(false);
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
          <div className="title">Access Denied</div>
          <p style={{ color: 'var(--muted)', marginTop: '1rem' }}>
            Your account must be approved to view results.
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

  if (loadingResults) {
    return (
      <div className="stack-l" style={{ placeItems: 'center', minHeight: 'calc(100vh - 200px)' }}>
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <div className="title">Loading Results...</div>
        </div>
      </div>
    );
  }

  if (!event || results.length === 0) {
    return (
      <div className="stack-l" style={{ placeItems: 'center', minHeight: 'calc(100vh - 200px)' }}>
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <div className="title">No Results Available</div>
          <p style={{ color: 'var(--muted)', marginTop: '1rem' }}>
            No voting results are available at this time.
          </p>
        </div>
      </div>
    );
  }

  // Sort results by final vote percentage (descending)
  const sortedResults = [...results].sort((a, b) => b.final_yes_percent - a.final_yes_percent);

  return (
    <div className="stack-l">
      {/* Header */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div className="title" style={{ marginBottom: '1rem' }}>
          {event.type === 'new_member' ? 'New Member Voting Results' : 'Executive Committee Results'}
        </div>
        <div className="row-m" style={{ color: 'var(--muted)' }}>
          <span className="mono">Date: {new Date(event.date).toLocaleDateString()}</span>
          <span className="mono">Phase: {event.phase === 'opinion' ? 'Opinion Poll' : 'Final Vote'}</span>
          <span className="mono">Total Candidates: {results.length}</span>
        </div>
        {user.is_admin && event.type === 'new_member' && (
          <div className="row-m" style={{ marginTop: '1rem', alignItems: 'center' }}>
            <span>Approval Threshold:</span>
            <input
              type="range"
              min="50"
              max="100"
              value={approvalThreshold}
              onChange={(e) => updateApprovalThreshold(parseInt(e.target.value))}
              disabled={updatingThreshold}
              style={{ width: '200px' }}
            />
            <span className="mono">{approvalThreshold}%</span>
          </div>
        )}
      </div>

      {/* Results Summary */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div className="title" style={{ marginBottom: '1rem' }}>Summary</div>
        <div className="row-m" style={{ color: 'var(--muted)' }}>
          <span>Total Votes Cast: {results.reduce((sum, r) => sum + r.final_total, 0)}</span>
          {event.type === 'new_member' && (
            <span>Approved: {results.filter(r => r.approved).length}</span>
          )}
        </div>
      </div>

      {/* Results List */}
      <div className="stack-m">
        {sortedResults.map((result, index) => (
          <div key={result.candidate_id} className="card" style={{ padding: '1.5rem' }}>
            <div className="row-m" style={{ alignItems: 'center', marginBottom: '1rem' }}>
              <div className="title" style={{ fontSize: '1.25rem' }}>
                #{index + 1} - {result.candidate_name}
              </div>
              {result.approved && (
                <span style={{ 
                  color: 'var(--brand)', 
                  fontWeight: 'bold',
                  padding: '0.25rem 0.5rem',
                  border: '1px solid var(--brand)',
                  fontSize: '0.8rem'
                }}>
                  APPROVED
                </span>
              )}
            </div>

            {/* Candidate Info */}
            <div className="stack-m" style={{ marginBottom: '1rem' }}>
              {result.candidate_major && (
                <div className="row-m">
                  <span style={{ color: 'var(--muted)', minWidth: '100px' }}>Major:</span>
                  <span>{result.candidate_major}</span>
                </div>
              )}
              {result.candidate_grad_year && (
                <div className="row-m">
                  <span style={{ color: 'var(--muted)', minWidth: '100px' }}>Grad Year:</span>
                  <span>{result.candidate_grad_year}</span>
                </div>
              )}
              {result.candidate_gpa && (
                <div className="row-m">
                  <span style={{ color: 'var(--muted)', minWidth: '100px' }}>GPA:</span>
                  <span>{result.candidate_gpa}</span>
                </div>
              )}
              {result.candidate_position && (
                <div className="row-m">
                  <span style={{ color: 'var(--muted)', minWidth: '100px' }}>Position:</span>
                  <span>{result.candidate_position}</span>
                </div>
              )}
            </div>

            {/* Opinion Poll Results */}
            <div className="stack-m" style={{ marginBottom: '1rem' }}>
              <div className="title" style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
                Opinion Poll Results
              </div>
              <div className="row-m" style={{ gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-elev)', minWidth: '120px', textAlign: 'center', border: '2px solid var(--border)' }}>
                  <div style={{ color: 'var(--brand)', fontWeight: 'bold', marginBottom: '0.25rem' }}>Yes</div>
                  <div className="mono">{result.opinion_yes} ({result.opinion_yes_percent}%)</div>
                </div>
                <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-elev)', minWidth: '120px', textAlign: 'center', border: '2px solid var(--border)' }}>
                  <div style={{ color: 'var(--danger)', fontWeight: 'bold', marginBottom: '0.25rem' }}>No</div>
                  <div className="mono">{result.opinion_no}</div>
                </div>
                <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-elev)', minWidth: '120px', textAlign: 'center', border: '2px solid var(--border)' }}>
                  <div style={{ color: 'var(--muted)', fontWeight: 'bold', marginBottom: '0.25rem' }}>Abstain</div>
                  <div className="mono">{result.opinion_abstain}</div>
                </div>
                <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-elev)', minWidth: '120px', textAlign: 'center', border: '2px solid var(--border)' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Total</div>
                  <div className="mono">{result.opinion_total}</div>
                </div>
              </div>
            </div>

            {/* Final Vote Results */}
            {event.phase === 'final' && (
              <div className="stack-m">
                <div className="title" style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
                  Final Vote Results
                </div>
                <div className="row-m" style={{ gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-elev)', minWidth: '120px', textAlign: 'center', border: '2px solid var(--border)' }}>
                    <div style={{ color: 'var(--brand)', fontWeight: 'bold', marginBottom: '0.25rem' }}>Yes</div>
                    <div className="mono">{result.final_yes} ({result.final_yes_percent}%)</div>
                  </div>
                  <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-elev)', minWidth: '120px', textAlign: 'center', border: '2px solid var(--border)' }}>
                    <div style={{ color: 'var(--danger)', fontWeight: 'bold', marginBottom: '0.25rem' }}>No</div>
                    <div className="mono">{result.final_no}</div>
                  </div>
                  <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-elev)', minWidth: '120px', textAlign: 'center', border: '2px solid var(--border)' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Total</div>
                    <div className="mono">{result.final_total}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
