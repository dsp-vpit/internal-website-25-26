'use client';

import { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { supabase } from '../../lib/supabaseClient';
import { FaChartBar, FaUsers, FaCheckCircle, FaTimesCircle, FaMinusCircle } from 'react-icons/fa';

interface Candidate {
  id: string;
  name: string;
  major?: string;
  grad_year?: string;
  gpa?: string;
  position?: string;
  order_index: number;
}

interface EventData {
  id: string;
  type: 'member' | 'exec';
  event_name?: string;
  date: string;
  phase: 'opinion' | 'final';
  approval_threshold: number;
}

interface Vote {
  id: string;
  user_id: string;
  candidate_id: string;
  type: 'opinion' | 'final';
  vote_value: 'yes' | 'no' | 'abstain';
}

interface Result {
  candidate_id: string;
  candidate_name: string;
  opinion_yes: number;
  opinion_no: number;
  opinion_abstain: number;
  opinion_total: number;
  final_yes: number;
  final_no: number;
  final_total: number;
  approved: boolean;
}

interface AnalyticsData {
  totalCandidates: number;
  totalVoters: number;
  approvedCount: number;
  candidates: Candidate[];
  voterNames: string[];
  voterDetails: {
    id: string;
    name: string;
    votes: {
      candidate_id: string;
      candidate_name: string;
      vote_value: 'yes' | 'no' | null;
    }[];
  }[];
}

export default function ResultsPage() {
  const { user } = useUser();
  const [event, setEvent] = useState<EventData | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [approvalThreshold, setApprovalThreshold] = useState(85);
  const [updatingThreshold, setUpdatingThreshold] = useState(false);
  const [thresholdInput, setThresholdInput] = useState('85');
  const [calculatedResults, setCalculatedResults] = useState<Result[]>([]);

  // Helper function to format date without timezone issues
  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString();
  };

  // Fetch current event and results
  useEffect(() => {
    if (!user) return;

    const fetchResults = async () => {
      setLoading(true);
      try {
        // Get current active event
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('*')
          .eq('is_ended', false)
          .single();

        if (eventError || !eventData) {
          console.log('No active event found');
          setLoading(false);
          return;
        }

        setEvent(eventData);
        const threshold = eventData.approval_threshold || 85;
        setApprovalThreshold(threshold);
        setThresholdInput(threshold.toString());

        // Fetch all candidates for this event
        const { data: candidates, error: candidatesError } = await supabase
          .from('candidates')
          .select('*')
          .eq('event_id', eventData.id)
          .order('order_index', { ascending: true });

        if (candidatesError) {
          console.error('Error fetching candidates:', candidatesError);
          setLoading(false);
          return;
        }

        // Fetch all votes for this event
        const { data: votes, error: votesError } = await supabase
          .from('votes')
          .select('*')
          .eq('event_id', eventData.id);

        if (votesError) {
          console.error('Error fetching votes:', votesError);
          setLoading(false);
          return;
        }

        // Calculate results for each candidate
        const calculatedResults: Result[] = candidates.map(candidate => {
          const candidateVotes = votes?.filter(vote => vote.candidate_id === candidate.id) || [];
          
          const opinionVotes = candidateVotes.filter(vote => vote.type === 'opinion');
          const finalVotes = candidateVotes.filter(vote => vote.type === 'final');

          const opinionYes = opinionVotes.filter(vote => vote.vote_value === 'yes').length;
          const opinionNo = opinionVotes.filter(vote => vote.vote_value === 'no').length;
          const opinionAbstain = opinionVotes.filter(vote => vote.vote_value === 'abstain').length;
          const opinionTotal = opinionVotes.length;

          const finalYes = finalVotes.filter(vote => vote.vote_value === 'yes').length;
          const finalNo = finalVotes.filter(vote => vote.vote_value === 'no').length;
          const finalTotal = finalVotes.length;

          const finalYesPercent = finalTotal > 0 ? (finalYes / finalTotal) * 100 : 0;

          // Determine if approved (for new member events)
          const approved = eventData.type === 'member' && finalYesPercent >= approvalThreshold;

          return {
            candidate_id: candidate.id,
            candidate_name: candidate.name,
            opinion_yes: opinionYes,
            opinion_no: opinionNo,
            opinion_abstain: opinionAbstain,
            opinion_total: opinionTotal,
            final_yes: finalYes,
            final_no: finalNo,
            final_total: finalTotal,
            approved
          };
        });

        setCalculatedResults(calculatedResults);
        const approvedCount = calculatedResults.filter(r => r.approved).length;

        // Get voter details from profiles
        const voterIds = Array.from(new Set(votes?.map(vote => vote.user_id) || []));
        let voterNames: string[] = [];
        let voterDetails: AnalyticsData['voterDetails'] = [];
        
        if (voterIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, email, name')
            .in('id', voterIds);
          
          if (profilesError) {
            console.error('Error fetching profiles:', profilesError);
          } else {
            voterNames = profiles.map(profile => 
              profile.name || profile.email
            );
            
            // Create voter details with their final votes
            voterDetails = profiles.map(profile => {
              const voterVotes = votes?.filter(vote => vote.user_id === profile.id && vote.type === 'final') || [];
              const voteDetails = candidates.map(candidate => {
                const vote = voterVotes.find(v => v.candidate_id === candidate.id);
                return {
                  candidate_id: candidate.id,
                  candidate_name: candidate.name,
                  vote_value: vote ? (vote.vote_value as 'yes' | 'no') : null
                };
              });
              
              return {
                id: profile.id,
                name: profile.name || profile.email,
                votes: voteDetails
              };
            });
          }
        }

        setAnalytics({
          totalCandidates: candidates.length,
          totalVoters: voterNames.length,
          approvedCount,
          candidates: candidates,
          voterNames: voterNames,
          voterDetails: voterDetails
        });

      } catch (error) {
        console.error('Error fetching results:', error);
      } finally {
        setLoading(false);
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
        alert('Failed to update approval threshold');
      } else {
        setApprovalThreshold(newThreshold);
        setThresholdInput(newThreshold.toString());
      }
    } catch (error) {
      console.error('Error updating threshold:', error);
      alert('Failed to update approval threshold');
    } finally {
      setUpdatingThreshold(false);
    }
  };

  if (!user) {
    return (
      <div className="stack-l" style={{ placeItems: 'center', minHeight: 'calc(100vh - 200px)' }}>
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <div className="title">Please log in to view results</div>
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
            Only administrators can view voting results.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="stack-l" style={{ placeItems: 'center', minHeight: 'calc(100vh - 200px)' }}>
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <div className="title">Loading results...</div>
        </div>
      </div>
    );
  }

  if (!event || !analytics) {
    return (
      <div className="stack-l" style={{ placeItems: 'center', minHeight: 'calc(100vh - 200px)' }}>
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <div className="title">No Active Event</div>
          <p style={{ color: 'var(--muted)', marginTop: '1rem' }}>
            There is currently no active voting event to display results for.
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
          {event.event_name || (event.type === 'member' ? 'New Member Voting Results' : 'Executive Committee Results')}
        </div>
        <div className="row-m" style={{ color: 'var(--muted)' }}>
          <span className="mono">Date: {formatDate(event.date)}</span>
          <span className="mono">Phase: {event.phase === 'opinion' ? 'Opinion Poll' : 'Final Vote'}</span>
          <span className="mono">Candidates: {analytics.totalCandidates}</span>
        </div>
        {user.is_admin && event.type === 'member' && (
          <div className="row-m" style={{ marginTop: '1rem', alignItems: 'center', gap: '0.5rem' }}>
            <span>Approval Threshold:</span>
            <input
              type="number"
              min="0"
              max="100"
              value={thresholdInput}
              onChange={(e) => {
                setThresholdInput(e.target.value);
              }}
              onBlur={(e) => {
                const value = e.target.value;
                if (value === '') {
                  setThresholdInput('85');
                  updateApprovalThreshold(85);
                  return;
                }
                const numValue = parseInt(value);
                if (isNaN(numValue)) {
                  setThresholdInput('85');
                  updateApprovalThreshold(85);
                } else if (numValue < 0) {
                  setThresholdInput('0');
                  updateApprovalThreshold(0);
                } else if (numValue > 100) {
                  setThresholdInput('100');
                  updateApprovalThreshold(100);
                } else {
                  updateApprovalThreshold(numValue);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              disabled={updatingThreshold}
              style={{ 
                width: '80px',
                textAlign: 'center',
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text)'
              }}
            />
            <span className="mono">%</span>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="row-m" style={{ gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ 
          padding: '1.5rem', 
          background: 'var(--bg-elev)',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          minWidth: '250px',
          flex: 1
        }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--brand)' }}>
            {analytics.totalCandidates}
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--muted)', marginBottom: '1rem' }}>
            Total Candidates
          </div>
          <details style={{ textAlign: 'left' }}>
            <summary style={{ cursor: 'pointer', color: 'var(--brand)', fontSize: '0.9rem' }}>
              View Candidates
            </summary>
            <div className="stack-m" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
              {analytics.candidates.map((candidate, index) => (
                <div key={candidate.id} style={{ 
                  padding: '0.5rem', 
                  background: 'var(--bg)', 
                  borderRadius: '4px',
                  border: '1px solid var(--border)'
                }}>
                  <div style={{ fontWeight: '600' }}>#{index + 1} {candidate.name}</div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
                    {candidate.major} • {candidate.grad_year} • GPA: {candidate.gpa}
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
        
        <div style={{ 
          padding: '1.5rem', 
          background: 'var(--bg-elev)',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          minWidth: '250px',
          flex: 1
        }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--brand)' }}>
            {analytics.totalVoters}
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--muted)', marginBottom: '1rem' }}>
            Unique Voters
          </div>
          <details style={{ textAlign: 'left' }}>
            <summary style={{ cursor: 'pointer', color: 'var(--brand)', fontSize: '0.9rem' }}>
              View Voters
            </summary>
            <div className="stack-m" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
              {analytics.voterDetails.map((voter, index) => (
                <div key={voter.id} style={{ 
                  padding: '0.5rem', 
                  background: 'var(--bg)', 
                  borderRadius: '4px',
                  border: '1px solid var(--border)'
                }}>
                  <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                    {voter.name}
                  </div>
                  <details style={{ fontSize: '0.8rem' }}>
                    <summary style={{ cursor: 'pointer', color: 'var(--brand)' }}>
                      View Final Votes
                    </summary>
                    <div className="stack-s" style={{ marginTop: '0.25rem' }}>
                      {voter.votes.map((vote, voteIndex) => (
                        <div key={voteIndex} style={{ 
                          padding: '0.25rem 0.5rem',
                          background: 'var(--bg-elev)',
                          borderRadius: '3px',
                          border: '1px solid var(--border)'
                        }}>
                          <span style={{ fontWeight: '500' }}>{vote.candidate_name}:</span>
                          <span style={{ 
                            marginLeft: '0.5rem',
                            color: vote.vote_value === 'yes' ? 'var(--success)' : 
                                   vote.vote_value === 'no' ? 'var(--danger)' : 'var(--muted)'
                          }}>
                            {vote.vote_value === 'yes' ? '✓ Yes' : 
                             vote.vote_value === 'no' ? '✗ No' : '— No Vote'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              ))}
            </div>
          </details>
        </div>
        
        {event.type === 'member' && (
          <div style={{ 
            padding: '1.5rem', 
            background: 'var(--bg-elev)',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            minWidth: '180px',
            textAlign: 'center',
            flex: 1
          }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--brand)' }}>
              {analytics.approvedCount}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
              Approved
            </div>
          </div>
        )}
      </div>

      {/* Detailed Results */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div className="title" style={{ marginBottom: '1.5rem' }}>
          Detailed Results
        </div>
        
        <div className="stack-m">
          {analytics.candidates.map((candidate, index) => {
            // Get the calculated results for this candidate
            const result = calculatedResults.find((r: Result) => r.candidate_id === candidate.id);
            if (!result) return null;

            return (
              <div key={candidate.id} className="card" style={{ padding: '1.5rem', background: 'var(--bg-elev)' }}>
                <div className="row-m" style={{ alignItems: 'center', marginBottom: '1rem' }}>
                  <div className="title" style={{ fontSize: '1.25rem' }}>
                    #{index + 1} - {candidate.name}
                  </div>
                  {result.approved && (
                    <span style={{ 
                      color: 'var(--brand)', 
                      fontWeight: 'bold',
                      padding: '0.25rem 0.75rem',
                      border: '2px solid var(--brand)',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      background: 'rgba(139,92,246,0.1)'
                    }}>
                      ✓ APPROVED
                    </span>
                  )}
                </div>

                {/* Candidate Info */}
                <div className="row-m" style={{ gap: '2rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                  {candidate.major && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>Major</div>
                      <div style={{ fontWeight: '600' }}>{candidate.major}</div>
                    </div>
                  )}
                  {candidate.grad_year && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>Grad Year</div>
                      <div style={{ fontWeight: '600' }}>{candidate.grad_year}</div>
                    </div>
                  )}
                  {candidate.gpa && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>GPA</div>
                      <div style={{ fontWeight: '600' }}>{candidate.gpa}</div>
                    </div>
                  )}
                  {candidate.position && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>Position</div>
                      <div style={{ fontWeight: '600' }}>{candidate.position}</div>
                    </div>
                  )}
                </div>

                {/* Vote Results */}
                <div className="row-m" style={{ gap: '2rem', flexWrap: 'wrap' }}>
                  {/* Opinion Poll */}
                  <div style={{ flex: 1, minWidth: '250px' }}>
                    <div className="title" style={{ fontSize: '1rem', marginBottom: '1rem' }}>
                      Opinion Poll Results
                    </div>
                    <div className="stack-m">
                      <div style={{ 
                        textAlign: 'center', 
                        marginBottom: '1rem',
                        padding: '0.5rem',
                        background: 'var(--bg)',
                        borderRadius: '4px',
                        border: '1px solid var(--border)'
                      }}>
                        <span className="mono">Total: {result.opinion_total} votes</span>
                      </div>
                      
                      {/* Vote Counts with Progress Bars */}
                      <div className="stack-s">
                        {/* Yes Votes */}
                        <div className="row-m" style={{ alignItems: 'center', gap: '1rem' }}>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.5rem',
                            minWidth: '120px',
                            color: 'var(--success)'
                          }}>
                            <FaCheckCircle />
                            <span>Yes: {result.opinion_yes}</span>
                          </div>
                          <div style={{ 
                            flex: 1, 
                            height: '8px', 
                            backgroundColor: 'var(--bg-elev)', 
                            borderRadius: '4px',
                            overflow: 'hidden'
                          }}>
                            <div style={{ 
                              width: `${result.opinion_total > 0 ? (result.opinion_yes / result.opinion_total) * 100 : 0}%`, 
                              height: '100%', 
                              backgroundColor: '#10b981',
                              transition: 'width 0.3s ease'
                            }} />
                          </div>
                          <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--muted)', minWidth: '40px' }}>
                            {result.opinion_total > 0 ? Math.round((result.opinion_yes / result.opinion_total) * 100) : 0}%
                          </span>
                        </div>

                        {/* No Votes */}
                        <div className="row-m" style={{ alignItems: 'center', gap: '1rem' }}>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.5rem',
                            minWidth: '120px',
                            color: 'var(--danger)'
                          }}>
                            <FaTimesCircle />
                            <span>No: {result.opinion_no}</span>
                          </div>
                          <div style={{ 
                            flex: 1, 
                            height: '8px', 
                            backgroundColor: 'var(--bg-elev)', 
                            borderRadius: '4px',
                            overflow: 'hidden'
                          }}>
                            <div style={{ 
                              width: `${result.opinion_total > 0 ? (result.opinion_no / result.opinion_total) * 100 : 0}%`, 
                              height: '100%', 
                              backgroundColor: '#ef4444',
                              transition: 'width 0.3s ease'
                            }} />
                          </div>
                          <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--muted)', minWidth: '40px' }}>
                            {result.opinion_total > 0 ? Math.round((result.opinion_no / result.opinion_total) * 100) : 0}%
                          </span>
                        </div>

                        {/* Abstain Votes */}
                        <div className="row-m" style={{ alignItems: 'center', gap: '1rem' }}>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.5rem',
                            minWidth: '120px',
                            color: 'var(--muted)'
                          }}>
                            <FaMinusCircle />
                            <span>Abstain: {result.opinion_abstain}</span>
                          </div>
                          <div style={{ 
                            flex: 1, 
                            height: '8px', 
                            backgroundColor: 'var(--bg-elev)', 
                            borderRadius: '4px',
                            overflow: 'hidden'
                          }}>
                            <div style={{ 
                              width: `${result.opinion_total > 0 ? (result.opinion_abstain / result.opinion_total) * 100 : 0}%`, 
                              height: '100%', 
                              backgroundColor: '#6b7280',
                              transition: 'width 0.3s ease'
                            }} />
                          </div>
                          <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--muted)', minWidth: '40px' }}>
                            {result.opinion_total > 0 ? Math.round((result.opinion_abstain / result.opinion_total) * 100) : 0}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Final Vote */}
                  {event.phase === 'final' && (
                    <div style={{ flex: 1, minWidth: '250px' }}>
                      <div className="title" style={{ fontSize: '1rem', marginBottom: '1rem' }}>
                        Final Vote Results
                      </div>
                      <div className="stack-m">
                        <div style={{ 
                          textAlign: 'center', 
                          marginBottom: '1rem',
                          padding: '0.5rem',
                          background: 'var(--bg)',
                          borderRadius: '4px',
                          border: '1px solid var(--border)'
                        }}>
                          <span className="mono">Total: {result.final_total} votes</span>
                        </div>
                        
                        {/* Vote Counts with Progress Bars */}
                        <div className="stack-s">
                          {/* Yes Votes */}
                          <div className="row-m" style={{ alignItems: 'center', gap: '1rem' }}>
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '0.5rem',
                              minWidth: '120px',
                              color: 'var(--success)'
                            }}>
                              <FaCheckCircle />
                              <span>Yes: {result.final_yes}</span>
                            </div>
                            <div style={{ 
                              flex: 1, 
                              height: '8px', 
                              backgroundColor: 'var(--bg-elev)', 
                              borderRadius: '4px',
                              overflow: 'hidden'
                            }}>
                                                          <div style={{ 
                              width: `${result.final_total > 0 ? (result.final_yes / result.final_total) * 100 : 0}%`, 
                              height: '100%', 
                              backgroundColor: '#10b981',
                              transition: 'width 0.3s ease'
                            }} />
                            </div>
                            <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--muted)', minWidth: '40px' }}>
                              {result.final_total > 0 ? Math.round((result.final_yes / result.final_total) * 100) : 0}%
                            </span>
                          </div>

                          {/* No Votes */}
                          <div className="row-m" style={{ alignItems: 'center', gap: '1rem' }}>
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '0.5rem',
                              minWidth: '120px',
                              color: 'var(--danger)'
                            }}>
                              <FaTimesCircle />
                              <span>No: {result.final_no}</span>
                            </div>
                            <div style={{ 
                              flex: 1, 
                              height: '8px', 
                              backgroundColor: 'var(--bg-elev)', 
                              borderRadius: '4px',
                              overflow: 'hidden'
                            }}>
                                                          <div style={{ 
                              width: `${result.final_total > 0 ? (result.final_no / result.final_total) * 100 : 0}%`, 
                              height: '100%', 
                              backgroundColor: '#ef4444',
                              transition: 'width 0.3s ease'
                            }} />
                            </div>
                            <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--muted)', minWidth: '40px' }}>
                              {result.final_total > 0 ? Math.round((result.final_no / result.final_total) * 100) : 0}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Voter Breakdown */}
                {event.phase === 'final' && (
                  <div className="stack-m" style={{ marginTop: '1rem', gap: '0.5rem' }}>
                    {/* Yes Voters */}
                    <details style={{ fontSize: '0.85rem' }}>
                      <summary style={{ 
                        cursor: 'pointer', 
                        color: 'var(--success)',
                        fontWeight: '600'
                      }}>
                        Yes Votes ({result.final_yes})
                      </summary>
                      <div className="stack-s" style={{ marginTop: '0.5rem' }}>
                        {analytics.voterDetails
                          .filter(voter => 
                            voter.votes.find(v => 
                              v.candidate_id === result.candidate_id && v.vote_value === 'yes'
                            )
                          )
                          .map(voter => (
                            <div key={voter.id} style={{ 
                              padding: '0.25rem 0.5rem',
                              background: 'var(--bg-elev)',
                              borderRadius: '3px',
                              border: '1px solid var(--border)'
                            }}>
                              {voter.name}
                            </div>
                          ))}
                      </div>
                    </details>
                    
                    {/* No Voters */}
                    <details style={{ fontSize: '0.85rem' }}>
                      <summary style={{ 
                        cursor: 'pointer', 
                        color: 'var(--danger)',
                        fontWeight: '600'
                      }}>
                        No Votes ({result.final_no})
                      </summary>
                      <div className="stack-s" style={{ marginTop: '0.5rem' }}>
                        {analytics.voterDetails
                          .filter(voter => 
                            voter.votes.find(v => 
                              v.candidate_id === result.candidate_id && v.vote_value === 'no'
                            )
                          )
                          .map(voter => (
                            <div key={voter.id} style={{ 
                              padding: '0.25rem 0.5rem',
                              background: 'var(--bg-elev)',
                              borderRadius: '3px',
                              border: '1px solid var(--border)'
                            }}>
                              {voter.name}
                            </div>
                          ))}
                      </div>
                    </details>
                  </div>
                )}

                {event.type === 'member' && result.final_total > 0 && (
                  <div style={{ 
                    textAlign: 'center', 
                    marginTop: '1rem',
                    padding: '0.5rem',
                    background: result.approved ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    borderRadius: '4px',
                    border: `1px solid ${result.approved ? 'var(--success)' : 'var(--danger)'}`
                  }}>
                    <div style={{ 
                      color: result.approved ? 'var(--success)' : 'var(--danger)',
                      fontWeight: '600',
                      fontSize: '1.1rem'
                    }}>
                      {result.approved ? '✓ APPROVED' : '✗ NOT APPROVED'}
                    </div>
                    <div style={{ 
                      color: result.approved ? 'var(--success)' : 'var(--danger)',
                      fontSize: '0.9rem',
                      marginTop: '0.25rem'
                    }}>
                      {result.final_yes} out of {result.final_total} votes ({((result.final_yes / result.final_total) * 100).toFixed(1)}%)
                      {result.approved ? ' - Meets' : ' - Below'} {approvalThreshold}% threshold
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
