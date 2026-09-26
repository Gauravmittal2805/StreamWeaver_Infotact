import React from 'react';
import TransformationPreview from './TransformationPreview';

/**
 * MappingPreview component - Delegates to TransformationPreview for backwards compatibility
 * while supporting all advanced Before/After transformation preview capabilities.
 */
export function MappingPreview(props) {
  return <TransformationPreview {...props} />;
}

export default MappingPreview;
