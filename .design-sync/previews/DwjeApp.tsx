import './_rnw';
import React from 'react';
import { DwjeApp } from 'dwje-ax-web';

/** /ai/chat */
export const Home = () => (
  <div style={{ width: 1440, height: 900 }}>
    <DwjeApp initialPath="/ai/chat" height={900} />
  </div>
);

/** /dashboard/ai */
export const DashboardAi = () => (
  <div style={{ width: 1440, height: 900 }}>
    <DwjeApp initialPath="/dashboard/ai" height={900} />
  </div>
);

/** /dashboard/process */
export const DashboardProcess = () => (
  <div style={{ width: 1440, height: 900 }}>
    <DwjeApp initialPath="/dashboard/process" height={900} />
  </div>
);

/** /production/result */
export const ProductionResult = () => (
  <div style={{ width: 1440, height: 900 }}>
    <DwjeApp initialPath="/production/result" height={900} />
  </div>
);

/** /quality/defect */
export const QualityDefect = () => (
  <div style={{ width: 1440, height: 900 }}>
    <DwjeApp initialPath="/quality/defect" height={900} />
  </div>
);

/** /menu/report */
export const ReportPicker = () => (
  <div style={{ width: 1440, height: 900 }}>
    <DwjeApp initialPath="/menu/report" height={900} />
  </div>
);

/** /system/account */
export const SystemAccount = () => (
  <div style={{ width: 1440, height: 900 }}>
    <DwjeApp initialPath="/system/account" height={900} />
  </div>
);
