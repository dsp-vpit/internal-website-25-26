'use client';

import React, { useEffect, useState } from 'react';
import { useUser } from '../context/UserContext';
import { supabase } from '../../lib/supabaseClient';
import { 
  FaChartBar, 
  FaUsers, 
  FaUserGraduate, 
  FaCheckCircle,
  FaClipboardList
} from 'react-icons/fa';

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

interface AnalyticsData {
  totalCandidates: number;
  totalUniqueVoters: number;
  approvedCount: number;
  candidates: Candidate[];
  voterNames: string[];
}

// Pie Chart Component
const PieChart = ({ data, title, colors }: { 
  data: { label: string; value: number; color: string }[]; 
  title: string;
  colors: string[];
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = 60;
  const centerX = 80;
  const centerY = 80;
  
  let currentAngle = 0;
  const paths: React.ReactElement[] = [];
  
  data.forEach((item, index) => {
    if (item.value === 0) return;
    
    const percentage = item.value / total;
    const angle = percentage * 2 * Math.PI;
    const endAngle = currentAngle + angle;
    
    const x1 = centerX + radius * Math.cos(currentAngle);
    const y1 = centerY + radius * Math.sin(currentAngle);
    const x2 = centerX + radius * Math.cos(endAngle);
    const y2 = centerY + radius * Math.sin(endAngle);
    
    const largeArcFlag = angle > Math.PI ? 1 : 0;
    
    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');
    
    paths.push(
      <path
        key={index}
        d={pathData}
        fill={colors[index % colors.length]}
        stroke="var(--bg)"
        strokeWidth="2"
      />
    );
    
    currentAngle = endAngle;
  });
  
  return (
    <div style={{ textAlign: 'center' }}>
      <div className="title" style={{ fontSize: '1rem', marginBottom: '1rem' }}>{title}</div>
      <svg width="160" height="160" style={{ margin: '0 auto' }}>
        {paths}
        <circle cx={centerX} cy={centerY} r={radius} fill="none" stroke="var(--border)" strokeWidth="2" />
      </svg>
      <div className="stack-m" style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
        {data.map((item, index) => (
          <div key={index} className="row-m" style={{ justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ 
              width: '12px', 
              height: '12px', 
              backgroundColor: colors[index % colors.length], 
              marginRight: '0.5rem',
              borderRadius: '2px'
            }} />
            <span>{item.label}: {item.value} ({Math.round((item.value / total) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Progress Bar Component
const ProgressBar = ({ value, max, label, color = 'var(--brand)' }: {
  value: number;
  max: number;
  label: string;
  color?: string;
}) => {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  
  return (
    <div style={{ marginBottom: '1rem' }}>
      <div className="row-m" style={{ justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.9rem' }}>{label}</span>
        <span className="mono" style={{ fontSize: '0.9rem' }}>{value}/{max} ({Math.round(percentage)}%)</span>
      </div>
      <div style={{ 
        width: '100%', 
        height: '8px', 
        backgroundColor: 'var(--bg-elev)', 
        borderRadius: '4px',
        overflow: 'hidden'
      }}>
        <div style={{ 
          width: `${percentage}%`, 
          height: '100%', 
          backgroundColor: color,
          transition: 'width 0.3s ease'
        }} />
      </div>
    </div>
  );
};

export default function ResultsPage() {
  const { user, loading } = useUser();
  const [event, setEvent] = useState<EventData | null>(null);
  const [results, setResults] = useState<VoteResult[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
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

        // Calculate analytics
        const uniqueVoters = new Set(votes?.map(vote => vote.user_id) || []).size;
        const approvedCount = calculatedResults.filter(r => r.approved).length;

        // Get voter names from profiles
        const voterIds = Array.from(new Set(votes?.map(vote => vote.user_id) || []));
        let voterNames: string[] = [];
        
        if (voterIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('email, name')
            .in('id', voterIds);
          
          if (!profilesError && profiles) {
            voterNames = profiles.map(profile => 
              profile.name || profile.email
            );
          }
        }

        setAnalytics({
          totalCandidates: candidates.length,
          totalUniqueVoters: uniqueVoters,
          approvedCount,
          candidates: candidates,
          voterNames: voterNames
        });

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

  if (!event || results.length === 0 || !analytics) {
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
          <span className="mono">Candidates: {analytics.totalCandidates}</span>
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

      {/* Analytics Dashboard */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div className="title" style={{ marginBottom: '1.5rem' }}>
          <FaChartBar style={{ marginRight: '0.5rem' }} />
          Analytics Dashboard
        </div>
        
                {/* Key Metrics */}
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
              {analytics.totalUniqueVoters}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--muted)', marginBottom: '1rem' }}>
              Unique Voters
            </div>
            <details style={{ textAlign: 'left' }}>
              <summary style={{ cursor: 'pointer', color: 'var(--brand)', fontSize: '0.9rem' }}>
                View Voters
              </summary>
              <div className="stack-m" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                {analytics.voterNames.map((name, index) => (
                  <div key={index} style={{ 
                    padding: '0.5rem', 
                    background: 'var(--bg)', 
                    borderRadius: '4px',
                    border: '1px solid var(--border)'
                  }}>
                    {name}
                  </div>
                ))}
              </div>
            </details>
          </div>
          
          {event.type === 'new_member' && (
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
      </div>

      {/* Detailed Results */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div className="title" style={{ marginBottom: '1.5rem' }}>
          <FaClipboardList style={{ marginRight: '0.5rem' }} />
          Detailed Results
        </div>
        <div className="stack-m">
          {sortedResults.map((result, index) => (
            <div key={result.candidate_id} className="card" style={{ padding: '1.5rem', background: 'var(--bg-elev)' }}>
              <div className="row-m" style={{ alignItems: 'center', marginBottom: '1rem' }}>
                <div className="title" style={{ fontSize: '1.25rem' }}>
                  #{index + 1} - {result.candidate_name}
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
                {result.candidate_major && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>Major</div>
                    <div style={{ fontWeight: '600' }}>{result.candidate_major}</div>
                  </div>
                )}
                {result.candidate_grad_year && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>Grad Year</div>
                    <div style={{ fontWeight: '600' }}>{result.candidate_grad_year}</div>
                  </div>
                )}
                {result.candidate_gpa && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>GPA</div>
                    <div style={{ fontWeight: '600' }}>{result.candidate_gpa}</div>
                  </div>
                )}
                {result.candidate_position && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>Position</div>
                    <div style={{ fontWeight: '600' }}>{result.candidate_position}</div>
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
                    <ProgressBar 
                      value={result.opinion_yes} 
                      max={result.opinion_total} 
                      label="Yes Votes" 
                      color="#10b981"
                    />
                    <ProgressBar 
                      value={result.opinion_no} 
                      max={result.opinion_total} 
                      label="No Votes" 
                      color="#ef4444"
                    />
                    <ProgressBar 
                      value={result.opinion_abstain} 
                      max={result.opinion_total} 
                      label="Abstain" 
                      color="#6b7280"
                    />
                  </div>
                  <div style={{ 
                    textAlign: 'center', 
                    marginTop: '1rem',
                    padding: '0.5rem',
                    background: 'var(--bg)',
                    borderRadius: '4px',
                    border: '1px solid var(--border)'
                  }}>
                    <span className="mono">Total: {result.opinion_total} votes</span>
                  </div>
                </div>

                {/* Final Vote */}
                {event.phase === 'final' && (
                  <div style={{ flex: 1, minWidth: '250px' }}>
                    <div className="title" style={{ fontSize: '1rem', marginBottom: '1rem' }}>
                      Final Vote Results
                    </div>
                    <div className="stack-m">
                      <ProgressBar 
                        value={result.final_yes} 
                        max={result.final_total} 
                        label="Yes Votes" 
                        color="#10b981"
                      />
                      <ProgressBar 
                        value={result.final_no} 
                        max={result.final_total} 
                        label="No Votes" 
                        color="#ef4444"
                      />
                    </div>
                    <div style={{ 
                      textAlign: 'center', 
                      marginTop: '1rem',
                      padding: '0.5rem',
                      background: 'var(--bg)',
                      borderRadius: '4px',
                      border: '1px solid var(--border)'
                    }}>
                      <span className="mono">Total: {result.final_total} votes</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
