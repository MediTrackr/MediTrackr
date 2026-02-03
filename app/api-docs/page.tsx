'use client';

import { useEffect, useState } from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

export default function ApiDocsPage() {
  const [spec, setSpec] = useState(null);

  useEffect(() => {
    fetch('/api/api-docs')
      .then((r) => r.json())
      .then(setSpec);
  }, []);

  if (!spec) return <div style={{ padding: 40, color: '#fff' }}>Loading API docs…</div>;

  return <SwaggerUI spec={spec} />;
}
