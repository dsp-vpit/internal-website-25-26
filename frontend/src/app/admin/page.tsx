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
    <div style={{ padding: 32 }}>
      <h1>Admin Dashboard</h1>
      <div style={{ marginTop: 24, display: 'flex', gap: 16 }}>
        <button onClick={() => alert('Results viewing coming soon!')}>View Results</button>
        <button onClick={() => router.push('/dashboard')}>Return to Dashboard</button>
      </div>
      <h2 style={{ marginTop: 40 }}>Pending User Approvals</h2>
      {loadingUsers ? (
        <p>Loading users...</p>
      ) : pendingUsers.length === 0 ? (
        <p>No users pending approval.</p>
      ) : (
        <ul style={{ marginTop: 16 }}>
          {pendingUsers.map(u => (
            <li key={u.id} style={{ marginBottom: 8 }}>
              {u.email}
              <button
                style={{ marginLeft: 16 }}
                onClick={() => approveUser(u.id)}
                disabled={approving === u.id}
              >
                {approving === u.id ? 'Approving...' : 'Approve'}
              </button>
            </li>
          ))}
        </ul>
      )}
      <h2 style={{ marginTop: 40 }}>Current Event & Candidate</h2>
      {currentEvent && currentCandidate ? (
        <div style={{ marginBottom: 16 }}>
          <div><b>Event Type:</b> {currentEvent.type}</div>
          <div><b>Date:</b> {currentEvent.date}</div>
          <div><b>Phase:</b> {currentEvent.phase || 'opinion'}</div>
          <button style={{ marginTop: 8, marginBottom: 8 }} onClick={handleTogglePhase} disabled={togglingPhase}>
            {togglingPhase ? 'Switching...' : `Switch to ${currentEvent.phase === 'opinion' ? 'Final Vote' : 'Opinion Poll'}`}
          </button>
          <div style={{ marginTop: 8 }}>
            <b>Current Candidate:</b> {currentCandidate.name}
            {currentCandidate.major && <span> | Major: {currentCandidate.major}</span>}
            {currentCandidate.grad_year && <span> | Grad Year: {currentCandidate.grad_year}</span>}
            {currentCandidate.gpa && <span> | GPA: {currentCandidate.gpa}</span>}
            {currentCandidate.position && <span> | Position: {currentCandidate.position}</span>}
          </div>
          <button style={{ marginTop: 12 }} onClick={handleNextCandidate} disabled={advancing}>
            {advancing ? 'Advancing...' : 'Next Candidate'}
          </button>
        </div>
      ) : (
        <div>No current event or candidate.</div>
      )}
      <h2 style={{ marginTop: 40 }}>Upload Event & Candidates</h2>
      <textarea
        value={jsonInput}
        onChange={e => setJsonInput(e.target.value)}
        placeholder='Paste event/candidate JSON here'
        rows={10}
        style={{ width: '100%', marginBottom: 8 }}
      />
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button onClick={handleParseJson}>Preview</button>
        <button onClick={handleUpload} disabled={!parsedData || uploading}>
          {uploading ? 'Uploading...' : 'Create Event'}
        </button>
      </div>
      {parseError && <div style={{ color: 'red' }}>{parseError}</div>}
      {parsedData && (
        <pre style={{ background: '#222', color: '#fff', padding: 8, borderRadius: 4 }}>
          {JSON.stringify(parsedData, null, 2)}
        </pre>
      )}
      {uploadResult && <div style={{ color: uploadResult.startsWith('Upload failed') ? 'red' : 'green', marginTop: 8 }}>{uploadResult}</div>}
    </div>
  );
} 