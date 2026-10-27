import React, { lazy, Suspense } from 'react';
import StudentApp from './student/StudentApp.jsx';

const DemoConsole = lazy(() => import('./DemoConsole.jsx'));

export default function App() {
  if (window.location.pathname.replace(/\/$/, '') === '/demo') {
    return <Suspense fallback={<p className="console-loading">Demo konsolu açılıyor…</p>}><DemoConsole /></Suspense>;
  }
  return <StudentApp />;
}
