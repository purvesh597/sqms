import bcrypt from 'bcryptjs';
import { prisma } from '../prisma/client';
import { badRequest, unauthorized } from '../utils/http-error';

/** Fields that are safe to return to clients. Never includes passwordHash. */
export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  rollNumber: true,
  phone: true,
  hostel: true,
  isActive: true,
  assignedCounterId: true,
  assignedCounter: { select: { id: true, name: true, code: true } },
  lastLoginAt: true,
  createdAt: true,
} as const;

export const hashPassword = (plain: string) => bcrypt.hash(plain, 10);

const DUMMY_HASH = bcrypt.hashSync('sqms-timing-dummy', 10);

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Compare against a dummy hash when the user is missing to keep timing uniform.
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw unauthorized('Incorrect email or password.');
  if (!user.isActive) throw unauthorized('Your account has been deactivated. Please contact the mess administrator.');
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: publicUserSelect });
}

export const getProfile = (id: string) => prisma.user.findUniqueOrThrow({ where: { id }, select: publicUserSelect });

export async function changePassword(id: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id } });
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) throw badRequest('Current password is incorrect.');
  if (currentPassword === newPassword) throw badRequest('New password must be different from the current one.');
  await prisma.user.update({ where: { id }, data: { passwordHash: await hashPassword(newPassword) } });
}

export const updateProfile = (id: string, data: { name: string; phone?: string }) =>
  prisma.user.update({ where: { id }, data: { name: data.name, phone: data.phone ?? null }, select: publicUserSelect });
