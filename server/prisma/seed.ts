/**
 * Seeds SQMS with realistic demo data:
 * - 1 admin, 2 staff, 20 students
 * - 2 counters, 4 meal sessions, rotating menus (past week → day after tomorrow)
 * - a week of token history plus a live queue for the current meal
 *
 * Run with: npm run seed   (resets the database first)
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const pad = (n: number) => String(n).padStart(2, '0');
const dateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));

// Deterministic PRNG so every seed produces the same, believable dataset.
let state = 20261030;
const rand = () => ((state = (state * 1664525 + 1013904223) % 4294967296) / 4294967296);
const between = (min: number, max: number) => Math.floor(min + rand() * (max - min + 1));
const shuffle = <T,>(arr: T[]) => [...arr].sort(() => rand() - 0.5);

const STUDENTS: [string, string, string][] = [
  ['Aarav Sharma', 'CS2023001', 'Hostel A'],
  ['Priya Patel', 'CS2023014', 'Hostel B'],
  ['Rohan Deshmukh', 'ME2023022', 'Hostel A'],
  ['Ananya Iyer', 'EC2023008', 'Hostel B'],
  ['Vikram Singh', 'CE2023031', 'Hostel C'],
  ['Sneha Kulkarni', 'IT2023017', 'Hostel B'],
  ['Arjun Nair', 'CS2023042', 'Hostel A'],
  ['Kavya Reddy', 'EC2023025', 'Hostel B'],
  ['Aditya Joshi', 'ME2023009', 'Hostel C'],
  ['Isha Gupta', 'IT2023033', 'Hostel B'],
  ['Karan Mehta', 'CS2023056', 'Hostel A'],
  ['Neha Verma', 'CE2023012', 'Hostel B'],
  ['Siddharth Rao', 'EE2023019', 'Hostel C'],
  ['Pooja Mishra', 'EE2023027', 'Hostel B'],
  ['Rahul Chauhan', 'ME2023040', 'Hostel A'],
  ['Meera Pillai', 'IT2023005', 'Hostel B'],
  ['Yash Agarwal', 'CS2023063', 'Hostel C'],
  ['Tanvi Bhosale', 'EC2023036', 'Hostel B'],
  ['Omkar Patil', 'CE2023044', 'Hostel A'],
  ['Riya Kapoor', 'EE2023051', 'Hostel B'],
];

const emailOf = (name: string) => name.toLowerCase().replace(/\s+/g, '.') + '@sqms.edu';

type Item = [name: string, category: string, isVeg: boolean, description?: string];

const MENU_POOL: Record<string, Item[][]> = {
  BREAKFAST: [
    [['Poha', 'MAIN', true, 'Flattened rice with peanuts and curry leaves'], ['Boiled Eggs', 'SIDE', false], ['Banana', 'SIDE', true], ['Masala Chai', 'BEVERAGE', true]],
    [['Idli Sambar', 'MAIN', true, 'Steamed rice cakes with lentil sambar'], ['Coconut Chutney', 'SIDE', true], ['Filter Coffee', 'BEVERAGE', true]],
    [['Aloo Paratha', 'BREAD', true, 'Stuffed with spiced potato, served with curd'], ['Pickle & Curd', 'SIDE', true], ['Masala Chai', 'BEVERAGE', true]],
    [['Upma', 'MAIN', true, 'Semolina with vegetables'], ['Bread Omelette', 'MAIN', false], ['Cold Milk', 'BEVERAGE', true]],
    [['Masala Dosa', 'MAIN', true], ['Sambar', 'SIDE', true], ['Tomato Chutney', 'SIDE', true], ['Filter Coffee', 'BEVERAGE', true]],
  ],
  LUNCH: [
    [['Dal Tadka', 'MAIN', true], ['Paneer Butter Masala', 'MAIN', true], ['Jeera Rice', 'RICE', true], ['Butter Roti', 'BREAD', true], ['Green Salad', 'SIDE', true], ['Gulab Jamun', 'DESSERT', true]],
    [['Rajma Masala', 'MAIN', true], ['Chicken Curry', 'MAIN', false], ['Steamed Rice', 'RICE', true], ['Chapati', 'BREAD', true], ['Boondi Raita', 'SIDE', true]],
    [['Chole', 'MAIN', true], ['Aloo Gobi', 'MAIN', true], ['Veg Pulao', 'RICE', true], ['Tandoori Roti', 'BREAD', true], ['Buttermilk', 'BEVERAGE', true]],
    [['Sambar', 'MAIN', true], ['Bhindi Fry', 'MAIN', true], ['Curd Rice', 'RICE', true], ['Chapati', 'BREAD', true], ['Papad', 'SIDE', true], ['Kheer', 'DESSERT', true]],
    [['Dal Makhani', 'MAIN', true], ['Egg Curry', 'MAIN', false], ['Steamed Rice', 'RICE', true], ['Butter Naan', 'BREAD', true], ['Onion Salad', 'SIDE', true]],
  ],
  SNACKS: [
    [['Samosa', 'MAIN', true, 'With mint and tamarind chutney'], ['Masala Chai', 'BEVERAGE', true]],
    [['Vada Pav', 'MAIN', true], ['Fried Green Chilli', 'SIDE', true], ['Cutting Chai', 'BEVERAGE', true]],
    [['Veg Sandwich', 'MAIN', true], ['Cold Coffee', 'BEVERAGE', true]],
    [['Pav Bhaji', 'MAIN', true], ['Lemon Soda', 'BEVERAGE', true]],
    [['Kanda Bhaji', 'MAIN', true], ['Masala Chai', 'BEVERAGE', true]],
  ],
  DINNER: [
    [['Mix Veg Curry', 'MAIN', true], ['Dal Fry', 'MAIN', true], ['Steamed Rice', 'RICE', true], ['Chapati', 'BREAD', true], ['Fruit Custard', 'DESSERT', true]],
    [['Veg Biryani', 'RICE', true], ['Chicken Biryani', 'RICE', false], ['Mirchi Salan', 'SIDE', true], ['Raita', 'SIDE', true]],
    [['Palak Paneer', 'MAIN', true], ['Dal Tadka', 'MAIN', true], ['Jeera Rice', 'RICE', true], ['Phulka', 'BREAD', true], ['Rasgulla', 'DESSERT', true]],
    [['Kadhi Pakoda', 'MAIN', true], ['Aloo Matar', 'MAIN', true], ['Steamed Rice', 'RICE', true], ['Chapati', 'BREAD', true]],
    [['Matar Paneer', 'MAIN', true], ['Fish Curry', 'MAIN', false], ['Steamed Rice', 'RICE', true], ['Chapati', 'BREAD', true], ['Shrikhand', 'DESSERT', true]],
  ],
};

async function main() {
  console.log('Seeding SQMS demo data…');
  // Clear existing rows (children first) so the seed can run while the API is up.
  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.queueEvent.deleteMany(),
    prisma.token.deleteMany(),
    prisma.menuItem.deleteMany(),
    prisma.user.deleteMany(),
    prisma.meal.deleteMany(),
    prisma.counter.deleteMany(),
    prisma.messService.deleteMany(),
  ]);
  const [adminHash, staffHash, studentHash] = await Promise.all([
    bcrypt.hash('Admin@123', 10),
    bcrypt.hash('Staff@123', 10),
    bcrypt.hash('Student@123', 10),
  ]);

  const service = await prisma.messService.create({
    data: {
      name: 'Central Dining Hall',
      location: 'Block C, Ground Floor',
      description: 'Main student mess serving all hostels',
      defaultServiceSecs: 90,
      approachThreshold: 3,
      enforceMealTimings: false,
    },
  });

  const counterA = await prisma.counter.create({
    data: { name: 'Counter A · Main Line', code: 'A', description: 'Full thali – veg and non-veg', messServiceId: service.id, serviceSecs: 90 },
  });
  const counterB = await prisma.counter.create({
    data: { name: 'Counter B · Express', code: 'B', description: 'Quick service – veg thali and snacks', messServiceId: service.id, serviceSecs: 75 },
  });
  const counters = [counterA, counterB];

  const mealDefs = [
    { type: 'BREAKFAST', name: 'Breakfast', startTime: '07:30', endTime: '09:30', sortOrder: 1 },
    { type: 'LUNCH', name: 'Lunch', startTime: '12:00', endTime: '14:30', sortOrder: 2 },
    { type: 'SNACKS', name: 'Snacks', startTime: '16:30', endTime: '17:30', sortOrder: 3 },
    { type: 'DINNER', name: 'Dinner', startTime: '19:30', endTime: '21:30', sortOrder: 4 },
  ];
  const meals = await Promise.all(mealDefs.map((m) => prisma.meal.create({ data: { ...m, messServiceId: service.id } })));

  await prisma.user.create({
    data: { name: 'Dr. Meenakshi Rao', email: 'admin@sqms.edu', passwordHash: adminHash, role: 'ADMIN', phone: '+91 98200 11001' },
  });
  const staffA = await prisma.user.create({
    data: { name: 'Ramesh Kumar', email: 'ramesh.staff@sqms.edu', passwordHash: staffHash, role: 'STAFF', phone: '+91 98200 22001', assignedCounterId: counterA.id },
  });
  const staffB = await prisma.user.create({
    data: { name: 'Sunita Pawar', email: 'sunita.staff@sqms.edu', passwordHash: staffHash, role: 'STAFF', phone: '+91 98200 22002', assignedCounterId: counterB.id },
  });
  const staffFor = (counterId: string) => (counterId === counterA.id ? staffA.id : staffB.id);

  const students = [];
  for (const [i, [name, roll, hostel]] of STUDENTS.entries()) {
    students.push(
      await prisma.user.create({
        data: {
          name,
          email: emailOf(name),
          rollNumber: roll,
          hostel,
          phone: `+91 97${pad(10 + i)}0 ${String(40000 + i * 137).slice(0, 5)}`,
          passwordHash: studentHash,
          role: 'STUDENT',
          createdAt: new Date(Date.now() - (30 - i) * 86400000),
        },
      }),
    );
  }
  const [demoStudent] = students;

  /* ---------------- Menus: 7 days back to 2 days ahead ---------------- */
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const menuRows = [];
  for (let offset = -7; offset <= 2; offset++) {
    const day = new Date(today);
    day.setDate(day.getDate() + offset);
    const dayIndex = Math.floor(day.getTime() / 86400000);
    for (const meal of meals) {
      const pool = MENU_POOL[meal.type];
      for (const [name, category, isVeg, description] of pool[((dayIndex % pool.length) + pool.length) % pool.length]) {
        menuRows.push({ name, category, isVeg, description, date: dateStr(day), mealId: meal.id });
      }
    }
  }
  await prisma.menuItem.createMany({ data: menuRows });

  /* ---------------- Token history ---------------- */
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const active = [...meals].sort((a, b) => toMin(a.startTime) - toMin(b.startTime));
  const currentMeal =
    active.find((m) => nowMin >= toMin(m.startTime) && nowMin < toMin(m.endTime)) ??
    active.find((m) => nowMin < toMin(m.startTime)) ??
    active[active.length - 1];

  type TokenSeed = {
    tokenNumber: number;
    date: string;
    status: string;
    userId: string;
    counterId: string;
    mealId: string;
    createdAt: Date;
    calledAt?: Date;
    servedAt?: Date;
    skippedAt?: Date;
    cancelledAt?: Date;
    activeKey?: string;
    calledKey?: string;
    approachingNotified?: boolean;
    recallCount?: number;
  };

  /** Builds a fully completed queue for a past meal window. */
  function completedQueue(day: Date, meal: (typeof meals)[number], counterId: string, users: string[]): TokenSeed[] {
    const start = new Date(day);
    start.setMinutes(toMin(meal.startTime) - 10);
    let gen = start.getTime();
    let lastCall = start.getTime() + 12 * 60000;
    return users.map((userId, i) => {
      gen += between(40, 240) * 1000;
      const roll = rand();
      const createdAt = new Date(gen);
      const t: TokenSeed = { tokenNumber: i + 1, date: dateStr(day), status: 'SERVED', userId, counterId, mealId: meal.id, createdAt, approachingNotified: true };
      if (roll < 0.06) {
        t.status = 'CANCELLED';
        t.cancelledAt = new Date(gen + between(60, 400) * 1000);
        return t;
      }
      lastCall = Math.max(lastCall + between(55, 130) * 1000, gen + between(90, 300) * 1000);
      t.calledAt = new Date(lastCall);
      if (roll < 0.14) {
        t.status = 'SKIPPED';
        t.recallCount = 1;
        t.skippedAt = new Date(lastCall + between(60, 120) * 1000);
      } else {
        t.servedAt = new Date(lastCall + between(35, 80) * 1000);
      }
      return t;
    });
  }

  const tokens: TokenSeed[] = [];
  for (let offset = -6; offset <= 0; offset++) {
    const day = new Date(today);
    day.setDate(day.getDate() + offset);
    for (const meal of active) {
      if (offset === 0 && (meal.id === currentMeal.id || toMin(meal.endTime) > nowMin)) continue;
      // Weekends and snacks are a little quieter.
      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
      const max = meal.type === 'SNACKS' ? 12 : isWeekend ? 15 : 19;
      const attendees = shuffle(students.map((s) => s.id)).slice(0, between(Math.floor(max * 0.6), max));
      const split = Math.ceil(attendees.length * (0.55 + rand() * 0.1));
      tokens.push(...completedQueue(day, meal, counterA.id, attendees.slice(0, split)));
      tokens.push(...completedQueue(day, meal, counterB.id, attendees.slice(split)));
    }
  }

  /* ---------------- Live queue for the current meal ---------------- */
  const todayS = dateStr(today);
  const others = students.slice(1).map((s) => s.id); // keep the demo student free to book
  const t0 = now.getTime();
  const mk = (counterId: string, userId: string, n: number, minutesAgo: number, extra: Partial<TokenSeed>): TokenSeed => ({
    tokenNumber: n,
    date: todayS,
    status: 'WAITING',
    userId,
    counterId,
    mealId: currentMeal.id,
    createdAt: new Date(t0 - minutesAgo * 60000),
    ...extra,
  });
  const activeKey = (u: string, c: string) => `${u}:${c}:${currentMeal.id}:${todayS}`;

  // Counter A: 5 served, 1 skipped, 1 cancelled, 1 called, 6 waiting (enough calls for observed service times).
  // The skipped student (index 2) re-joined the queue at the end.
  const aPlan = ['SERVED', 'SERVED', 'SKIPPED', 'SERVED', 'SERVED', 'CANCELLED', 'SERVED', 'CALLED', 'WAITING', 'WAITING', 'WAITING', 'WAITING', 'WAITING', 'WAITING'];
  const aUsers = [...others.slice(0, 13), others[2]];
  const calls = aPlan.filter((s) => s === 'SERVED' || s === 'SKIPPED').length;
  let callIndex = 0;
  aPlan.forEach((status, i) => {
    const userId = aUsers[i];
    const minutesAgo = status === 'WAITING' ? 14 - (i - 8) * 2.2 : 36 - i * 1.8;
    const extra: Partial<TokenSeed> = { status, approachingNotified: status !== 'WAITING' };
    if (status === 'CANCELLED') extra.cancelledAt = new Date(t0 - (minutesAgo - 3) * 60000);
    if (status === 'SERVED' || status === 'SKIPPED') {
      const callAt = t0 - 45_000 - (calls - callIndex) * 95_000 + between(-15, 15) * 1000;
      callIndex++;
      extra.calledAt = new Date(callAt);
      if (status === 'SERVED') extra.servedAt = new Date(callAt + between(40, 70) * 1000);
      else {
        extra.skippedAt = new Date(callAt + 85_000);
        extra.recallCount = 1;
      }
    }
    if (status === 'CALLED') {
      extra.calledAt = new Date(t0 - 45_000);
      extra.calledKey = `${counterA.id}:${currentMeal.id}:${todayS}`;
    }
    if (status === 'CALLED' || status === 'WAITING') extra.activeKey = activeKey(userId, counterA.id);
    tokens.push(mk(counterA.id, userId, i + 1, minutesAgo, extra));
  });

  // Counter B: 3 served, nobody at the counter yet, 3 waiting (falls back to the configured service time).
  const bUsers = others.slice(13, 19);
  ['SERVED', 'SERVED', 'SERVED', 'WAITING', 'WAITING', 'WAITING'].forEach((status, i) => {
    const userId = bUsers[i];
    const extra: Partial<TokenSeed> =
      status === 'SERVED'
        ? { status, approachingNotified: true, calledAt: new Date(t0 - (24 - i * 5) * 60000), servedAt: new Date(t0 - (23 - i * 5) * 60000) }
        : { status, activeKey: activeKey(userId, counterB.id) };
    tokens.push(mk(counterB.id, userId, i + 1, 28 - i * 4.5, extra));
  });

  // Ensure one active token per student per queue (business rule) before inserting.
  const seen = new Set<string>();
  for (const t of tokens) {
    if (!t.activeKey) continue;
    if (seen.has(t.activeKey)) throw new Error(`Seed bug: duplicate active token ${t.activeKey}`);
    seen.add(t.activeKey);
  }

  await prisma.token.createMany({ data: tokens });
  const saved = await prisma.token.findMany({ include: { counter: true, meal: true } });
  const display = (t: (typeof saved)[number]) => `${t.counter.code}-${String(t.tokenNumber).padStart(3, '0')}`;

  /* ---------------- Queue events ---------------- */
  const events = [];
  for (const t of saved) {
    const staff = staffFor(t.counterId);
    events.push({ type: 'TOKEN_GENERATED', counterId: t.counterId, tokenId: t.id, actorId: t.userId, createdAt: t.createdAt, details: JSON.stringify({ tokenNumber: t.tokenNumber }) });
    if (t.calledAt) events.push({ type: 'TOKEN_CALLED', counterId: t.counterId, tokenId: t.id, actorId: staff, createdAt: t.calledAt, details: JSON.stringify({ tokenNumber: t.tokenNumber }) });
    if (t.recallCount && t.calledAt) events.push({ type: 'TOKEN_RECALLED', counterId: t.counterId, tokenId: t.id, actorId: staff, createdAt: new Date(t.calledAt.getTime() + 45000), details: JSON.stringify({ recall: 1 }) });
    if (t.servedAt) events.push({ type: 'TOKEN_SERVED', counterId: t.counterId, tokenId: t.id, actorId: staff, createdAt: t.servedAt, details: JSON.stringify({ from: 'CALLED', serviceSecs: Math.round((t.servedAt.getTime() - t.calledAt!.getTime()) / 1000) }) });
    if (t.skippedAt) events.push({ type: 'TOKEN_SKIPPED', counterId: t.counterId, tokenId: t.id, actorId: staff, createdAt: t.skippedAt, details: JSON.stringify({ from: 'CALLED' }) });
    if (t.cancelledAt) events.push({ type: 'TOKEN_CANCELLED', counterId: t.counterId, tokenId: t.id, actorId: t.userId, createdAt: t.cancelledAt, details: JSON.stringify({ by: 'STUDENT' }) });
  }
  // A short pause/resume on Counter B earlier today, for the activity log.
  events.push({ type: 'QUEUE_PAUSED', counterId: counterB.id, actorId: staffB.id, createdAt: new Date(t0 - 40 * 60000), details: JSON.stringify({ note: 'Refilling rice' }) });
  events.push({ type: 'QUEUE_RESUMED', counterId: counterB.id, actorId: staffB.id, createdAt: new Date(t0 - 33 * 60000), details: null });
  await prisma.queueEvent.createMany({ data: events });

  /* ---------------- Notifications ---------------- */
  const notes = [];
  const recentCutoff = t0 - 2 * 86400000;
  for (const t of saved) {
    const isToday = t.date === todayS;
    if (!isToday && !(t.userId === demoStudent.id && t.createdAt.getTime() > recentCutoff)) continue;
    const read = !(isToday && t.mealId === currentMeal.id);
    const d = display(t);
    notes.push({ userId: t.userId, tokenId: t.id, type: 'TOKEN_GENERATED', title: 'Token generated', message: `Your token ${d} for ${t.meal.name} at ${t.counter.name} is confirmed.`, isRead: true, createdAt: t.createdAt });
    if (t.calledAt) notes.push({ userId: t.userId, tokenId: t.id, type: 'TOKEN_CALLED', title: `Token ${d} is being called`, message: `It's your turn! Please proceed to ${t.counter.name} now to collect your ${t.meal.name.toLowerCase()}.`, isRead: read && t.status !== 'CALLED', createdAt: t.calledAt });
    if (t.servedAt) notes.push({ userId: t.userId, tokenId: t.id, type: 'TOKEN_SERVED', title: 'Enjoy your meal!', message: `Token ${d} has been served at ${t.counter.name}.`, isRead: read, createdAt: t.servedAt });
    if (t.skippedAt) notes.push({ userId: t.userId, tokenId: t.id, type: 'TOKEN_SKIPPED', title: `Token ${d} was skipped`, message: `Your token at ${t.counter.name} was skipped because you were not at the counter. You can generate a new token if needed.`, isRead: read, createdAt: t.skippedAt });
    if (t.cancelledAt) notes.push({ userId: t.userId, tokenId: t.id, type: 'TOKEN_CANCELLED', title: 'Token cancelled', message: `Your token ${d} for ${t.meal.name} at ${t.counter.name} has been cancelled.`, isRead: true, createdAt: t.cancelledAt });
  }

  // Turn-approaching alerts for the first waiting tokens in each live queue.
  for (const counter of counters) {
    const waiting = saved
      .filter((t) => t.counterId === counter.id && t.date === todayS && t.mealId === currentMeal.id && t.status === 'WAITING')
      .sort((a, b) => a.tokenNumber - b.tokenNumber);
    for (const [ahead, t] of waiting.slice(0, service.approachThreshold + 1).entries()) {
      await prisma.token.update({ where: { id: t.id }, data: { approachingNotified: true } });
      notes.push({
        userId: t.userId,
        tokenId: t.id,
        type: 'TURN_APPROACHING',
        title: ahead === 0 ? "You're next in line" : 'Your turn is approaching',
        message: ahead === 0
          ? `Token ${display(t)} is next at ${counter.name}. Please be ready at the counter.`
          : `Only ${ahead} ${ahead === 1 ? 'token is' : 'tokens are'} ahead of ${display(t)} at ${counter.name}. Please head to the counter.`,
        isRead: false,
        createdAt: new Date(t0 - between(1, 5) * 60000),
      });
    }
  }
  await prisma.notification.createMany({ data: notes });

  const counts = await Promise.all([prisma.user.count(), prisma.token.count(), prisma.queueEvent.count(), prisma.notification.count(), prisma.menuItem.count()]);
  console.log(`✔ Users: ${counts[0]}  Tokens: ${counts[1]}  Events: ${counts[2]}  Notifications: ${counts[3]}  Menu items: ${counts[4]}`);
  console.log(`✔ Live queue seeded for today's ${currentMeal.name} (${currentMeal.startTime}–${currentMeal.endTime})`);
  console.log('\nDemo accounts:');
  console.log('  Admin    admin@sqms.edu          / Admin@123');
  console.log('  Staff    ramesh.staff@sqms.edu   / Staff@123   (Counter A)');
  console.log('  Staff    sunita.staff@sqms.edu   / Staff@123   (Counter B)');
  console.log(`  Student  ${demoStudent.email}  / Student@123  (+ ${students.length - 1} more students, same password)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
