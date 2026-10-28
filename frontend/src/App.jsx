import React, { lazy, Suspense } from 'react';
import StudentApp from './student/StudentApp.jsx';

const DemoConsole = lazy(() => import('./DemoConsole.jsx'));
const OperationsApp = lazy(() => import('./operations/OperationsApp.jsx'));

export default function App() {
  const path = window.location.pathname.replace(/\/$/, '');
  if (['/operator', '/guard'].includes(path)) {
    return <Suspense fallback={<p className="console-loading">Kovan ekranı açılıyor…</p>}><OperationsApp role={path === '/operator' ? 'dispatcher' : 'guard'} /></Suspense>;
  }
  if (path === '/demo') {
    return <Suspense fallback={<p className="console-loading">Demo konsolu açılıyor…</p>}><DemoConsole /></Suspense>;
  }
  return <StudentApp />;
}
