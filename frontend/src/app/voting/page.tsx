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
      setMessage('Vote submitted!');
      setHasVoted(true);
    }
    setSubmitting(false);
  };

  if (loading || !user) return <div style={{ padding: 32 }}>Loading...</div>;
  if (!event || !candidate) return <div style={{ padding: 32 }}>No active event or candidate.</div>;

  return (
    <div style={{ padding: 32 }}>
      <h1>Voting</h1>
      <div style={{ marginBottom: 16 }}>
        <b>Event:</b> {event.type} | <b>Date:</b> {event.date} | <b>Phase:</b> {phase}
      </div>
      <div style={{ marginBottom: 16 }}>
        <b>Candidate:</b> {candidate.name}
        {candidate.major && <span> | Major: {candidate.major}</span>}
        {candidate.grad_year && <span> | Grad Year: {candidate.grad_year}</span>}
        {candidate.gpa && <span> | GPA: {candidate.gpa}</span>}
        {candidate.position && <span> | Position: {candidate.position}</span>}
      </div>
      {hasVoted ? (
        <div style={{ color: 'green', marginBottom: 16 }}>You have already voted for this candidate in this phase.</div>
      ) : (
        <div style={{ marginBottom: 16 }}>
          {phase === 'opinion' ? (
            <>
              <button disabled={submitting} onClick={() => handleVote('yes')}>Yes</button>
              <button disabled={submitting} onClick={() => handleVote('no')} style={{ marginLeft: 8 }}>No</button>
              <button disabled={submitting} onClick={() => handleVote('abstain')} style={{ marginLeft: 8 }}>Abstain</button>
            </>
          ) : (
            <>
              <button disabled={submitting} onClick={() => handleVote('yes')}>Yes</button>
              <button disabled={submitting} onClick={() => handleVote('no')} style={{ marginLeft: 8 }}>No</button>
            </>
          )}
        </div>
      )}
      {message && <div style={{ color: message.startsWith('Failed') ? 'red' : 'green' }}>{message}</div>}
    </div>
  );
} 