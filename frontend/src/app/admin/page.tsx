'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '../context/UserContext';
import { supabase } from '../../lib/supabaseClient';

export default function AdminPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);

  // Event/Candidate upload state
  const [jsonInput, setJsonInput] = useState('');
  const [parsedData, setParsedData] = useState<any>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);

  const [currentEvent, setCurrentEvent] = useState<any>(null);
  const [currentCandidate, setCurrentCandidate] = useState<any>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [advancing, setAdvancing] = useState(false);

  const [togglingPhase, setTogglingPhase] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !user.is_admin)) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchPendingUsers = async () => {
      setLoadingUsers(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, is_approved')
        .eq('is_approved', false);
      if (!error && data) setPendingUsers(data);
      setLoadingUsers(false);
    };
    if (user && user.is_admin) fetchPendingUsers();
  }, [user]);

  const approveUser = async (id: string) => {
    setApproving(id);
    await supabase.from('profiles').update({ is_approved: true }).eq('id', id);
    setPendingUsers(pendingUsers.filter(u => u.id !== id));
    setApproving(null);
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
      // Insert event
      const eventRes = await supabase.from('events').insert({
        type: parsedData.event_type,
        date: parsedData.date,
      }).select().single();
      if (eventRes.error) throw eventRes.error;
      const eventId = eventRes.data.id;
      // Insert candidates
      if (parsedData.event_type === 'member') {
        const candidates = parsedData.candidates.map((c: any) => ({ ...c, event_id: eventId }));
        const candRes = await supabase.from('candidates').insert(candidates);
        if (candRes.error) throw candRes.error;
      } else if (parsedData.event_type === 'exec') {
        let allCandidates: any[] = [];
        parsedData.positions.forEach((pos: any) => {
          pos.candidates.forEach((c: any) => {
            allCandidates.push({ name: c.name, position: pos.name, event_id: eventId });
          });
        });
        const candRes = await supabase.from('candidates').insert(allCandidates);
        if (candRes.error) throw candRes.error;
      }
      setUploadResult('Event and candidates uploaded successfully!');
      setParsedData(null);
      setJsonInput('');
    } catch (e: any) {
      setUploadResult('Upload failed: ' + (e.message || e.toString()));
    }
    setUploading(false);
  };

  // Fetch current event and candidates
  useEffect(() => {
    const fetchEventAndCandidates = async () => {
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: false })
        .limit(1)
        .single();
      if (!eventError && eventData) {
        setCurrentEvent(eventData);
        const { data: candData, error: candError } = await supabase
          .from('candidates')
          .select('*')
          .eq('event_id', eventData.id)
          .order('id', { ascending: true });
        if (!candError && candData) {
          setCandidates(candData);
          setCurrentCandidate(candData[eventData.current_candidate_index] || null);
        }
      }
    };
    fetchEventAndCandidates();
  }, [uploadResult]); // refetch after upload

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

  // Toggle voting phase
  const handleTogglePhase = async () => {
    if (!currentEvent) return;
    setTogglingPhase(true);
    const newPhase = currentEvent.phase === 'opinion' ? 'final' : 'opinion';
    const { error } = await supabase
      .from('events')
      .update({ phase: newPhase })
      .eq('id', currentEvent.id);
    if (!error) {
      setCurrentEvent({ ...currentEvent, phase: newPhase });
    }
    setTogglingPhase(false);
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
            onClick={() => alert('Results viewing coming soon!')}
          >
            View Results
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
                <span style={{ flex: 1 }}>{u.email}</span>
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

      {/* Current Event & Candidate */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div className="title" style={{ marginBottom: '1rem' }}>Current Event & Candidate</div>
        {currentEvent && currentCandidate ? (
          <div className="stack-m">
            <div className="row-m" style={{ color: 'var(--muted)' }}>
              <span className="mono">Event: {currentEvent.type}</span>
              <span className="mono">Date: {new Date(currentEvent.date).toLocaleDateString()}</span>
              <span className="mono">Phase: {currentEvent.phase || 'opinion'}</span>
            </div>
            
            <button 
              className="btn btn-ghost" 
              onClick={handleTogglePhase} 
              disabled={togglingPhase}
              style={{ alignSelf: 'flex-start' }}
            >
              {togglingPhase ? 'Switching...' : `Switch to ${currentEvent.phase === 'opinion' ? 'Final Vote' : 'Opinion Poll'}`}
            </button>
            
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
            
            <button 
              className="btn btn-primary" 
              onClick={handleNextCandidate} 
              disabled={advancing}
              style={{ alignSelf: 'flex-start' }}
            >
              {advancing ? 'Advancing...' : 'Next Candidate'}
            </button>
          </div>
        ) : (
          <p style={{ color: 'var(--muted)' }}>No current event or candidate.</p>
        )}
      </div>

      {/* Upload Event & Candidates */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div className="title" style={{ marginBottom: '1rem' }}>Upload Event & Candidates</div>
        <div className="stack-m">
          <textarea
            value={jsonInput}
            onChange={e => setJsonInput(e.target.value)}
            placeholder='Paste event/candidate JSON here'
            rows={10}
            className="input"
            style={{ fontFamily: 'monospace', resize: 'vertical' }}
          />
          
          <div className="row-m">
            <button className="btn btn-ghost" onClick={handleParseJson}>
              Preview
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleUpload} 
              disabled={!parsedData || uploading}
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