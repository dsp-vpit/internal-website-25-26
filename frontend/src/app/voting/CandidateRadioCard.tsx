'use client';

import React from 'react';

interface CandidateRadioCardProps {
  candidate: {
    id: string;
    name: string;
    image_url?: string;
    resume_url?: string;
    classification?: string;
  };
  position: string;
  selected: boolean;
  disabled: boolean;
  hasVoted: boolean;
  onSelect: () => void;
}

export default function CandidateRadioCard({
  candidate,
  position,
  selected,
  disabled,
  hasVoted,
  onSelect
}: CandidateRadioCardProps) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '1rem',
        padding: '1.25rem',
        border: `2px solid ${selected ? 'var(--brand)' : 'var(--border)'}`,
        borderRadius: '12px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        backgroundColor: selected ? 'var(--surface)' : 'transparent',
        opacity: disabled ? 0.6 : 1,
        transition: 'all 0.2s ease',
        position: 'relative'
      }}
    >
      <input
        type="radio"
        name={`position-${position}`}
        value={candidate.id}
        checked={selected}
        disabled={disabled}
        onChange={onSelect}
        style={{
          marginTop: '0.25rem',
          cursor: disabled ? 'not-allowed' : 'pointer',
          width: '20px',
          height: '20px',
          flexShrink: 0
        }}
      />
      
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          {/* Candidate Image */}
          {candidate.image_url && (
            <img
              src={candidate.image_url}
              alt={`${candidate.name} photo`}
              style={{
                width: '80px',
                height: '80px',
                objectFit: 'cover',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                flexShrink: 0
              }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          )}
          
          {/* Candidate Info */}
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ 
              fontWeight: '600', 
              fontSize: '1.1rem',
              marginBottom: '0.25rem',
              color: selected ? 'var(--brand)' : 'var(--text)'
            }}>
              {candidate.name}
            </div>
            {candidate.classification && (
              <div style={{ 
                color: 'var(--muted)', 
                fontSize: '0.9rem',
                marginBottom: '0.5rem'
              }}>
                {candidate.classification}
              </div>
            )}
            {candidate.resume_url && (
              <a
                href={candidate.resume_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{
                  color: 'var(--brand)',
                  fontSize: '0.9rem',
                  textDecoration: 'none'
                }}
              >
                View Resume →
              </a>
            )}
          </div>
        </div>
      </div>
      
      {/* Selected indicator */}
      {selected && !disabled && (
        <div style={{
          position: 'absolute',
          top: '0.5rem',
          right: '0.5rem',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: 'var(--brand)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '0.875rem',
          fontWeight: 'bold'
        }}>
          ✓
        </div>
      )}
      
      {/* Voted indicator */}
      {hasVoted && !selected && (
        <div style={{
          position: 'absolute',
          top: '0.5rem',
          right: '0.5rem',
          padding: '0.25rem 0.5rem',
          borderRadius: '4px',
          backgroundColor: 'var(--muted)',
          color: 'white',
          fontSize: '0.75rem',
          fontWeight: '600'
        }}>
          Voted
        </div>
      )}
    </label>
  );
}

