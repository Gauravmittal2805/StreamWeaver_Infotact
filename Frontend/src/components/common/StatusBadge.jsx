import React from 'react';
import Badge from '../ui/Badge';

/**
 * Maps dataset and ETL job statuses to styled badges
 */
export function StatusBadge({ status, size = 'md' }) {
  const normalized = (status || '').toLowerCase();

  switch (normalized) {
    case 'uploaded':
    case 'completed':
    case 'ready':
    case 'active':
    case 'success':
      return <Badge variant="success" size={size} dot>{status || 'Ready'}</Badge>;
    case 'uploading':
    case 'processing':
    case 'running':
    case 'in_progress':
      return <Badge variant="info" size={size} dot>{status || 'Processing'}</Badge>;
    case 'pending':
    case 'queued':
    case 'paused':
      return <Badge variant="warning" size={size} dot>{status || 'Pending'}</Badge>;
    case 'failed':
    case 'error':
      return <Badge variant="error" size={size} dot>{status || 'Failed'}</Badge>;
    default:
      return <Badge variant="default" size={size}>{status || 'Unknown'}</Badge>;
  }
}

export default StatusBadge;
