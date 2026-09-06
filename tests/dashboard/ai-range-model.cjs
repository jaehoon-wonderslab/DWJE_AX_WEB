const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const source = fs.readFileSync('src/domains/dashboard/model/aiDashboardFilterModel.js', 'utf8');
  const { rangeError, bucketLabel, hourlySlot } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  assert.ok(rangeError('2026-02-30', '2026-03-01'));
  assert.ok(rangeError('2026-09-04', '2026-09-01'));
  assert.ok(rangeError('2026-01-01', '2026-04-04'));
  assert.equal(rangeError('2026-01-01', '2026-04-03'), '');
  assert.equal(rangeError('', '2026-09-04').length > 0, true);
  assert.equal(bucketLabel({ unit: 'DAY', intervalHour: 24 }), '일');
  assert.equal(bucketLabel({ unit: 'HOUR', intervalHour: 2 }), '2시간');
  assert.deepEqual(hourlySlot('00:00', { from: '2026-09-04' }), { date: '2026-09-04', label: '00시' });
  assert.deepEqual(hourlySlot('09-04 02시'), { date: '09-04', label: '02시' });
  assert.equal(hourlySlot('09-04'), null);
  console.log('PASS: range validation, actual bucket labels, single-day and multi-day hourly slots');
})();
