'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '../context/UserContext';
import { 
  FaFolder, 
  FaGraduationCap, 
  FaChartBar, 
  FaClipboardList, 
  FaUsers 
} from 'react-icons/fa';

export default function DashboardPage() {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth');
    }
  }, [user, loading, router]);

  const handleProfessionalResources = () => {
    // Replace with your actual Google Drive folder URL
    window.open('https://drive.google.com/drive/folders/YOUR_FOLDER_ID', '_blank');
  };

  const handleScholarshipTracker = () => {
    // Replace with your actual scholarship tracker URL
    window.open('https://your-scholarship-tracker-url.com', '_blank');
  };

  const handleBroMeetingSlides = () => {
    // Replace with your actual bro meeting slides URL
    window.open('https://your-bro-meeting-slides-url.com', '_blank');
  };

  const handleMemberForms = () => {
    // Replace with your actual member forms URL
    window.open('https://your-member-forms-url.com', '_blank');
  };

  const handleAlumniDirectory = () => {
    // Replace with your actual alumni/bro directory URL
    window.open('https://your-alumni-directory-url.com', '_blank');
  };

  if (loading || !user) return null;

  return (
    <div className="stack-l">
      <div className="card" style={{ padding: '1.5rem' }}>
        <h1 className="title" style={{ marginBottom: '0.75rem' }}>Welcome, {user.email}!</h1>
        {!user.is_approved && (
          <div className="card" style={{ padding: '0.75rem', borderColor: 'var(--border)', color: 'var(--muted)' }}>
            Your account is not yet approved. Some features may be unavailable.
          </div>
        )}
        <div className="row-m" style={{ marginTop: '1rem' }}>
          <span>Status: <b>{user.is_approved ? 'Approved' : 'Pending Approval'}</b></span>
          <span>Role: <b>{user.is_admin ? 'Admin' : 'Member'}</b></span>
        </div>
      </div>
      
      <div className="stack-m" style={{ gap: '1.5rem' }}>
        {/* Professional Resources Button */}
        <div 
          className="card" 
          style={{ 
            padding: '0',
            cursor: 'pointer',
            overflow: 'hidden',
            position: 'relative',
            background: 'linear-gradient(135deg, #553c9a 0%, #2d3748 100%)',
            border: 'none',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
          }}
          onClick={handleProfessionalResources}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
          }}
        >
          <div style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Cdefs%3E%3Cpattern id=\'diagonal\' width=\'20\' height=\'20\' patternUnits=\'userSpaceOnUse\'%3E%3Cpath d=\'M 0 20 L 20 0\' fill=\'none\' stroke=\'rgba(255,255,255,0.03)\' stroke-width=\'0.5\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\'100\' height=\'100\' fill=\'url(%23diagonal)\'/%3E%3C/svg%3E")',
            backgroundSize: 'cover',
            padding: '2rem',
            position: 'relative',
            minHeight: '120px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ zIndex: 2 }}>
              <div className="title" style={{ 
                color: 'white', 
                marginBottom: '0.5rem',
                fontSize: '1.5rem',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}>
                Professional Resources
              </div>
              <p style={{ 
                color: 'rgba(255,255,255,0.9)', 
                margin: 0,
                fontSize: '0.95rem',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)'
              }}>
                Access documents, templates, and career development materials
              </p>
            </div>
            <div style={{
              fontSize: '2.5rem',
              color: 'rgba(255,255,255,0.8)',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}>
              <FaFolder />
            </div>
          </div>
        </div>

        {/* Scholarship Tracker Button */}
        <div 
          className="card" 
          style={{ 
            padding: '0',
            cursor: 'pointer',
            overflow: 'hidden',
            position: 'relative',
            background: 'linear-gradient(135deg, #553c9a 0%, #2d3748 100%)',
            border: 'none',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
          }}
          onClick={handleScholarshipTracker}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
          }}
        >
          <div style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Cdefs%3E%3Cpattern id=\'diagonal\' width=\'20\' height=\'20\' patternUnits=\'userSpaceOnUse\'%3E%3Cpath d=\'M 0 20 L 20 0\' fill=\'none\' stroke=\'rgba(255,255,255,0.03)\' stroke-width=\'0.5\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\'100\' height=\'100\' fill=\'url(%23diagonal)\'/%3E%3C/svg%3E")',
            backgroundSize: 'cover',
            padding: '2rem',
            position: 'relative',
            minHeight: '120px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ zIndex: 2 }}>
              <div className="title" style={{ 
                color: 'white', 
                marginBottom: '0.5rem',
                fontSize: '1.5rem',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}>
                Scholarship Tracker
              </div>
              <p style={{ 
                color: 'rgba(255,255,255,0.9)', 
                margin: 0,
                fontSize: '0.95rem',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)'
              }}>
                Track applications, deadlines, and scholarship opportunities
              </p>
            </div>
            <div style={{
              fontSize: '2.5rem',
              color: 'rgba(255,255,255,0.8)',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}>
              <FaGraduationCap />
            </div>
          </div>
        </div>

        {/* Bro Meeting Slides Button */}
        <div 
          className="card" 
          style={{ 
            padding: '0',
            cursor: 'pointer',
            overflow: 'hidden',
            position: 'relative',
            background: 'linear-gradient(135deg, #553c9a 0%, #2d3748 100%)',
            border: 'none',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
          }}
          onClick={handleBroMeetingSlides}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
          }}
        >
          <div style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Cdefs%3E%3Cpattern id=\'diagonal\' width=\'20\' height=\'20\' patternUnits=\'userSpaceOnUse\'%3E%3Cpath d=\'M 0 20 L 20 0\' fill=\'none\' stroke=\'rgba(255,255,255,0.03)\' stroke-width=\'0.5\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\'100\' height=\'100\' fill=\'url(%23diagonal)\'/%3E%3C/svg%3E")',
            backgroundSize: 'cover',
            padding: '2rem',
            position: 'relative',
            minHeight: '120px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ zIndex: 2 }}>
              <div className="title" style={{ 
                color: 'white', 
                marginBottom: '0.5rem',
                fontSize: '1.5rem',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}>
                Bro Meeting Slides
              </div>
              <p style={{ 
                color: 'rgba(255,255,255,0.9)', 
                margin: 0,
                fontSize: '0.95rem',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)'
              }}>
                Access presentation slides and meeting materials
              </p>
            </div>
            <div style={{
              fontSize: '2.5rem',
              color: 'rgba(255,255,255,0.8)',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}>
              <FaChartBar />
            </div>
          </div>
        </div>

        {/* Member Forms Button */}
        <div 
          className="card" 
          style={{ 
            padding: '0',
            cursor: 'pointer',
            overflow: 'hidden',
            position: 'relative',
            background: 'linear-gradient(135deg, #553c9a 0%, #2d3748 100%)',
            border: 'none',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
          }}
          onClick={handleMemberForms}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
          }}
        >
          <div style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Cdefs%3E%3Cpattern id=\'diagonal\' width=\'20\' height=\'20\' patternUnits=\'userSpaceOnUse\'%3E%3Cpath d=\'M 0 20 L 20 0\' fill=\'none\' stroke=\'rgba(255,255,255,0.03)\' stroke-width=\'0.5\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\'100\' height=\'100\' fill=\'url(%23diagonal)\'/%3E%3C/svg%3E")',
            backgroundSize: 'cover',
            padding: '2rem',
            position: 'relative',
            minHeight: '120px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ zIndex: 2 }}>
              <div className="title" style={{ 
                color: 'white', 
                marginBottom: '0.5rem',
                fontSize: '1.5rem',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}>
                Member Forms
              </div>
              <p style={{ 
                color: 'rgba(255,255,255,0.9)', 
                margin: 0,
                fontSize: '0.95rem',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)'
              }}>
                Submit applications, requests, and official documents
              </p>
            </div>
            <div style={{
              fontSize: '2.5rem',
              color: 'rgba(255,255,255,0.8)',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}>
              <FaClipboardList />
            </div>
          </div>
        </div>

        {/* Alumni/Bro Directory Button */}
        <div 
          className="card" 
          style={{ 
            padding: '0',
            cursor: 'pointer',
            overflow: 'hidden',
            position: 'relative',
            background: 'linear-gradient(135deg, #553c9a 0%, #2d3748 100%)',
            border: 'none',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
          }}
          onClick={handleAlumniDirectory}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
          }}
        >
          <div style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Cdefs%3E%3Cpattern id=\'diagonal\' width=\'20\' height=\'20\' patternUnits=\'userSpaceOnUse\'%3E%3Cpath d=\'M 0 20 L 20 0\' fill=\'none\' stroke=\'rgba(255,255,255,0.03)\' stroke-width=\'0.5\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\'100\' height=\'100\' fill=\'url(%23diagonal)\'/%3E%3C/svg%3E")',
            backgroundSize: 'cover',
            padding: '2rem',
            position: 'relative',
            minHeight: '120px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ zIndex: 2 }}>
              <div className="title" style={{ 
                color: 'white', 
                marginBottom: '0.5rem',
                fontSize: '1.5rem',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}>
                Alumni/Bro Directory
              </div>
              <p style={{ 
                color: 'rgba(255,255,255,0.9)', 
                margin: 0,
                fontSize: '0.95rem',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)'
              }}>
                Connect with brothers and alumni network
              </p>
            </div>
            <div style={{
              fontSize: '2.5rem',
              color: 'rgba(255,255,255,0.8)',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}>
              <FaUsers />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}