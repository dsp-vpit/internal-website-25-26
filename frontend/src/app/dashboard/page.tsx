'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '../context/UserContext';
import { 
  FaFolder, 
  FaGraduationCap, 
  FaChartBar, 
  FaClipboardList, 
  FaUsers,
  FaChevronDown,
  FaChevronRight
} from 'react-icons/fa';

export default function DashboardPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [professionalResourcesExpanded, setProfessionalResourcesExpanded] = useState(false);
  const [alumniDirectoryExpanded, setAlumniDirectoryExpanded] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth');
    }
  }, [user, loading, router]);

  const handleIndustryGuides = () => {
    window.open('https://drive.google.com/drive/folders/1JbfALp53yAfbDxGMSH63SpeT66W6R2Lx?usp=sharing', '_blank');
  };

  const handleResumeCoverLetter = () => {
    window.open('https://drive.google.com/drive/folders/1ReIcCGd6vwpk8sMyMRS9XTdt5YRiLdS3?usp=sharing', '_blank');
  };

  const handleScholarshipTracker = () => {
    window.open('https://docs.google.com/spreadsheets/d/1xh6kzs2-PGQAGn3V6_BRV8XULJZ_aVII_zInYIEFcGo/edit?usp=drivesdk', '_blank');
  };

  const handleBroMeetingSlides = () => {
    window.open('https://drive.google.com/drive/folders/1R22F5zA0XOfYdatVlF_scsHHXJSrNhXp?usp=sharing', '_blank');
  };

  const handleMemberForms = () => {
    window.open('https://your-member-forms-url.com', '_blank');
  };

  const handleActiveBrotherDirectory = () => {
    window.open('https://docs.google.com/spreadsheets/d/1avwtgU98HSyuAivtc6PgnYH6dTAxJBB-RKPI_3S6pDM/edit?usp=sharing', '_blank');
  };

  const handleAlumniDirectory = () => {
    window.open('https://docs.google.com/spreadsheets/d/1zQea__f9y5-PuLp4a617uEvHrGu3fXYT0x7e--U9nB4/edit?usp=sharing', '_blank');
  };

  if (loading || !user) return null;

  return (
    <div className="stack-l">
      <div className="card" style={{ padding: '1.5rem' }}>
        <h1 className="title" style={{ marginBottom: '0.75rem' }}>
          Welcome, {user.name || user.email}!
        </h1>
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
      
      {user.is_approved && (
        <div className="stack-m" style={{ gap: '1.5rem' }}>
          {/* Professional Resources Dropdown */}
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div 
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
              onClick={() => setProfessionalResourcesExpanded(!professionalResourcesExpanded)}
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  fontSize: '2.5rem',
                  color: 'rgba(255,255,255,0.8)',
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                }}>
                  <FaFolder />
                  {professionalResourcesExpanded ? <FaChevronDown /> : <FaChevronRight />}
                </div>
              </div>
            </div>
            
            {/* Professional Resources Dropdown Content */}
            {professionalResourcesExpanded && (
              <div style={{
                background: 'var(--bg-elev)',
                borderTop: '1px solid var(--border)',
                padding: '1rem'
              }}>
                <div className="stack-s" style={{ gap: '0.75rem' }}>
                  <div 
                    className="card" 
                    style={{ 
                      padding: '1rem',
                      cursor: 'pointer',
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={handleIndustryGuides}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-elev)';
                      e.currentTarget.style.borderColor = 'var(--accent)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg)';
                      e.currentTarget.style.borderColor = 'var(--border)';
                    }}
                  >
                    <div className="title" style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>
                      Industry Guides
                    </div>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--muted)' }}>
                      Consulting, Investment Banking, Marketing, and more
                    </p>
                  </div>
                  
                  <div 
                    className="card" 
                    style={{ 
                      padding: '1rem',
                      cursor: 'pointer',
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={handleResumeCoverLetter}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-elev)';
                      e.currentTarget.style.borderColor = 'var(--accent)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg)';
                      e.currentTarget.style.borderColor = 'var(--border)';
                    }}
                  >
                    <div className="title" style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>
                      Resume & Cover Letter
                    </div>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--muted)' }}>
                      Templates, tips, and examples for job applications
                    </p>
                  </div>
                </div>
              </div>
            )}
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

          {/* Member Forms Button - Coming Soon */}
          <div 
            className="card" 
            style={{ 
              padding: '0',
              cursor: 'not-allowed',
              overflow: 'hidden',
              position: 'relative',
              background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
              border: 'none',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
              opacity: 0.7
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
                <div style={{
                  marginTop: '0.75rem',
                  padding: '0.25rem 0.75rem',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '20px',
                  display: 'inline-block',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  color: 'white',
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.3)'
                }}>
                  Coming Soon
                </div>
              </div>
              <div style={{
                fontSize: '2.5rem',
                color: 'rgba(255,255,255,0.6)',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}>
                <FaClipboardList />
              </div>
            </div>
          </div>

          {/* Alumni/Bro Directory Dropdown */}
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div 
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
              onClick={() => setAlumniDirectoryExpanded(!alumniDirectoryExpanded)}
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  fontSize: '2.5rem',
                  color: 'rgba(255,255,255,0.8)',
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                }}>
                  <FaUsers />
                  {alumniDirectoryExpanded ? <FaChevronDown /> : <FaChevronRight />}
                </div>
              </div>
            </div>
            
            {/* Alumni/Bro Directory Dropdown Content */}
            {alumniDirectoryExpanded && (
              <div style={{
                background: 'var(--bg-elev)',
                borderTop: '1px solid var(--border)',
                padding: '1rem'
              }}>
                <div className="stack-s" style={{ gap: '0.75rem' }}>
                  <div 
                    className="card" 
                    style={{ 
                      padding: '1rem',
                      cursor: 'pointer',
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={handleActiveBrotherDirectory}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-elev)';
                      e.currentTarget.style.borderColor = 'var(--accent)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg)';
                      e.currentTarget.style.borderColor = 'var(--border)';
                    }}
                  >
                    <div className="title" style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>
                      Active Brother Directory
                    </div>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--muted)' }}>
                      Current active brothers contact information and details
                    </p>
                  </div>
                  
                  <div 
                    className="card" 
                    style={{ 
                      padding: '1rem',
                      cursor: 'pointer',
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={handleAlumniDirectory}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-elev)';
                      e.currentTarget.style.borderColor = 'var(--accent)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg)';
                      e.currentTarget.style.borderColor = 'var(--border)';
                    }}
                  >
                    <div className="title" style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>
                      Alumni Directory
                    </div>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--muted)' }}>
                      Alumni brothers contact information and professional details
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}