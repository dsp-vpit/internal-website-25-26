'use client';

import React, { useEffect, useState } from 'react';
import { useUser } from '../context/UserContext';
import { supabase } from '../../lib/supabaseClient';

export default function VotingPage() {
  const { user, loading } = useUser();
  const [event, setEvent] = useState<any>(null);
  const [candidate, setCandidate] = useState<any>(null);
  const [phase, setPhase] = useState<'opinion' | 'final'>('opinion');
  const [vote, setVote] = useState<string>('');
  const [hasVoted, setHasVoted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Fetch current event, candidate, and phase
  useEffect(() => {
    const fetchData = async () => {
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: false })
        .limit(1)
        .single();
      if (!eventError && eventData) {
        setEvent(eventData);
        setPhase(eventData.phase || 'opinion');
        const { data: candData, error: candError } = await supabase
          .from('candidates')
          .select('*')
          .eq('event_id', eventData.id)
          .order('id', { ascending: true });
        if (!candError && candData) {
          setCandidate(candData[eventData.current_candidate_index] || null);
        }
      }
    };
    fetchData();
  }, []);

  // Check if user has already voted for this candidate/phase
  useEffect(() => {
    const checkVote = async () => {
      if (!user || !event || !candidate) return;
      const { data, error } = await supabase
        .from('votes')
        .select('*')
        .eq('user_id', user.id)
        .eq('event_id', event.id)
        .eq('candidate_id', candidate.id)
        .eq('type', phase);
      setHasVoted(!!data && data.length > 0);
    };
    checkVote();
  }, [user, event, candidate, phase]);

  const handleVote = async (value: string) => {
    if (!user || !event || !candidate) return;
    
    // Confirm vote before submitting
    const confirmMessage = `Are you sure you want to vote "${value.toUpperCase()}" for ${candidate.name}?`;
    if (!window.confirm(confirmMessage)) return;
    
    setSubmitting(true);
    setMessage(null);
    const { error } = await supabase.from('votes').insert({
      user_id: user.id,
      event_id: event.id,
      candidate_id: candidate.id,
      type: phase,
      value,
      is_anonymous: phase === 'opinion',
    });
    if (error) {
      setMessage('Failed to submit vote: ' + error.message);
    } else {
      setMessage('Vote submitted successfully!');
      setHasVoted(true);
    }
    setSubmitting(false);
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

  if (!event || !candidate) {
    return (
      <div className="stack-l" style={{ placeItems: 'center', minHeight: 'calc(100vh - 200px)' }}>
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <div className="title">No Active Event</div>
          <p style={{ color: 'var(--muted)', marginTop: '1rem' }}>
            There is currently no active voting event or candidate.
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
          {event.type === 'member' ? 'Super Saturday' : 'Executive Committee Voting'}
        </div>
        <div className="row-m" style={{ color: 'var(--muted)' }}>
          <span className="mono">Date: {new Date(event.date).toLocaleDateString()}</span>
          <span className="mono">Phase: {phase === 'opinion' ? 'Opinion Poll' : 'Final Vote'}</span>
        </div>
      </div>

      {/* Candidate Information */}
      <div className="card" style={{ padding: '2rem' }}>
        <div className="title" style={{ marginBottom: '1.5rem', fontSize: '1.75rem' }}>
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
          
          {candidate.gpa && (
            <div className="row-m">
              <span style={{ color: 'var(--muted)', minWidth: '120px' }}>GPA:</span>
              <span style={{ fontWeight: '600' }}>{candidate.gpa}</span>
            </div>
          )}
          
          {candidate.position && (
            <div className="row-m">
              <span style={{ color: 'var(--muted)', minWidth: '120px' }}>Position:</span>
              <span style={{ fontWeight: '600' }}>{candidate.position}</span>
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
          borderColor: message.startsWith('Failed') ? 'var(--danger)' : 'var(--brand)',
          color: message.startsWith('Failed') ? 'var(--danger)' : 'var(--brand)'
        }}>
          {message}
        </div>
      )}
    </div>
  );
}