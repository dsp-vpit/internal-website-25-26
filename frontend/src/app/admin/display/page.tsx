'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '../../context/UserContext';
import { supabase } from '../../../lib/supabaseClient';

interface Candidate {
  id: string;
  name: string;
  major?: string;
  grad_year?: string;
  gpa?: string;
  image_url?: string;
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

interface Event {
  id: string;
  type: string;
  event_name?: string;
  date: string;
  phase: 'opinion' | 'final';
  is_ended: boolean;
  approval_threshold: number;
}

interface OpinionResults {
  yes: number;
  no: number;
  abstain: number;
  total: number;
}

export default function DisplayPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [currentCandidateIndex, setCurrentCandidateIndex] = useState(0);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch current event, candidates, and votes
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !user.is_admin) return;

      setLoadingData(true);
      setError(null);

      try {
        // Get current active event
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('*')
          .eq('is_ended', false)
          .order('created_at', { ascending: false })
          .limit(1);

        if (eventError) throw eventError;

        if (!eventData || eventData.length === 0) {
          setError('No active voting event found');
          setLoadingData(false);
          return;
        }

        const currentEvent = eventData[0];
        setEvent(currentEvent);

        // Check if we're in final phase
        if (currentEvent.phase !== 'final') {
          setError('Display is only available during the final vote phase');
          setLoadingData(false);
          return;
        }

        // Get candidates for this event
        const { data: candidatesData, error: candidatesError } = await supabase
          .from('candidates')
          .select('*')
          .eq('event_id', currentEvent.id)
          .order('order_index', { ascending: true });

        if (candidatesError) throw candidatesError;

        if (!candidatesData || candidatesData.length === 0) {
          setError('No candidates found for this event');
          setLoadingData(false);
          return;
        }

        setCandidates(candidatesData);

        // Get all votes for this event
        const { data: votesData, error: votesError } = await supabase
          .from('votes')
          .select('*')
          .eq('event_id', currentEvent.id);

        if (votesError) throw votesError;
        setVotes(votesData || []);

      } catch (err) {
        console.error('Error fetching display data:', err);
        setError('Failed to load display data');
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [user]);

  // Calculate opinion poll results for current candidate
  const getOpinionResults = (candidateId: string): OpinionResults => {
    const candidateVotes = votes.filter(vote => 
      vote.candidate_id === candidateId && vote.type === 'opinion'
    );

    const yes = candidateVotes.filter(vote => vote.vote_value === 'yes').length;
    const no = candidateVotes.filter(vote => vote.vote_value === 'no').length;
    const abstain = candidateVotes.filter(vote => vote.vote_value === 'abstain').length;
    const total = candidateVotes.length;

    return { yes, no, abstain, total };
  };

  // Navigation functions
  const goToPrevious = () => {
    setCurrentCandidateIndex(prev => 
      prev > 0 ? prev - 1 : candidates.length - 1
    );
  };

  const goToNext = () => {
    setCurrentCandidateIndex(prev => 
      prev < candidates.length - 1 ? prev + 1 : 0
    );
  };

  // Simple bar chart component for opinion poll results
  const OpinionBarChart = ({ results }: { results: OpinionResults }) => {
    if (results.total === 0) {
      return (
        <div style={{ 
          width: '100%', 
          padding: '2rem',
          background: 'var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--muted)',
          fontSize: '0.95rem'
        }}>
          No votes yet
        </div>
      );
    }

    const yesPercent = Math.round((results.yes / results.total) * 100);
    const noPercent = Math.round((results.no / results.total) * 100);
    const abstainPercent = Math.round((results.abstain / results.total) * 100);

    return (
      <div style={{ 
        width: '100%',
        background: 'var(--card)',
        border: '2px solid var(--border)',
        padding: '1.5rem'
      }}>
        {/* Total votes display */}
        <div style={{ 
          textAlign: 'center',
          padding: '0.9rem 1.1rem',
          background: 'var(--brand)',
          fontSize: '0.95rem',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '1.5rem',
          display: 'inline-block',
          width: 'auto',
          margin: '0 auto 1.5rem auto'
        }}>
          Total Votes: {results.total}
        </div>

        {/* Bar chart */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Yes votes bar */}
          <div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '0.75rem'
            }}>
              <span style={{ fontSize: '0.95rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Yes</span>
              <span style={{ fontSize: '0.95rem', fontWeight: '700', color: '#10b981' }}>
                {results.yes} ({yesPercent}%)
              </span>
            </div>
            <div style={{ 
              width: '100%', 
              height: '40px', 
              background: 'var(--border)', 
              overflow: 'hidden',
              position: 'relative',
              border: '1px solid var(--text)'
            }}>
              <div style={{ 
                width: `${yesPercent}%`, 
                height: '100%', 
                background: '#10b981',
                transition: 'width 0.3s ease',
                minWidth: yesPercent > 0 ? '4px' : '0px',
                border: '2px solid #10b981'
              }}></div>
            </div>
          </div>

          {/* No votes bar */}
          <div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '0.75rem'
            }}>
              <span style={{ fontSize: '0.95rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>No</span>
              <span style={{ fontSize: '0.95rem', fontWeight: '700', color: '#ef4444' }}>
                {results.no} ({noPercent}%)
              </span>
            </div>
            <div style={{ 
              width: '100%', 
              height: '40px', 
              background: 'var(--border)', 
              overflow: 'hidden',
              position: 'relative',
              border: '1px solid var(--text)'
            }}>
              <div style={{ 
                width: `${noPercent}%`, 
                height: '100%', 
                background: '#ef4444',
                transition: 'width 0.3s ease',
                minWidth: noPercent > 0 ? '4px' : '0px',
                border: '2px solid #ef4444'
              }}></div>
            </div>
          </div>

          {/* Abstain votes bar */}
          <div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '0.75rem'
            }}>
              <span style={{ fontSize: '0.95rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Abstain</span>
              <span style={{ fontSize: '0.95rem', fontWeight: '700', color: '#6b7280' }}>
                {results.abstain} ({abstainPercent}%)
              </span>
            </div>
            <div style={{ 
              width: '100%', 
              height: '40px', 
              background: 'var(--border)', 
              overflow: 'hidden',
              position: 'relative',
              border: '1px solid var(--text)'
            }}>
              <div style={{ 
                width: `${abstainPercent}%`, 
                height: '100%', 
                background: '#6b7280',
                transition: 'width 0.3s ease',
                minWidth: abstainPercent > 0 ? '4px' : '0px',
                border: '2px solid #6b7280'
              }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Legend component for the right side
  const OpinionLegend = ({ results }: { results: OpinionResults }) => {
    if (results.total === 0) {
      return (
        <div style={{ 
          width: '200px', 
          padding: '1rem',
          background: 'var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--muted)',
          fontSize: '0.95rem'
        }}>
          No votes yet
        </div>
      );
    }

    const yesPercent = Math.round((results.yes / results.total) * 100);
    const noPercent = Math.round((results.no / results.total) * 100);
    const abstainPercent = Math.round((results.abstain / results.total) * 100);

    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        gap: '1rem',
        minWidth: '200px'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.95rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '16px', height: '16px', background: '#10b981' }}></div>
            <span style={{ fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Yes: {results.yes} ({yesPercent}%)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '16px', height: '16px', background: '#ef4444' }}></div>
            <span style={{ fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>No: {results.no} ({noPercent}%)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '16px', height: '16px', background: '#6b7280' }}></div>
            <span style={{ fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Abstain: {results.abstain} ({abstainPercent}%)</span>
          </div>
        </div>
      </div>
    );
  };

  // Access control
  if (loading || !user) {
    return (
      <div className="stack-l" style={{ placeItems: 'center', minHeight: 'calc(100vh - 200px)' }}>
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <div className="title">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user.is_admin) {
    return (
      <div className="stack-l" style={{ placeItems: 'center', minHeight: 'calc(100vh - 200px)' }}>
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <div className="title">Access Denied</div>
          <p style={{ color: 'var(--muted)', marginTop: '1rem' }}>
            This page is only accessible to administrators.
          </p>
          <button 
            className="btn btn-ghost" 
            onClick={() => router.push('/dashboard')}
            style={{ marginTop: '1rem' }}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loadingData) {
    return (
      <div className="stack-l" style={{ placeItems: 'center', minHeight: 'calc(100vh - 200px)' }}>
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <div className="title">Loading Display Data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="stack-l" style={{ placeItems: 'center', minHeight: 'calc(100vh - 200px)' }}>
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <div className="title">Error</div>
          <p style={{ color: 'var(--muted)', marginTop: '1rem' }}>{error}</p>
          <div className="row-m" style={{ marginTop: '1.5rem' }}>
            <button 
              className="btn btn-ghost" 
              onClick={() => router.push('/admin')}
            >
              Back to Admin
            </button>
            <button 
              className="btn btn-primary" 
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentCandidate = candidates[currentCandidateIndex];
  const opinionResults = getOpinionResults(currentCandidate.id);

  return (
    <div className="shell">
      <div className="container">
        <div className="stack-l">
          {/* Header */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div className="title" style={{ marginBottom: '1rem' }}>
              Final Vote Display
            </div>
            <div className="row-m">
              <button 
                className="btn btn-ghost" 
                onClick={() => router.push('/admin')}
              >
                Back to Admin
              </button>
              <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
                {event?.event_name || 'Voting Event'} - Final Phase
              </div>
            </div>
          </div>

          {/* Candidate Display - Redesigned Layout */}
          <div className="card" style={{ padding: '2rem' }}>
            {/* Main content grid */}
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: '1fr 300px',
              gap: '2rem',
              alignItems: 'start'
            }}>
              {/* Left column - Candidate info and bar chart */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Candidate info */}
                <div>
                  <div className="title" style={{ 
                    marginBottom: '1rem', 
                    fontSize: '2rem'
                  }}>
                    {currentCandidate.name}
                  </div>
                  
                  <div className="stack-m">
                    {currentCandidate.major && (
                      <div className="row-m">
                        <span style={{ color: 'var(--muted)', minWidth: '120px' }}>Major:</span>
                        <span>{currentCandidate.major}</span>
                      </div>
                    )}
                    
                    {currentCandidate.grad_year && (
                      <div className="row-m">
                        <span style={{ color: 'var(--muted)', minWidth: '120px' }}>Grad Year:</span>
                        <span>{currentCandidate.grad_year}</span>
                      </div>
                    )}
                    
                    {currentCandidate.gpa && (
                      <div className="row-m">
                        <span style={{ color: 'var(--muted)', minWidth: '120px' }}>GPA:</span>
                        <span>{currentCandidate.gpa}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bar Chart */}
                <div>
                  <div className="title" style={{ 
                    marginBottom: '1rem', 
                    fontSize: '1.5rem',
                    color: 'var(--brand)'
                  }}>
                    Vote Distribution
                  </div>
                  <OpinionBarChart results={opinionResults} />
                </div>
              </div>

              {/* Right column - Image and Legend */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                gap: '1.5rem'
              }}>
                {/* Candidate Image */}
                {currentCandidate.image_url && (
                  <div style={{
                    width: '280px',
                    height: '280px',
                    overflow: 'hidden',
                    border: '3px solid var(--brand)',
                    boxShadow: '0 10px 30px var(--glow)'
                  }}>
                    <img
                      src={currentCandidate.image_url}
                      alt={currentCandidate.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  </div>
                )}

                {/* Opinion Poll Legend */}
                <div style={{ textAlign: 'center', width: '100%' }}>
                  <div className="title" style={{ 
                    marginBottom: '1rem', 
                    fontSize: '1.2rem',
                    color: 'var(--brand)'
                  }}>
                    Opinion Poll Results
                  </div>
                  <OpinionLegend results={opinionResults} />
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginTop: '2rem',
              paddingTop: '2rem',
              borderTop: '2px solid var(--border)'
            }}>
              <button 
                className="btn btn-ghost" 
                onClick={goToPrevious}
                style={{ minWidth: '120px' }}
              >
                ← Previous
              </button>
              
              <div style={{ 
                color: 'var(--muted)', 
                fontSize: '0.9rem',
                textAlign: 'center'
              }}>
                {currentCandidateIndex + 1} of {candidates.length}
              </div>
              
              <button 
                className="btn btn-ghost" 
                onClick={goToNext}
                style={{ minWidth: '120px' }}
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
