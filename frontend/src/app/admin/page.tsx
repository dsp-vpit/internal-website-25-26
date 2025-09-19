'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '../context/UserContext';
import { supabase } from '../../lib/supabaseClient';

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

interface Candidate {
  id: string;
  name: string;
  major?: string;
  grad_year?: string;
  gpa?: string;
  classification?: string;
  position?: string;
  event_id: string;
}

interface Event {
  id: string;
  type: string;
  event_name?: string;
  date: string;
  phase: 'opinion' | 'final';
  current_candidate_index: number;
  is_ended: boolean;
  approval_threshold: number;
}

export default function AdminPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);

  // Helper function to format date without timezone issues
  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString();
  };

  // Function to clean up multiple non-ended events
  const cleanupMultipleEvents = async () => {
    try {
      // Get all non-ended events
      const { data: events, error } = await supabase
        .from('events')
        .select('*')
        .eq('is_ended', false)
        .order('created_at', { ascending: false });
      
      if (error || !events || events.length <= 1) return;
      
      // Keep only the most recent event, end all others
      const eventsToEnd = events.slice(1);
      const eventIdsToEnd = eventsToEnd.map(e => e.id);
      
      const { error: endError } = await supabase
        .from('events')
        .update({ is_ended: true })
        .in('id', eventIdsToEnd);
      
      if (endError) {
        console.warn('Warning: Could not end old events:', endError);
      } else {
        console.log(`Ended ${eventsToEnd.length} old events, keeping the most recent one.`);
      }
    } catch (error) {
      console.error('Error cleaning up multiple events:', error);
    }
  };

  // Event/Candidate upload state
  const [jsonInput, setJsonInput] = useState('');
  const [parsedData, setParsedData] = useState<any>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  const [eventName, setEventName] = useState('');

  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [currentCandidate, setCurrentCandidate] = useState<Candidate | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [advancing, setAdvancing] = useState(false);

  const [togglingPhase, setTogglingPhase] = useState(false);
  const [endingEvent, setEndingEvent] = useState(false);
  const [pastEvents, setPastEvents] = useState<Event[]>([]);
  
  // Past events detailed view
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [eventResults, setEventResults] = useState<{[key: string]: any}>({});
  const [loadingResults, setLoadingResults] = useState<string | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<string | null>(null);

  // User management state
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loadingAllUsers, setLoadingAllUsers] = useState(false);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [userManagementExpanded, setUserManagementExpanded] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !user.is_admin)) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  // Clean up multiple events on component load
  useEffect(() => {
    if (user && user.is_admin) {
      cleanupMultipleEvents();
    }
  }, [user]);

  useEffect(() => {
    const fetchPendingUsers = async () => {
      setLoadingUsers(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, name, is_approved')
        .eq('is_approved', false);
      if (!error && data) setPendingUsers(data);
      setLoadingUsers(false);
    };
    if (user && user.is_admin) fetchPendingUsers();
  }, [user]);

  // Fetch all users for management
  useEffect(() => {
    const fetchAllUsers = async () => {
      setLoadingAllUsers(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, name, is_approved, can_vote, is_admin, created_at')
        .order('created_at', { ascending: false });
      if (!error && data) setAllUsers(data);
      setLoadingAllUsers(false);
    };
    if (user && user.is_admin) fetchAllUsers();
  }, [user]);

  const approveUser = async (id: string) => {
    setApproving(id);
    await supabase.from('profiles').update({ 
      is_approved: true,
      can_vote: true 
    }).eq('id', id);
    setPendingUsers(pendingUsers.filter(u => u.id !== id));
    setApproving(null);
  };

  // User management functions
  const updateUserStatus = async (userId: string, field: 'is_approved' | 'can_vote', value: boolean) => {
    setUpdatingUser(userId);
    try {
      let updateData: any = { [field]: value };
      
      // If removing approval status, also remove voting privileges
      if (field === 'is_approved' && !value) {
        updateData.can_vote = false;
      }
      
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (error) {
        console.error('Error updating user:', error);
        alert('Failed to update user status');
      } else {
        // Update local state
        setAllUsers(prevUsers => 
          prevUsers.map(user => 
            user.id === userId ? { ...user, ...updateData } : user
          )
        );
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('An unexpected error occurred');
    } finally {
      setUpdatingUser(null);
    }
  };

  const deleteUser = async (userId: string, userEmail: string) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the user "${userEmail}"?\n\n` +
      'This will permanently remove:\n' +
      '• User profile\n' +
      '• All their votes\n' +
      '• Account access\n\n' +
      'This action cannot be undone.'
    );

    if (!confirmDelete) return;

    setDeletingUser(userId);
    try {
      // Delete user's votes first (foreign key constraint)
      const { error: votesError } = await supabase
        .from('votes')
        .delete()
        .eq('user_id', userId);

      if (votesError) throw votesError;

      // Delete user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (profileError) throw profileError;

      // Update local state
      setAllUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
      setPendingUsers(prevUsers => prevUsers.filter(user => user.id !== userId));

      alert('User deleted successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    } finally {
      setDeletingUser(null);
    }
  };

  // Parse JSON input
  const handleParseJson = () => {
    setParseError(null);
    setParsedData(null);
    setUploadResult(null);
    try {
      const data = JSON.parse(jsonInput);
      setParsedData(data);
    } catch (e: any) {
      setParseError('Invalid JSON: ' + e.message);
    }
  };

  // Upload event and candidates
  const handleUpload = async () => {
    if (!parsedData) return;
    setUploading(true);
    setUploadResult(null);
    try {
      // First, end any existing non-ended events
      const { error: endError } = await supabase
        .from('events')
        .update({ is_ended: true })
        .eq('is_ended', false);
      
      if (endError) {
        console.warn('Warning: Could not end existing events:', endError);
      }

      // Insert new event
      const eventRes = await supabase.from('events').insert({
        type: parsedData.type,
        event_name: eventName.trim(),
        date: parsedData.date,
        phase: 'opinion', // Always start with opinion poll
        current_candidate_index: 0,
        is_ended: false,
        approval_threshold: 85
      }).select().single();
      if (eventRes.error) throw eventRes.error;
      const eventId = eventRes.data.id;
      
      // Insert candidates with order_index
      if (parsedData.type === 'member') {
        const candidates = parsedData.candidates.map((c: any, index: number) => ({ 
          name: c.name,
          major: c.major,
          grad_year: c.grad_year,
          gpa: c.gpa,
          classification: c.classification,
          image_url: c.image_url || null,
          resume_url: c.resume_url || null,
          event_id: eventId,
          order_index: index
        }));
        const candRes = await supabase.from('candidates').insert(candidates);
        if (candRes.error) throw candRes.error;
      } else if (parsedData.type === 'exec') {
        let allCandidates: any[] = [];
        let orderIndex = 0;
        parsedData.positions.forEach((pos: any) => {
          pos.candidates.forEach((c: any) => {
            allCandidates.push({ 
              name: c.name, 
              position: pos.name,
              classification: c.classification,
              image_url: c.image_url || null,
              resume_url: c.resume_url || null,
              event_id: eventId,
              order_index: orderIndex++
            });
          });
        });
        const candRes = await supabase.from('candidates').insert(allCandidates);
        if (candRes.error) throw candRes.error;
      }
      
      setUploadResult('Event and candidates uploaded successfully! Previous events have been automatically ended.');
      setParsedData(null);
      setJsonInput('');
      setEventName('');
    } catch (e: any) {
      setUploadResult('Upload failed: ' + (e.message || e.toString()));
    }
    setUploading(false);
  };

  // Fetch current event and candidates
  useEffect(() => {
    const fetchEventAndCandidates = async () => {
      // Get the most recent non-ended event
      const { data: eventsData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('is_ended', false)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (!eventError && eventsData && eventsData.length > 0) {
        const eventData = eventsData[0];
        setCurrentEvent(eventData);
        const { data: candData, error: candError } = await supabase
          .from('candidates')
          .select('*')
          .eq('event_id', eventData.id)
          .order('order_index', { ascending: true });
        if (!candError && candData) {
          setCandidates(candData);
          setCurrentCandidate(candData[eventData.current_candidate_index] || null);
        }
      } else {
        // No active event found
        setCurrentEvent(null);
        setCandidates([]);
        setCurrentCandidate(null);
      }
    };
    fetchEventAndCandidates();
  }, [uploadResult]); // refetch after upload

  // Fetch past events
  useEffect(() => {
    const fetchPastEvents = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('is_ended', true)
        .order('date', { ascending: false });
      if (!error && data) {
        setPastEvents(data);
      }
    };
    if (user && user.is_admin) fetchPastEvents();
  }, [user, currentEvent?.is_ended]); // refetch when current event status changes

  // Advance to next candidate
  const handleNextCandidate = async () => {
    if (!currentEvent || !candidates.length) return;
    setAdvancing(true);
    const nextIndex = currentEvent.current_candidate_index + 1;
    if (nextIndex >= candidates.length) {
      setAdvancing(false);
      alert('No more candidates.');
      return;
    }
    const { error } = await supabase
      .from('events')
      .update({ current_candidate_index: nextIndex })
      .eq('id', currentEvent.id);
    if (!error) {
      setCurrentEvent({ ...currentEvent, current_candidate_index: nextIndex });
      setCurrentCandidate(candidates[nextIndex]);
    }
    setAdvancing(false);
  };

  // Go to previous candidate
  const handlePreviousCandidate = async () => {
    if (!currentEvent || !candidates.length) return;
    setAdvancing(true);
    const prevIndex = currentEvent.current_candidate_index - 1;
    if (prevIndex < 0) {
      setAdvancing(false);
      alert('Already at the first candidate.');
      return;
    }
    const { error } = await supabase
      .from('events')
      .update({ current_candidate_index: prevIndex })
      .eq('id', currentEvent.id);
    if (!error) {
      setCurrentEvent({ ...currentEvent, current_candidate_index: prevIndex });
      setCurrentCandidate(candidates[prevIndex]);
    }
    setAdvancing(false);
  };

  // Toggle voting phase - only allow opinion to final, not back
  const handleTogglePhase = async () => {
    if (!currentEvent) return;
    
    // Only allow switching from opinion to final, not back
    if (currentEvent.phase === 'final') {
      alert('Cannot switch back to opinion poll. Once in final vote phase, you must end the event to start a new one.');
      return;
    }
    
    const confirmSwitch = window.confirm(
      `Are you sure you want to switch from Opinion Poll to Final Vote?\n\n` +
      `This will:\n` +
      `• Make votes non-anonymous\n` +
      `• Change vote options to Yes/No only\n` +
      `• Prevent switching back to opinion poll\n` +
      `• Reset to the first candidate\n\n` +
      `This action cannot be undone.`
    );
    
    if (!confirmSwitch) return;
    
    setTogglingPhase(true);
    const { error } = await supabase
      .from('events')
      .update({ phase: 'final', current_candidate_index: 0 })
      .eq('id', currentEvent.id);
    if (!error) {
      setCurrentEvent({ ...currentEvent, phase: 'final', current_candidate_index: 0 });
      setCurrentCandidate(candidates[0] || null);
    }
    setTogglingPhase(false);
  };

  // End current event
  const handleEndEvent = async () => {
    if (!currentEvent) return;
    
    const confirmEnd = window.confirm(
      `Are you sure you want to end the "${currentEvent.type}" event? This will:\n\n` +
      `• Remove all candidates from the voting page\n` +
      `• Prevent further voting on this event\n` +
      `• Clear the current event display\n` +
      `• Keep all data accessible in admin dashboard\n\n` +
      `This action cannot be undone.`
    );
    
    if (!confirmEnd) return;
    
    setEndingEvent(true);
    const { error } = await supabase
      .from('events')
      .update({ is_ended: true })
      .eq('id', currentEvent.id);
    
    if (!error) {
      // Clear current event display
      setCurrentEvent(null);
      setCurrentCandidate(null);
      setCandidates([]);
      alert('Event ended successfully! The voting page and admin console are now cleared.');
    } else {
      alert('Failed to end event: ' + error.message);
    }
    setEndingEvent(false);
  };

  // Load detailed results for a past event
  const loadEventResults = async (eventId: string) => {
    if (eventResults[eventId]) {
      setExpandedEventId(expandedEventId === eventId ? null : eventId);
      return;
    }
    
    setLoadingResults(eventId);
    try {
      // Fetch event details
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();
      
      if (eventError) throw eventError;
      
      // Fetch candidates
      const { data: candidatesData, error: candidatesError } = await supabase
        .from('candidates')
        .select('*')
        .eq('event_id', eventId)
        .order('id', { ascending: true });
      
      if (candidatesError) throw candidatesError;
      
      // Fetch votes
      const { data: votesData, error: votesError } = await supabase
        .from('votes')
        .select('*')
        .eq('event_id', eventId);
      
      if (votesError) throw votesError;
      
      // Calculate results
      const results = candidatesData.map((candidate: Candidate) => {
        const candidateVotes = votesData.filter((vote: Vote) => vote.candidate_id === candidate.id);
        
        // Opinion poll results
        const opinionVotes = candidateVotes.filter((vote: Vote) => vote.type === 'opinion');
        const opinionYes = opinionVotes.filter((vote: Vote) => vote.vote_value === 'yes').length;
        const opinionNo = opinionVotes.filter((vote: Vote) => vote.vote_value === 'no').length;
        const opinionAbstain = opinionVotes.filter((vote: Vote) => vote.vote_value === 'abstain').length;
        const opinionTotal = opinionVotes.length;
        const opinionPercent = opinionTotal > 0 ? Math.round((opinionYes / opinionTotal) * 100) : 0;
        
        // Final vote results
        const finalVotes = candidateVotes.filter((vote: Vote) => vote.type === 'final');
        const finalYes = finalVotes.filter((vote: Vote) => vote.vote_value === 'yes').length;
        const finalNo = finalVotes.filter((vote: Vote) => vote.vote_value === 'no').length;
        const finalTotal = finalVotes.length;
        const finalPercent = finalTotal > 0 ? Math.round((finalYes / finalTotal) * 100) : 0;
        
        return {
          candidate,
          opinion: { yes: opinionYes, no: opinionNo, abstain: opinionAbstain, total: opinionTotal, percent: opinionPercent },
          final: { yes: finalYes, no: finalNo, total: finalTotal, percent: finalPercent },
          approved: finalPercent >= (eventData.approval_threshold || 85)
        };
      });
      
      setEventResults({ ...eventResults, [eventId]: { event: eventData, results } });
      setExpandedEventId(eventId);
    } catch (error) {
      console.error('Error loading event results:', error);
      alert('Failed to load event results');
    } finally {
      setLoadingResults(null);
    }
  };

  // Delete a past event
  const deleteEvent = async (eventId: string) => {
    const confirmDelete = window.confirm(
      'Are you sure you want to delete this event? This will permanently remove:\n\n' +
      '• All candidate data\n' +
      '• All vote records\n' +
      '• Event information\n\n' +
      'This action cannot be undone.'
    );
    
    if (!confirmDelete) return;
    
    setDeletingEvent(eventId);
    try {
      // Delete votes first (foreign key constraint)
      const { error: votesError } = await supabase
        .from('votes')
        .delete()
        .eq('event_id', eventId);
      
      if (votesError) throw votesError;
      
      // Delete candidates
      const { error: candidatesError } = await supabase
        .from('candidates')
        .delete()
        .eq('event_id', eventId);
      
      if (candidatesError) throw candidatesError;
      
      // Delete event
      const { error: eventError } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);
      
      if (eventError) throw eventError;
      
      // Update local state
      setPastEvents(pastEvents.filter(e => e.id !== eventId));
      setEventResults({ ...eventResults, [eventId]: undefined });
      if (expandedEventId === eventId) {
        setExpandedEventId(null);
      }
      
      alert('Event deleted successfully');
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event');
    } finally {
      setDeletingEvent(null);
    }
  };

  if (loading || !user || !user.is_admin) return null;

  return (
    <div className="stack-l">
      {/* Header */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div className="title" style={{ marginBottom: '1rem' }}>Admin Dashboard</div>
        <div className="row-m">
          <button 
            className="btn btn-ghost" 
            onClick={() => router.push('/results')}
          >
            View Results
          </button>
          <button 
            className="btn btn-ghost" 
            onClick={() => router.push('/admin/display')}
          >
            Final Vote Display
          </button>
          <button 
            className="btn btn-ghost" 
            onClick={() => router.push('/dashboard')}
          >
            Return to Dashboard
          </button>
        </div>
      </div>

      {/* Pending User Approvals */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div className="title" style={{ marginBottom: '1rem' }}>Pending User Approvals</div>
        {loadingUsers ? (
          <p style={{ color: 'var(--muted)' }}>Loading users...</p>
        ) : pendingUsers.length === 0 ? (
          <p style={{ color: 'var(--muted)' }}>No users pending approval.</p>
        ) : (
          <div className="stack-m">
            {pendingUsers.map(u => (
              <div key={u.id} className="row-m" style={{ 
                alignItems: 'center', 
                padding: '0.75rem', 
                background: 'var(--bg-elev)', 
                border: '1px solid var(--border)' 
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                    {u.name || u.email}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                    {u.email}
                  </div>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => approveUser(u.id)}
                  disabled={approving === u.id}
                >
                  {approving === u.id ? 'Approving...' : 'Approve'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Management */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <details 
          open={userManagementExpanded}
          onToggle={(e) => setUserManagementExpanded(e.currentTarget.open)}
        >
          <summary style={{ 
            cursor: 'pointer', 
            listStyle: 'none',
            marginBottom: userManagementExpanded ? '1rem' : '0'
          }}>
            <div className="title" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: 0
            }}>
              <span>User Management</span>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem'
              }}>
                <span style={{ 
                  fontSize: '0.9rem', 
                  color: 'var(--muted)',
                  fontWeight: 'normal'
                }}>
                  {allUsers.length} users
                </span>
                <span style={{ 
                  fontSize: '0.8rem', 
                  color: 'var(--muted)',
                  transition: 'transform 0.2s ease',
                  transform: userManagementExpanded ? 'rotate(90deg)' : 'rotate(0deg)'
                }}>
                  ▶
                </span>
              </div>
            </div>
          </summary>
          
          {loadingAllUsers ? (
            <p style={{ color: 'var(--muted)' }}>Loading users...</p>
          ) : allUsers.length === 0 ? (
            <p style={{ color: 'var(--muted)' }}>No users found.</p>
          ) : (
            <div className="stack-m">
              {allUsers.map(user => (
                <div key={user.id} className="card" style={{ 
                  padding: '1rem', 
                  background: 'var(--bg-elev)', 
                  border: '1px solid var(--border)'
                }}>
                  <div className="row-m" style={{ alignItems: 'center', marginBottom: '0.75rem' }}>
                                      <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                      {user.name || user.email}
                    </div>
                    <div className="row-m" style={{ gap: '1rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
                      <span>{user.email}</span>
                      <span>Joined: {new Date(user.created_at).toLocaleDateString()}</span>
                      {user.is_admin && <span style={{ color: 'var(--brand)' }}>• Admin</span>}
                    </div>
                  </div>
                  </div>
                  
                  <div className="row-m" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
                    {/* Member Status Toggle */}
                    <button
                      className={`btn ${user.is_approved ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => updateUserStatus(user.id, 'is_approved', !user.is_approved)}
                      disabled={updatingUser === user.id || user.is_admin}
                      style={{ fontSize: '0.85rem' }}
                    >
                      {updatingUser === user.id ? 'Updating...' : 
                       user.is_approved ? 'Approved Member' : 'Pending Member'}
                    </button>
                    
                    {/* Voting Status Toggle */}
                    <button
                      className={`btn ${user.can_vote ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => updateUserStatus(user.id, 'can_vote', !user.can_vote)}
                      disabled={updatingUser === user.id || !user.is_approved || user.is_admin}
                      style={{ fontSize: '0.85rem' }}
                    >
                      {updatingUser === user.id ? 'Updating...' : 
                       user.can_vote ? 'Can Vote' : 'Cannot Vote'}
                    </button>
                    
                    {/* Delete User */}
                    <button
                      className="btn btn-danger"
                      onClick={() => deleteUser(user.id, user.email)}
                      disabled={deletingUser === user.id || user.is_admin}
                      style={{ fontSize: '0.85rem' }}
                    >
                      {deletingUser === user.id ? 'Deleting...' : 'Delete User'}
                    </button>
                  </div>
                  
                  {/* Status Indicators */}
                  <div className="row-m" style={{ marginTop: '0.75rem', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {user.is_approved && (
                      <span style={{ 
                        padding: '0.25rem 0.5rem', 
                        background: 'rgba(16, 185, 129, 0.1)', 
                        color: '#10b981',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        border: '1px solid rgba(16, 185, 129, 0.2)'
                      }}>
                        ✓ Approved
                      </span>
                    )}
                    {user.can_vote && (
                      <span style={{ 
                        padding: '0.25rem 0.5rem', 
                        background: 'rgba(59, 130, 246, 0.1)', 
                        color: '#3b82f6',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        border: '1px solid rgba(59, 130, 246, 0.2)'
                      }}>
                        🗳️ Can Vote
                      </span>
                    )}
                    {user.is_admin && (
                      <span style={{ 
                        padding: '0.25rem 0.5rem', 
                        background: 'rgba(139, 92, 246, 0.1)', 
                        color: '#8b5cf6',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        border: '1px solid rgba(139, 92, 246, 0.2)'
                      }}>
                        👑 Admin
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </details>
      </div>

      {/* Current Event & Candidate */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div className="title" style={{ marginBottom: '1rem' }}>Current Event & Candidate</div>
        {currentEvent && currentCandidate ? (
          <div className="stack-m">
                      <div className="row-m" style={{ color: 'var(--muted)' }}>
            <span className="mono">Event: {currentEvent.event_name || currentEvent.type}</span>
            <span className="mono">Date: {formatDate(currentEvent.date)}</span>
            <span className="mono">Phase: {currentEvent.phase || 'opinion'}</span>
          </div>
            
            <div className="row-m" style={{ gap: '1rem' }}>
              <button 
                className="btn btn-ghost" 
                onClick={handleTogglePhase} 
                disabled={togglingPhase || currentEvent.phase === 'final'}
                style={{ alignSelf: 'flex-start' }}
              >
                {togglingPhase ? 'Switching...' : 
                 currentEvent.phase === 'opinion' ? 'Switch to Final Vote' : 
                 'Final Vote (Cannot Switch Back)'}
              </button>
              
              <button 
                className="btn btn-danger" 
                onClick={handleEndEvent} 
                disabled={endingEvent}
                style={{ alignSelf: 'flex-start' }}
              >
                {endingEvent ? 'Ending...' : 'End Event'}
              </button>
            </div>
            
            <div className="card" style={{ padding: '1rem', background: 'var(--bg-elev)' }}>
              <div className="title" style={{ marginBottom: '0.75rem', fontSize: '1.25rem' }}>
                {currentCandidate.name}
              </div>
              <div className="stack-m">
                {currentCandidate.major && (
                  <div className="row-m">
                    <span style={{ color: 'var(--muted)', minWidth: '100px' }}>Major:</span>
                    <span>{currentCandidate.major}</span>
                  </div>
                )}
                {currentCandidate.grad_year && (
                  <div className="row-m">
                    <span style={{ color: 'var(--muted)', minWidth: '100px' }}>Grad Year:</span>
                    <span>{currentCandidate.grad_year}</span>
                  </div>
                )}
                {currentCandidate.gpa && (
                  <div className="row-m">
                    <span style={{ color: 'var(--muted)', minWidth: '100px' }}>GPA:</span>
                    <span>{currentCandidate.gpa}</span>
                  </div>
                )}
                {currentCandidate.position && (
                  <div className="row-m">
                    <span style={{ color: 'var(--muted)', minWidth: '100px' }}>Position:</span>
                    <span>{currentCandidate.position}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="row-m" style={{ gap: '1rem' }}>
              <button 
                className="btn btn-ghost" 
                onClick={handlePreviousCandidate} 
                disabled={advancing || (currentEvent.current_candidate_index <= 0)}
              >
                {advancing ? 'Moving...' : 'Previous Candidate'}
              </button>
              
              <button 
                className="btn btn-primary" 
                onClick={handleNextCandidate} 
                disabled={advancing}
              >
                {advancing ? 'Advancing...' : 'Next Candidate'}
              </button>
            </div>
          </div>
        ) : (
          <p style={{ color: 'var(--muted)' }}>No current event or candidate.</p>
        )}
      </div>

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <div className="title" style={{ marginBottom: '1rem' }}>Past Events</div>
          <div className="stack-m">
            {pastEvents.map(event => (
              <div key={event.id} className="card" style={{ 
                padding: '1rem', 
                background: 'var(--bg-elev)',
                borderColor: 'var(--danger)',
                opacity: 0.8
              }}>
                <div className="row-m" style={{ alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span className="title" style={{ fontSize: '1.1rem' }}>{event.event_name || event.type}</span>
                  <span className="mono" style={{ color: 'var(--danger)' }}>ENDED</span>
                </div>
                <div className="row-m" style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
                  <span>Date: {formatDate(event.date)}</span>
                  <span>Phase: {event.phase || 'opinion'}</span>
                  <span>Candidates: {candidates.filter(c => c.event_id === event.id).length}</span>
                </div>
                
                <div className="row-m" style={{ marginTop: '1rem', gap: '0.5rem' }}>
                  <button 
                    className="btn btn-ghost" 
                    onClick={() => loadEventResults(event.id)}
                    disabled={loadingResults === event.id}
                    style={{ fontSize: '0.9rem' }}
                  >
                    {loadingResults === event.id ? 'Loading...' : 
                     expandedEventId === event.id ? 'Hide Results' : 'View Results'}
                  </button>
                  
                  <button 
                    className="btn btn-danger" 
                    onClick={() => deleteEvent(event.id)}
                    disabled={deletingEvent === event.id}
                    style={{ fontSize: '0.9rem' }}
                  >
                    {deletingEvent === event.id ? 'Deleting...' : 'Delete Event'}
                  </button>
                </div>
                
                {/* Expanded Results View */}
                {expandedEventId === event.id && eventResults[event.id] && (
                  <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                    <div className="title" style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>
                      Results for {eventResults[event.id].event.type} Event
                    </div>
                    
                    <div className="stack-m">
                      {eventResults[event.id].results.map((result: any, index: number) => (
                        <div key={result.candidate.id} className="card" style={{ padding: '1rem', background: 'var(--bg-elev)' }}>
                          <div className="title" style={{ marginBottom: '0.75rem', fontSize: '1.1rem' }}>
                            {result.candidate.name}
                            {result.approved && (
                              <span style={{ color: 'var(--brand)', marginLeft: '0.5rem' }}>✓ APPROVED</span>
                            )}
                          </div>
                          
                          <div className="stack-m">
                            {result.candidate.major && (
                              <div className="row-m">
                                <span style={{ color: 'var(--muted)', minWidth: '100px' }}>Major:</span>
                                <span>{result.candidate.major}</span>
                              </div>
                            )}
                            {result.candidate.grad_year && (
                              <div className="row-m">
                                <span style={{ color: 'var(--muted)', minWidth: '100px' }}>Grad Year:</span>
                                <span>{result.candidate.grad_year}</span>
                              </div>
                            )}
                            {result.candidate.classification && (
                              <div className="row-m">
                                <span style={{ color: 'var(--muted)', minWidth: '100px' }}>Classification:</span>
                                <span>{result.candidate.classification}</span>
                              </div>
                            )}
                            {result.candidate.gpa && (
                              <div className="row-m">
                                <span style={{ color: 'var(--muted)', minWidth: '100px' }}>GPA:</span>
                                <span>{parseFloat(result.candidate.gpa).toFixed(2)}</span>
                              </div>
                            )}
                            {result.candidate.position && (
                              <div className="row-m">
                                <span style={{ color: 'var(--muted)', minWidth: '100px' }}>Position:</span>
                                <span>{result.candidate.position}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Opinion Poll Results */}
                          <div style={{ marginTop: '1rem' }}>
                            <div className="title" style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Opinion Poll</div>
                            <div className="row-m" style={{ gap: '1rem', flexWrap: 'wrap' }}>
                              <div style={{ padding: '0.5rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '4px' }}>
                                <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Yes:</span>
                                <span style={{ marginLeft: '0.5rem', fontWeight: 'bold' }}>{result.opinion.yes}</span>
                              </div>
                              <div style={{ padding: '0.5rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '4px' }}>
                                <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>No:</span>
                                <span style={{ marginLeft: '0.5rem', fontWeight: 'bold' }}>{result.opinion.no}</span>
                              </div>
                              <div style={{ padding: '0.5rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '4px' }}>
                                <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Abstain:</span>
                                <span style={{ marginLeft: '0.5rem', fontWeight: 'bold' }}>{result.opinion.abstain}</span>
                              </div>
                              <div style={{ padding: '0.5rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '4px' }}>
                                <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Total:</span>
                                <span style={{ marginLeft: '0.5rem', fontWeight: 'bold' }}>{result.opinion.total}</span>
                              </div>
                              <div style={{ padding: '0.5rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '4px' }}>
                                <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Approval:</span>
                                <span style={{ marginLeft: '0.5rem', fontWeight: 'bold', color: 'var(--brand)' }}>
                                  {result.opinion.percent}%
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Final Vote Results */}
                          <div style={{ marginTop: '1rem' }}>
                            <div className="title" style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Final Vote</div>
                            <div className="row-m" style={{ gap: '1rem', flexWrap: 'wrap' }}>
                              <div style={{ padding: '0.5rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '4px' }}>
                                <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Yes:</span>
                                <span style={{ marginLeft: '0.5rem', fontWeight: 'bold' }}>{result.final.yes}</span>
                              </div>
                              <div style={{ padding: '0.5rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '4px' }}>
                                <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>No:</span>
                                <span style={{ marginLeft: '0.5rem', fontWeight: 'bold' }}>{result.final.no}</span>
                              </div>
                              <div style={{ padding: '0.5rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '4px' }}>
                                <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Total:</span>
                                <span style={{ marginLeft: '0.5rem', fontWeight: 'bold' }}>{result.final.total}</span>
                              </div>
                              <div style={{ padding: '0.5rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '4px' }}>
                                <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Approval:</span>
                                <span style={{ marginLeft: '0.5rem', fontWeight: 'bold', color: 'var(--brand)' }}>
                                  {result.final.percent}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Event & Candidates */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div className="title" style={{ marginBottom: '1rem' }}>Upload Event & Candidates</div>
        <div className="stack-m">
          <textarea
            value={jsonInput}
            onChange={e => setJsonInput(e.target.value)}
            placeholder={`Paste event/candidate JSON here

Example format:
{
  "type": "member",
  "date": "2024-12-15",
  "candidates": [
    {
      "name": "Alex Johnson",
      "major": "Computer Science",
      "grad_year": "2026",
      "gpa": "3.8",
      "classification": "sophomore",
      "image_url": "https://example.com/photos/alex-johnson.jpg",
      "resume_url": "https://example.com/resumes/alex-johnson-resume.pdf"
    }
  ]
}`}
            rows={10}
            className="input"
            style={{ fontFamily: 'monospace', resize: 'vertical' }}
          />
          
          {parsedData && (
            <div className="stack-s">
              <label style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text)' }}>
                Event Name *
              </label>
              <input
                type="text"
                value={eventName}
                onChange={e => setEventName(e.target.value)}
                placeholder="Enter a descriptive name for this event (e.g., 'Fall 2024 New Member Voting')"
                className="input"
                style={{ width: '100%' }}
              />
            </div>
          )}
          
          <div className="row-m">
            <button className="btn btn-ghost" onClick={handleParseJson}>
              Preview
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleUpload} 
              disabled={!parsedData || uploading || !eventName.trim()}
            >
              {uploading ? 'Uploading...' : 'Create Event'}
            </button>
          </div>
          
          {parseError && (
            <div style={{ color: 'var(--danger)', padding: '0.75rem', background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)' }}>
              {parseError}
            </div>
          )}
          
          {parsedData && (
            <div className="mono" style={{ 
              background: 'var(--bg-elev)', 
              padding: '1rem', 
              border: '1px solid var(--border)',
              fontSize: '0.9rem',
              overflow: 'auto',
              maxHeight: '300px'
            }}>
              <pre style={{ margin: 0 }}>{JSON.stringify(parsedData, null, 2)}</pre>
            </div>
          )}
          
          {uploadResult && (
            <div style={{ 
              color: uploadResult.startsWith('Upload failed') ? 'var(--danger)' : 'var(--brand)',
              padding: '0.75rem',
              background: uploadResult.startsWith('Upload failed') ? 'rgba(239,68,68,0.1)' : 'rgba(139,92,246,0.1)',
              border: `1px solid ${uploadResult.startsWith('Upload failed') ? 'var(--danger)' : 'var(--brand)'}`
            }}>
              {uploadResult}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}