/**
 * End-to-end API smoke test. Requires the API running on localhost:4000 with freshly
 * seeded data (`npm run seed`). It mutates data, so reseed afterwards for demos.
 *
 *   npm run seed && npm run dev   (in one terminal)
 *   npm test                      (in another)
 */
const BASE = process.env.API_URL ?? 'http://localhost:4000/api';

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, extra?: unknown) {
  if (condition) {
    passed++;
    console.log(`  ✔ ${name}`);
  } else {
    failed++;
    console.log(`  ✘ ${name}`, extra ?? '');
  }
}

class Session {
  cookie = '';
  constructor(public label: string) {}

  async req(method: string, path: string, body?: unknown) {
    const res = await fetch(BASE + path, {
      method,
      headers: { 'content-type': 'application/json', ...(this.cookie ? { cookie: this.cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) this.cookie = setCookie.split(';')[0];
    const text = await res.text();
    let json: any = text;
    try {
      json = JSON.parse(text);
    } catch {
      /* CSV or empty */
    }
    return { status: res.status, body: json, headers: res.headers };
  }

  get = (p: string) => this.req('GET', p);
  post = (p: string, b?: unknown) => this.req('POST', p, b ?? {});
  patch = (p: string, b: unknown) => this.req('PATCH', p, b);
  del = (p: string) => this.req('DELETE', p);
}

async function login(email: string, password: string) {
  const s = new Session(email);
  const r = await s.post('/auth/login', { email, password });
  if (r.status !== 200) throw new Error(`Login failed for ${email}: ${JSON.stringify(r.body)}`);
  return s;
}

const emails = [
  'priya.patel', 'rohan.deshmukh', 'ananya.iyer', 'vikram.singh', 'sneha.kulkarni', 'arjun.nair',
].map((n) => `${n}@sqms.edu`);

async function main() {
  console.log(`\nSQMS API smoke test → ${BASE}\n`);

  console.log('Authentication & authorization');
  const anon = new Session('anon');
  check('rejects wrong password', (await anon.post('/auth/login', { email: 'admin@sqms.edu', password: 'nope' })).status === 401);
  check('rejects invalid email format', (await anon.post('/auth/login', { email: 'not-an-email', password: 'x' })).status === 400);
  check('unauthenticated request → 401', (await anon.get('/meta')).status === 401);

  const admin = await login('admin@sqms.edu', 'Admin@123');
  const staffB = await login('sunita.staff@sqms.edu', 'Staff@123');
  const aarav = await login('aarav.sharma@sqms.edu', 'Student@123');
  const me = await aarav.get('/auth/me');
  check('/auth/me returns the user without password hash', me.status === 200 && !('passwordHash' in me.body.user));
  check('student cannot open admin APIs', (await aarav.get('/admin/overview')).status === 403);
  check('student cannot open staff APIs', (await aarav.get('/staff/activity')).status === 403);
  check('staff cannot generate student tokens', (await staffB.post('/student/tokens', {})).status === 403);
  check('admin cannot use staff queue actions', (await admin.post('/staff/queue/call-next', {})).status === 403);

  const meta = (await aarav.get('/meta')).body;
  const mealId: string = meta.currentMeal.id;
  const counterA = meta.counters.find((c: any) => c.code === 'A');
  const counterB = meta.counters.find((c: any) => c.code === 'B');
  const q = (c: any) => `/staff/queue?counterId=${c.id}&mealId=${mealId}`;

  console.log('\nToken generation');
  check('validation error for missing fields', (await aarav.post('/student/tokens', {})).status === 400);
  const before = (await staffB.get(q(counterB))).body;
  const gen = await aarav.post('/student/tokens', { counterId: counterB.id, mealId });
  check('student generates a token (201)', gen.status === 201, gen.body);
  const myToken = gen.body.token;
  check('position is calculated from the queue', myToken.position === before.counts.WAITING + 1, { position: myToken.position, waiting: before.counts.WAITING });
  check('estimated wait is derived from service time', myToken.estimatedWaitSecs === (myToken.position - 1) * myToken.secsPerToken);
  const dup = await aarav.post('/student/tokens', { counterId: counterB.id, mealId });
  check('duplicate active token is rejected (409)', dup.status === 409);

  console.log('\nConcurrency');
  const students = await Promise.all(emails.map((e) => login(e, 'Student@123')));
  const burst = await Promise.all(students.map((s) => s.post('/student/tokens', { counterId: counterB.id, mealId })));
  const numbers = burst.map((r) => r.body.token?.tokenNumber).filter(Boolean).sort((a: number, b: number) => a - b);
  check('6 simultaneous bookings all succeed', burst.every((r) => r.status === 201), burst.map((r) => r.status));
  check('simultaneous bookings get unique, consecutive numbers', new Set(numbers).size === 6 && numbers[5] - numbers[0] === 5, numbers);
  const spam = await Promise.all(Array.from({ length: 5 }, () => students[0].post('/student/tokens', { counterId: counterA.id, mealId })));
  check('5 parallel duplicate requests → exactly one token', spam.filter((r) => r.status === 201).length === 1, spam.map((r) => r.status));

  console.log('\nStaff queue workflow (Counter B)');
  const call1 = await staffB.post('/staff/queue/call-next', { counterId: counterB.id, mealId });
  check('call next marks the earliest waiting token CALLED', call1.status === 200 && call1.body.nowServing?.tokenNumber === before.tokens.find((t: any) => t.status === 'WAITING')?.tokenNumber, call1.body);
  const calledId = call1.body.nowServing.id;
  check('only one called token per counter (second call → 409)', (await staffB.post('/staff/queue/call-next', { counterId: counterB.id, mealId })).status === 409);
  check('recall works for the called token', (await staffB.post(`/staff/tokens/${calledId}/recall`)).status === 200);
  check('serve called token', (await staffB.post(`/staff/tokens/${calledId}/serve`)).status === 200);
  check('serving again is an invalid transition (409)', (await staffB.post(`/staff/tokens/${calledId}/serve`)).status === 409);
  const waitingTok = (await staffB.get(q(counterB))).body.tokens.find((t: any) => t.status === 'WAITING');
  check('waiting token cannot be marked served directly (409)', (await staffB.post(`/staff/tokens/${waitingTok.id}/serve`)).status === 409);
  check('waiting token cannot be recalled (409)', (await staffB.post(`/staff/tokens/${waitingTok.id}/recall`)).status === 409);
  const call2 = await staffB.post('/staff/queue/call-next', { counterId: counterB.id, mealId });
  check('skip the called token', (await staffB.post(`/staff/tokens/${call2.body.nowServing.id}/skip`)).status === 200);

  const mine = (await aarav.get(`/student/tokens/${myToken.id}`)).body.token;
  check('student position moves up as the queue advances', mine.position === myToken.position - 2, { now: mine.position, was: myToken.position });

  // Advance until aarav is within the approach threshold, then confirm a single alert.
  for (let i = 0; i < 6; i++) {
    const c = await staffB.post('/staff/queue/call-next', { counterId: counterB.id, mealId });
    if (c.status !== 200 || c.body.nowServing.id === myToken.id) break;
    await staffB.post(`/staff/tokens/${c.body.nowServing.id}/serve`);
    const t = (await aarav.get(`/student/tokens/${myToken.id}`)).body.token;
    if (t.tokensAhead <= 1) break;
  }
  const notes = (await aarav.get('/notifications')).body.items.filter((n: any) => n.tokenId === myToken.id);
  const approaching = notes.filter((n: any) => n.type === 'TURN_APPROACHING');
  check('turn-approaching notification sent exactly once', approaching.length === 1, notes.map((n: any) => n.type));

  console.log('\nPause / resume');
  check('pause queue', (await staffB.post(`/staff/counters/${counterB.id}/pause`)).status === 200);
  const blocked = await (await login('kavya.reddy@sqms.edu', 'Student@123')).post('/student/tokens', { counterId: counterB.id, mealId });
  check('token generation blocked while paused (409)', blocked.status === 409);
  check('pausing twice is rejected', (await staffB.post(`/staff/counters/${counterB.id}/pause`)).status === 409);
  check('resume queue', (await staffB.post(`/staff/counters/${counterB.id}/resume`)).status === 200);

  console.log('\nStudent cancellation');
  const s1 = students[1];
  const s1Token = burst[1].body.token;
  const s1Now = (await s1.get(`/student/tokens/${s1Token.id}`)).body.token;
  if (s1Now.status === 'WAITING') {
    check('student cancels a waiting token', (await s1.post(`/student/tokens/${s1Token.id}/cancel`)).status === 200);
    check('cancelling twice is rejected (409)', (await s1.post(`/student/tokens/${s1Token.id}/cancel`)).status === 409);
    check('student can book again after cancelling', (await s1.post('/student/tokens', { counterId: counterB.id, mealId })).status === 201);
  }
  check("student cannot cancel someone else's token", (await aarav.post(`/student/tokens/${burst[2].body.token.id}/cancel`)).status === 404);

  console.log('\nNotifications');
  const list = (await aarav.get('/notifications')).body;
  check('notifications listed with unread count', Array.isArray(list.items) && typeof list.unreadCount === 'number');
  check('mark one read', (await aarav.patch(`/notifications/${list.items[0].id}/read`, {})).status === 200);
  await aarav.post('/notifications/read-all');
  check('mark all read', (await aarav.get('/notifications')).body.unreadCount === 0);

  console.log('\nQueue events');
  const activity = (await staffB.get(`/staff/activity?counterId=${counterB.id}&limit=50`)).body.events;
  const types = new Set(activity.map((e: any) => e.type));
  check('staff actions are recorded in QueueEvent', ['TOKEN_CALLED', 'TOKEN_SERVED', 'TOKEN_SKIPPED', 'TOKEN_RECALLED', 'QUEUE_PAUSED', 'QUEUE_RESUMED'].every((t) => types.has(t)), [...types]);

  console.log('\nAdmin management');
  const ov = await admin.get('/admin/overview');
  check('overview loads with live totals', ov.status === 200 && ov.body.totals.tokensToday > 0);
  const code = String.fromCharCode(67 + Math.floor(Math.random() * 20));
  const nc = await admin.post('/admin/counters', { name: `Counter ${code} · Test`, code, description: 'Smoke test counter' });
  check('create counter', nc.status === 201, nc.body);
  check('duplicate counter code rejected', (await admin.post('/admin/counters', { name: 'Dup', code })).status === 409);
  check('deactivate counter', (await admin.patch(`/admin/counters/${nc.body.counter?.id}`, { isActive: false })).body.counter?.isActive === false);
  const meal = meta.meals[0];
  check('invalid meal timing rejected', (await admin.patch(`/admin/meals/${meal.id}`, { startTime: '10:00', endTime: '09:00' })).status === 400);
  check('update meal timing', (await admin.patch(`/admin/meals/${meal.id}`, { startTime: meal.startTime, endTime: meal.endTime })).status === 200);
  const item = await admin.post('/admin/menu', { name: 'Test Halwa', category: 'DESSERT', isVeg: true, date: meta.today, mealId });
  check('add menu item', item.status === 201);
  const studentMenu = (await aarav.get(`/menu?date=${meta.today}`)).body;
  check('students see the new menu item immediately', studentMenu.meals.some((m: any) => m.items.some((i: any) => i.id === item.body.item.id)));
  check('edit menu item', (await admin.patch(`/admin/menu/${item.body.item.id}`, { name: 'Sooji Halwa' })).body.item?.name === 'Sooji Halwa');
  check('delete menu item', (await admin.del(`/admin/menu/${item.body.item.id}`)).status === 200);
  const email = `test.staff.${Date.now()}@sqms.edu`;
  const st = await admin.post('/admin/staff', { name: 'Test Staff', email, password: 'Password@1', assignedCounterId: counterA.id });
  check('create staff account', st.status === 201 && !('passwordHash' in st.body.user));
  check('weak staff password rejected', (await admin.post('/admin/staff', { name: 'X Y', email: 'x@sqms.edu', password: '123' })).status === 400);
  check('deactivate staff', (await admin.patch(`/admin/staff/${st.body.user.id}`, { isActive: false })).body.user?.isActive === false);
  check('deactivated staff cannot log in', (await new Session('x').post('/auth/login', { email, password: 'Password@1' })).status === 401);

  console.log('\nReports');
  const from = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
  const rep = await admin.get(`/admin/reports?from=${from}&to=${meta.today}`);
  check('report returns daily, counter and meal breakdowns', rep.status === 200 && rep.body.daily.length >= 7 && rep.body.counters.length >= 2 && rep.body.meals.length === 4);
  check('invalid date range rejected', (await admin.get(`/admin/reports?from=${meta.today}&to=${from}`)).status === 400);
  const csv = await admin.get(`/admin/reports/export?from=${from}&to=${meta.today}&type=summary`);
  check('summary CSV export', csv.status === 200 && String(csv.headers.get('content-type')).includes('text/csv') && String(csv.body).includes('Counter'));
  const csv2 = await admin.get(`/admin/reports/export?from=${from}&to=${meta.today}&type=tokens`);
  check('token-level CSV export', csv2.status === 200 && String(csv2.body).split('\n').length > 10);

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
