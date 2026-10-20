export interface User {
  id: string;
  name: string;
  phone: string;
  createdAt: number;
  guest?: boolean;
}

interface StoredUser extends User {
  hash: string;
}

const SESSION_KEY = 'wayfarer.session.v1';
const USERS_KEY = 'wayfarer.users.v1';

function readUsers(): StoredUser[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) ?? '[]') as StoredUser[];
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUser[]) {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch {
    /* quota */
  }
}

/** file:// 下没有 crypto.subtle，退化成简单散列；这只是本机演示，不做真实鉴权。 */
export async function hashPassword(text: string): Promise<string> {
  try {
    if (crypto?.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    /* fall through */
  }
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

export function loadUser(): User | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function saveSession(user: User | null) {
  try {
    if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* quota */
  }
}

export function maskPhone(phone: string): string {
  if (phone.length < 7) return phone;
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

export async function register(phone: string, password: string, name?: string): Promise<User> {
  if (!/^1\d{10}$/.test(phone)) throw new Error('手机号格式不对（11 位，1 开头）');
  if (password.length < 6) throw new Error('密码至少 6 位');
  const users = readUsers();
  if (users.some((u) => u.phone === phone)) throw new Error('这个手机号已经注册过了，直接登录吧');
  const user: StoredUser = {
    id: `u_${Date.now().toString(36)}`,
    name: name?.trim() || `旅行者${phone.slice(-4)}`,
    phone,
    createdAt: Date.now(),
    hash: await hashPassword(password),
  };
  writeUsers([...users, user]);
  const session: User = { id: user.id, name: user.name, phone: user.phone, createdAt: user.createdAt };
  saveSession(session);
  return session;
}

export async function login(phone: string, password: string): Promise<User> {
  const users = readUsers();
  const found = users.find((u) => u.phone === phone);
  if (!found) throw new Error('这个手机号还没注册，先注册一个');
  const hash = await hashPassword(password);
  if (hash !== found.hash) throw new Error('密码不对');
  const session: User = { id: found.id, name: found.name, phone: found.phone, createdAt: found.createdAt };
  saveSession(session);
  return session;
}

/** 验证码登录：本机演示，任意 6 位数字都算通过 */
export async function loginByCode(phone: string, code: string): Promise<User> {
  if (!/^1\d{10}$/.test(phone)) throw new Error('手机号格式不对（11 位，1 开头）');
  if (!/^\d{6}$/.test(code)) throw new Error('验证码是 6 位数字');
  const users = readUsers();
  const found = users.find((u) => u.phone === phone);
  if (found) {
    const session: User = { id: found.id, name: found.name, phone: found.phone, createdAt: found.createdAt };
    saveSession(session);
    return session;
  }
  const user: StoredUser = {
    id: `u_${Date.now().toString(36)}`,
    name: `旅行者${phone.slice(-4)}`,
    phone,
    createdAt: Date.now(),
    hash: '',
  };
  writeUsers([...users, user]);
  const session: User = { id: user.id, name: user.name, phone: user.phone, createdAt: user.createdAt };
  saveSession(session);
  return session;
}

export async function loginAsGuest(): Promise<User> {
  const session: User = {
    id: 'guest',
    name: '本机访客',
    phone: '',
    createdAt: Date.now(),
    guest: true,
  };
  saveSession(session);
  return session;
}

export function logout() {
  saveSession(null);
}
