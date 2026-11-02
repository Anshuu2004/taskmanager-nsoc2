import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getTodayDate,
  isValidDateKey,
  isValidTask,
  isOverdue,
  clearInvalidDueDate,
  groupTasksByMonth
} from './src/utils/taskUtils.js';
import { validateTaskRecord, parseAndValidateJSON, parseAndValidateCSV } from './src/utils/exportImportUtils.js';

// Zones with different offsets and DST rules. Node picks up a changed
// process.env.TZ at runtime, so one `npm test` run covers all of them.
const ZONES = ['UTC', 'America/Los_Angeles', 'Pacific/Auckland', 'Asia/Kolkata', 'Pacific/Kiritimati'];

function inZone(zone, fn) {
  const previous = process.env.TZ;
  process.env.TZ = zone;
  try {
    fn();
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
}

function eachZone(fn) {
  for (const zone of ZONES) {
    inZone(zone, () => fn(zone));
  }
}

function makeTask(overrides = {}) {
  return { text: 'Task', dueDate: '2026-10-30', priority: 'medium', completed: false, completedAt: null, ...overrides };
}

const key = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

test('isValidDateKey accepts real dates including month ends', () => {
  for (const value of ['2026-01-31', '2026-04-30', '2026-12-31', '2026-02-28', '2026-10-25', '0001-01-01']) {
    assert.equal(isValidDateKey(value), true, value);
  }
});

test('isValidDateKey handles 29 Feb in leap and non-leap years', () => {
  assert.equal(isValidDateKey('2024-02-29'), true);
  assert.equal(isValidDateKey('2028-02-29'), true);
  assert.equal(isValidDateKey('2000-02-29'), true, '2000 is divisible by 400');
  assert.equal(isValidDateKey('2026-02-29'), false);
  assert.equal(isValidDateKey('2025-02-29'), false);
  assert.equal(isValidDateKey('1900-02-29'), false, '1900 is divisible by 100 but not 400');
  assert.equal(isValidDateKey('2100-02-29'), false);
  assert.equal(isValidDateKey('2024-02-30'), false);
});

test('isValidDateKey rejects day 31 in 30-day months and other impossible dates', () => {
  for (const value of ['2026-04-31', '2026-06-31', '2026-09-31', '2026-11-31', '2026-02-30', '2026-00-10', '2026-13-01', '2026-01-00', '2026-01-32', '0000-01-01']) {
    assert.equal(isValidDateKey(value), false, value);
  }
});

test('isValidDateKey rejects values that are not exactly YYYY-MM-DD', () => {
  for (const value of ['', 'abc', '2026-2-3', '26-02-03', '2026/02/03', '02-03-2026', ' 2026-02-03', '2026-02-03 ', '2026-02-03T10:00', '2026-02-03T00:00:00Z', '20260203', null, undefined, 20260203, {}, []]) {
    assert.equal(isValidDateKey(value), false, String(value));
  }
});

test('getTodayDate uses the local calendar day around midnight in every zone', () => {
  eachZone(zone => {
    assert.equal(getTodayDate(new Date(2026, 9, 25, 0, 0, 0)), '2026-10-25', `${zone} start of day`);
    assert.equal(getTodayDate(new Date(2026, 9, 25, 0, 0, 1)), '2026-10-25', `${zone} just after midnight`);
    assert.equal(getTodayDate(new Date(2026, 9, 25, 23, 59, 59)), '2026-10-25', `${zone} end of day`);
  });
});

test('a task due today is never overdue and a task due yesterday always is, in every zone', () => {
  eachZone(zone => {
    const dueToday = makeTask({ dueDate: '2026-10-25' });
    const dueYesterday = makeTask({ dueDate: '2026-10-24' });
    for (const [h, mi, s] of [[0, 0, 0], [0, 0, 1], [12, 0, 0], [23, 59, 59]]) {
      const today = getTodayDate(new Date(2026, 9, 25, h, mi, s));
      assert.equal(isOverdue(dueToday, today), false, `${zone} ${h}:${mi}:${s} due today`);
      assert.equal(isOverdue(dueYesterday, today), true, `${zone} ${h}:${mi}:${s} due yesterday`);
    }
  });
});

test('isOverdue with the real clock follows the local day in every zone', () => {
  eachZone(zone => {
    const today = getTodayDate();
    assert.equal(isOverdue(makeTask({ dueDate: today })), false, zone);
    assert.equal(isOverdue(makeTask({ dueDate: '2000-01-01' })), true, zone);
  });
});

test('isOverdue ignores completed tasks, empty dates and unusable dates', () => {
  assert.equal(isOverdue(makeTask({ dueDate: '2026-10-01', completed: true }), '2026-10-25'), false);
  assert.equal(isOverdue(makeTask({ dueDate: '' }), '2026-10-25'), false);
  assert.equal(isOverdue(makeTask({ dueDate: 'abc' }), '2026-10-25'), false);
  // As plain strings these sort before today, which used to make them overdue.
  assert.equal(isOverdue(makeTask({ dueDate: '2026-2-3' }), '2026-10-25'), false);
  assert.equal(isOverdue(makeTask({ dueDate: '2026-02-30' }), '2026-10-25'), false);
});

test('isOverdue across month end, year end and leap day', () => {
  assert.equal(isOverdue(makeTask({ dueDate: '2026-01-31' }), '2026-02-01'), true);
  assert.equal(isOverdue(makeTask({ dueDate: '2026-01-31' }), '2026-01-31'), false);
  assert.equal(isOverdue(makeTask({ dueDate: '2025-12-31' }), '2026-01-01'), true);
  assert.equal(isOverdue(makeTask({ dueDate: '2024-02-29' }), '2024-02-29'), false);
  assert.equal(isOverdue(makeTask({ dueDate: '2024-02-29' }), '2024-03-01'), true);
  assert.equal(isOverdue(makeTask({ dueDate: '2026-02-28' }), '2026-03-01'), true);
  assert.equal(isOverdue(makeTask({ dueDate: '2028-02-28' }), '2028-02-29'), true);
});

test('every calendar day (2023 to 2029) round trips through getTodayDate in every zone, DST days included', () => {
  eachZone(zone => {
    for (let y = 2023; y <= 2029; y++) {
      for (let m = 1; m <= 12; m++) {
        const lastDay = new Date(y, m, 0).getDate();
        for (let d = 1; d <= lastDay; d++) {
          const expected = key(y, m, d);
          assert.equal(isValidDateKey(expected), true, expected);
          // 00:30 and 23:30 stay on the same day even when the clock jumps.
          assert.equal(getTodayDate(new Date(y, m - 1, d, 0, 30)), expected, `${zone} ${expected} 00:30`);
          assert.equal(getTodayDate(new Date(y, m - 1, d, 23, 30)), expected, `${zone} ${expected} 23:30`);
        }
        assert.equal(isValidDateKey(key(y, m, lastDay + 1)), false, key(y, m, lastDay + 1));
      }
    }
  });
});

test('DST change days: spring forward and fall back keep the overdue boundary on the calendar day', () => {
  // US: 2026-03-08 (23 hour day) and 2026-11-01 (25 hour day). NZ: 2026-09-27 and 2027-04-04.
  const cases = [
    ['America/Los_Angeles', '2026-03-08', [2026, 3, 8]],
    ['America/Los_Angeles', '2026-11-01', [2026, 11, 1]],
    ['Pacific/Auckland', '2026-09-27', [2026, 9, 27]],
    ['Pacific/Auckland', '2027-04-04', [2027, 4, 4]]
  ];
  for (const [zone, dayKey, [y, m, d]] of cases) {
    inZone(zone, () => {
      const dueThatDay = makeTask({ dueDate: dayKey });
      for (const hour of [0, 1, 3, 12, 23]) {
        const today = getTodayDate(new Date(y, m - 1, d, hour, 15));
        assert.equal(today, dayKey, `${zone} ${dayKey} ${hour}:15`);
        assert.equal(isOverdue(dueThatDay, today), false, `${zone} ${dayKey} ${hour}:15`);
      }
      const nextDay = getTodayDate(new Date(y, m - 1, d + 1, 0, 15));
      assert.equal(isOverdue(dueThatDay, nextDay), true, `${zone} day after ${dayKey}`);
    });
  }
});

// Expected label made without the code under test: noon UTC with timeZone UTC.
function expectedMonthLabel(y, m) {
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

test('groupTasksByMonth puts first and last day of a month in the right group in every zone', () => {
  eachZone(zone => {
    const tasks = [
      makeTask({ text: 'a', dueDate: '2026-03-01' }),
      makeTask({ text: 'b', dueDate: '2026-02-28' }),
      makeTask({ text: 'c', dueDate: '2026-01-31' }),
      makeTask({ text: 'd', dueDate: '2026-02-01' }),
      makeTask({ text: 'e', dueDate: '2028-02-29' }),
      makeTask({ text: 'f', dueDate: '2027-12-31' })
    ];
    const groups = groupTasksByMonth(tasks);
    assert.deepEqual(groups.map(g => g.monthLabel), [
      expectedMonthLabel(2026, 1),
      expectedMonthLabel(2026, 2),
      expectedMonthLabel(2026, 3),
      expectedMonthLabel(2027, 12),
      expectedMonthLabel(2028, 2)
    ], zone);
    assert.deepEqual(groups.map(g => g.tasks.map(t => t.text)), [['c'], ['b', 'd'], ['a'], ['f'], ['e']], zone);
  });
});

test('groupTasksByMonth never produces an Invalid Date label', () => {
  const tasks = [
    makeTask({ text: 'ok', dueDate: '2026-10-30' }),
    makeTask({ text: 'abc', dueDate: 'abc' }),
    makeTask({ text: 'short', dueDate: '2026-2-3' }),
    makeTask({ text: 'feb30', dueDate: '2026-02-30' }),
    makeTask({ text: 'none', dueDate: '' })
  ];
  const groups = groupTasksByMonth(tasks);
  assert.deepEqual(groups.map(g => g.monthLabel), [expectedMonthLabel(2026, 10), 'No due date']);
  assert.deepEqual(groups[1].tasks.map(t => t.text).sort(), ['abc', 'feb30', 'none', 'short']);
  for (const group of groups) assert.ok(!group.monthLabel.includes('Invalid'), group.monthLabel);
});

test('isValidTask accepts empty and real dates, rejects impossible ones', () => {
  assert.equal(isValidTask(makeTask({ dueDate: '' })), true);
  assert.equal(isValidTask(makeTask({ dueDate: '2024-02-29' })), true);
  assert.equal(isValidTask(makeTask({ dueDate: '2026-02-30' })), false);
  assert.equal(isValidTask(makeTask({ dueDate: 'abc' })), false);
  assert.equal(isValidTask(makeTask({ dueDate: '2026-2-3' })), false);
  assert.equal(isValidTask(makeTask({ dueDate: null })), false);
});

test('clearInvalidDueDate blanks only the bad date and keeps the task', () => {
  const bad = makeTask({ text: 'keep me', dueDate: '2026-02-30' });
  assert.deepEqual(clearInvalidDueDate(bad), { ...bad, dueDate: '' });
  assert.equal(isValidTask(clearInvalidDueDate(bad)), true);

  const good = makeTask({ dueDate: '2026-10-30' });
  assert.equal(clearInvalidDueDate(good), good);
  const empty = makeTask({ dueDate: '' });
  assert.equal(clearInvalidDueDate(empty), empty);

  // Other problems are not hidden: a missing text still fails isValidTask.
  assert.equal(isValidTask(clearInvalidDueDate(makeTask({ text: '', dueDate: 'abc' }))), false);
  // Non-objects and non-string dates pass through untouched.
  assert.equal(clearInvalidDueDate(null), null);
  assert.deepEqual(clearInvalidDueDate({ dueDate: 5 }), { dueDate: 5 });
});

test('validateTaskRecord rejects impossible due dates with a clear message', () => {
  const ok = validateTaskRecord(makeTask({ dueDate: '2024-02-29' }), 0);
  assert.equal(ok.valid, true);
  assert.equal(validateTaskRecord(makeTask({ dueDate: '' }), 0).valid, true);
  assert.equal(validateTaskRecord(makeTask({ dueDate: '  2026-10-30  ' }), 0).valid, true);

  const bad = validateTaskRecord(makeTask({ dueDate: '2026-02-30' }), 2);
  assert.equal(bad.valid, false);
  assert.match(bad.error, /Task #3/);
  assert.match(bad.error, /dueDate/);
  assert.match(bad.error, /2026-02-30/);
  assert.match(bad.error, /YYYY-MM-DD/);

  for (const dueDate of ['abc', '2026-2-3', '2026-13-01', '2026-02-29', '03/02/2026']) {
    assert.equal(validateTaskRecord(makeTask({ dueDate }), 0).valid, false, dueDate);
  }
});

test('JSON import rejects the whole file when one task has an impossible date', () => {
  const rows = [makeTask({ text: 'fine', dueDate: '2026-10-30' }), makeTask({ text: 'broken', dueDate: '2026-02-30' })];
  const result = parseAndValidateJSON(JSON.stringify(rows));
  assert.equal(result.success, false);
  assert.match(result.error, /Task #2/);
  assert.match(result.error, /2026-02-30/);

  const good = parseAndValidateJSON(JSON.stringify([makeTask({ dueDate: '2028-02-29' }), makeTask({ dueDate: '' })]));
  assert.equal(good.success, true);
  assert.deepEqual(good.tasks.map(t => t.dueDate), ['2028-02-29', '']);
});

test('CSV import rejects an impossible date and accepts a leap day', () => {
  const header = 'text,dueDate,priority,completed,completedAt';
  const bad = parseAndValidateCSV(`${header}\r\n"A","2026-02-29","high",false,""`);
  assert.equal(bad.success, false);
  assert.match(bad.error, /Task #1/);
  assert.match(bad.error, /2026-02-29/);

  const leap = parseAndValidateCSV(`${header}\r\n"A","2028-02-29","high",false,""\r\n"B","","low",false,""`);
  assert.equal(leap.success, true);
  assert.deepEqual(leap.tasks.map(t => t.dueDate), ['2028-02-29', '']);
});
