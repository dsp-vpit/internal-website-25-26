'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import CandidateRadioCard from './CandidateRadioCard';

interface Candidate {
  id: string;
  name: string;
  position?: string;
  image_url?: string;
  resume_url?: string;
  classification?: string;
  order_index: number;
}

interface ExecutiveVotingSectionProps {
  event: {
    id: string;
    type: string;
    event_name?: string;
    date: string;
    phase: 'opinion' | 'final';
    current_candidate_index: number;
  };
  candidates: Candidate[];
  user: {
    id: string;
    is_approved: boolean;
    can_vote: boolean;
  };
}

interface PositionGroup {
  position: string;
  candidates: Candidate[];
  firstCandidateIndex: number;
}

export default function ExecutiveVotingSection({
  event,
  candidates,
  user
}: ExecutiveVotingSectionProps) {
  const [selectedCandidates, setSelectedCandidates] = useState<Map<string, string>>(new Map());
  const [hasVotedMap, setHasVotedMap] = useState<Map<string, boolean>>(new Map());
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Group candidates by position and find first candidate index for each position
  const positionGroups: PositionGroup[] = React.useMemo(() => {
    const groups = new Map<string, { candidates: Candidate[], firstIndex: number }>();
    
    candidates.forEach((candidate, index) => {
      if (candidate.position) {
        if (!groups.has(candidate.position)) {
          groups.set(candidate.position, { candidates: [], firstIndex: index });
        }
        groups.get(candidate.position)!.candidates.push(candidate);
      }
    });
    
    return Array.from(groups.entries()).map(([position, data]) => ({
      position,
      candidates: data.candidates,
      firstCandidateIndex: data.firstIndex
    })).sort((a, b) => a.firstCandidateIndex - b.firstCandidateIndex);
  }, [candidates]);

  // Get current position based on current_candidate_index
  const currentPositionGroup = React.useMemo(() => {
    // Find the position group where the current_candidate_index falls
    for (const group of positionGroups) {
      const lastCandidateIndex = group.firstCandidateIndex + group.candidates.length - 1;
      if (event.current_candidate_index >= group.firstCandidateIndex && 
          event.current_candidate_index <= lastCandidateIndex) {
        return group;
      }
    }
    // If no match, return the first position
    return positionGroups[0] || null;
  }, [positionGroups, event.current_candidate_index]);

  // Check existing votes for current position only
  useEffect(() => {
    const checkExistingVotes = async () => {
      if (!user || !event || !currentPositionGroup) return;
      
      try {
        // For exec events, always use 'final' phase (no opinion poll)
        const { data: votes, error: votesError } = await supabase
          .from('votes')
          .select('candidate_id, position')
          .eq('user_id', user.id)
          .eq('event_id', event.id)
          .eq('type', 'final')
          .eq('position', currentPositionGroup.position);
        
        if (votesError) {
          console.error('Error checking existing votes:', votesError);
          return;
        }
        
        // Update maps for current position
        setHasVotedMap(prev => {
          const newMap = new Map(prev);
          newMap.set(currentPositionGroup.position, votes && votes.length > 0);
          return newMap;
        });
        
        setSelectedCandidates(prev => {
          const newMap = new Map(prev);
          if (votes && votes.length > 0) {
            newMap.set(currentPositionGroup.position, votes[0].candidate_id);
          }
          return newMap;
        });
        
        // Clear error/message when position changes
        setError(null);
        setMessage(null);
      } catch (err) {
        console.error('Error checking vote status:', err);
      }
    };
    
    checkExistingVotes();
  }, [user, event?.id, currentPositionGroup?.position]);

  const handleCandidateSelect = (candidateId: string) => {
    if (!currentPositionGroup) return;
    
    const newSelected = new Map(selectedCandidates);
    newSelected.set(currentPositionGroup.position, candidateId);
    setSelectedCandidates(newSelected);
    setError(null);
  };

  const handleSubmitVote = async () => {
    if (!currentPositionGroup) return;
    
    // Validate: ensure one candidate selected for current position
    const selectedCandidateId = selectedCandidates.get(currentPositionGroup.position);
    if (!selectedCandidateId) {
      setError('Please select a candidate before submitting.');
      return;
    }

    // Confirm before submitting
    const confirmMessage = `Are you sure you want to vote for ${currentPositionGroup.candidates.find(c => c.id === selectedCandidateId)?.name} as ${currentPositionGroup.position}?`;
    if (!window.confirm(confirmMessage)) return;

    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      // Delete any existing votes for this position (exec events only use 'final' phase)
      await supabase
        .from('votes')
        .delete()
        .eq('user_id', user.id)
        .eq('event_id', event.id)
        .eq('type', 'final')
        .eq('position', currentPositionGroup.position);
      
      // Insert new vote (always 'final' phase for exec events)
      const voteData = {
        user_id: user.id,
        event_id: event.id,
        candidate_id: selectedCandidateId,
        type: 'final' as const,
        vote_value: 'yes' as const,
        is_anonymous: true,
        position: currentPositionGroup.position
      };
      
      const { error } = await supabase.from('votes').insert(voteData);
      
      if (error) {
        console.error('Vote submission error:', error);
        setError(`Failed to submit vote: ${error.message}`);
        return;
      }

      setMessage('Vote submitted successfully!');
      
      // Update hasVotedMap to reflect successful submission
      const newHasVotedMap = new Map(hasVotedMap);
      newHasVotedMap.set(currentPositionGroup.position, true);
      setHasVotedMap(newHasVotedMap);
      
    } catch (err) {
      console.error('Unexpected error during vote submission:', err);
      setError('An unexpected error occurred while submitting your vote');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString();
  };

  return (
    <div className="stack-l">
      {/* Event Header */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div className="title" style={{ marginBottom: '1rem' }}>
          {event.event_name || 'Executive Committee Voting'}
        </div>
        <div className="row-m" style={{ color: 'var(--muted)' }}>
          <span className="mono">Date: {formatDate(event.date)}</span>
          <span className="mono">Phase: Final Vote</span>
        </div>
      </div>

      {/* Instructions */}
      {currentPositionGroup && (
        <>
          <div className="card" style={{ padding: '1.5rem', backgroundColor: 'var(--surface)' }}>
            <div style={{ textAlign: 'center', color: 'var(--muted)' }}>
              <p style={{ marginBottom: '0.5rem', fontWeight: '600' }}>
                Position {positionGroups.findIndex(g => g.position === currentPositionGroup.position) + 1} of {positionGroups.length}
              </p>
              <p style={{ fontSize: '0.9rem' }}>
                Your vote will be recorded anonymously.
              </p>
            </div>
          </div>

          {/* Current Position Section */}
          <div className="card" style={{ padding: '2rem' }}>
            <div className="title" style={{ marginBottom: '1.5rem' }}>
              {currentPositionGroup.position}
            </div>
            
            <div className="stack-m" style={{ gap: '1rem' }}>
              {currentPositionGroup.candidates.map((candidate) => {
                const hasVoted = hasVotedMap.get(currentPositionGroup.position) || false;
                const selectedCandidateId = selectedCandidates.get(currentPositionGroup.position);
                const isSelected = selectedCandidateId === candidate.id;
                
                return (
                  <CandidateRadioCard
                    key={candidate.id}
                    candidate={candidate}
                    position={currentPositionGroup.position}
                    selected={isSelected}
                    disabled={submitting || hasVoted}
                    hasVoted={hasVoted && !isSelected}
                    onSelect={() => !submitting && !hasVoted && handleCandidateSelect(candidate.id)}
                  />
                );
              })}
            </div>
            
            {hasVotedMap.get(currentPositionGroup.position) && (
              <div style={{ 
                marginTop: '1rem', 
                padding: '0.75rem', 
                backgroundColor: 'var(--surface)',
                borderRadius: '8px',
                textAlign: 'center',
                color: 'var(--brand)',
                fontSize: '0.9rem'
              }}>
                ✓ You have voted for this position
              </div>
            )}
          </div>
        </>
      )}

      {!currentPositionGroup && (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <div className="title">No Position Available</div>
          <p style={{ color: 'var(--muted)', marginTop: '1rem' }}>
            No position is currently available for voting.
          </p>
        </div>
      )}

      {/* Submit Button */}
      {currentPositionGroup && (
        <div className="card" style={{ padding: '2rem' }}>
          <div style={{ textAlign: 'center' }}>
            {hasVotedMap.get(currentPositionGroup.position) ? (
              <div>
                <div className="title" style={{ color: 'var(--brand)', marginBottom: '0.5rem' }}>
                  ✓ Vote Submitted
                </div>
                <p style={{ color: 'var(--muted)' }}>
                  You have submitted your vote for {currentPositionGroup.position}. Admin will advance to the next position.
                </p>
              </div>
            ) : (
              <button
                className="btn btn-primary"
                onClick={handleSubmitVote}
                disabled={submitting || !selectedCandidates.get(currentPositionGroup.position)}
                style={{ 
                  minWidth: '200px',
                  fontSize: '1.1rem',
                  padding: '1rem 2rem'
                }}
              >
                {submitting ? 'Submitting...' : 'Submit Vote'}
              </button>
            )}
          </div>
        </div>
      )}

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

