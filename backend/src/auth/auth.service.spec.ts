import { describe, it, expect, jest } from '@jest/globals';
import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service.js';

type UserRecord = {
  id: number;
  name: string;
  mobile: string;
  email: string | null;
  password: string;
  role: string;
  status: string;
};

type CreateArgs = {
  data: {
    name: string;
    mobile: string;
    email: string | null;
    password: string;
    role: string;
  };
  omit: { password: boolean };
};

const realUser: UserRecord = {
  id: 7,
  name: 'Tester',
  mobile: '9000000099',
  email: 'tester@test.example',
  password: '',
  role: 'MANAGER',
  status: 'ACTIVE',
};

function makeService(prismaUser?: UserRecord | null) {
  let createArgs: CreateArgs | undefined;
  const prisma = {
    user: {
      findFirst: jest.fn(() => prismaUser),
      create: jest.fn((args: CreateArgs) => {
        createArgs = args;
        return { ...realUser, email: args.data.email };
      }),
    },
  };
  const jwt = {
    sign: jest.fn().mockReturnValue('signed-token'),
  };
  const service = new AuthService(prisma as never, jwt as never);
  return { service, prisma, jwt, createArgs: () => createArgs };
}

const registerDto = {
  name: 'Tester',
  mobile: '9000000099',
  email: 'tester@test.example',
  password: 'secret123',
};

beforeAll(async () => {
  realUser.password = await bcrypt.hash('secret123', 4);
});

describe('AuthService.register', () => {
  it('rejects an ADMIN self-registration', async () => {
    const { service } = makeService(null);
    await expect(
      service.register({ ...registerDto, role: 'ADMIN' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects registration when the mobile or email already exists', async () => {
    const { service } = makeService(realUser);
    await expect(service.register(registerDto)).rejects.toThrow(
      ConflictException,
    );
  });

  it('creates a user with a hashed password and defaults the role', async () => {
    const { service, jwt, createArgs } = makeService(null);
    const result = await service.register(registerDto);

    const args = createArgs();
    expect(args?.data).toEqual({
      name: 'Tester',
      mobile: '9000000099',
      email: 'tester@test.example',
      password: expect.any(String),
      role: 'STORE_KEEPER',
    });
    expect(args?.omit).toEqual({ password: true });
    expect(args?.data.password).not.toBe('secret123');
    await expect(
      bcrypt.compare('secret123', args?.data.password ?? ''),
    ).resolves.toBe(true);
    expect(jwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({ sub: 7, role: 'MANAGER', name: 'Tester' }),
    );
    expect(result.accessToken).toBe('signed-token');
  });

  it('honours a non-admin role from the payload', async () => {
    const { service, createArgs } = makeService(null);
    await service.register({ ...registerDto, role: 'PURCHASER' });
    expect(createArgs()?.data.role).toBe('PURCHASER');
  });
});

describe('AuthService.login', () => {
  it('rejects unknown or inactive users', async () => {
    const { service } = makeService(null);
    await expect(
      service.login({ username: 'nobody@test.example', password: 'x' }),
    ).rejects.toThrow(UnauthorizedException);

    const { service: svc2 } = makeService({ ...realUser, status: 'INACTIVE' });
    await expect(
      svc2.login({ username: 'tester@test.example', password: 'secret123' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a wrong password', async () => {
    const { service } = makeService(realUser);
    await expect(
      service.login({ username: 'tester@test.example', password: 'wrong' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('returns the user without the password and signs a token', async () => {
    const { service, jwt } = makeService(realUser);
    const result = await service.login({
      username: 'tester@test.example',
      password: 'secret123',
    });

    expect(result.accessToken).toBe('signed-token');
    expect(result).not.toHaveProperty('password');
    expect(result.role).toBe('MANAGER');
    expect(jwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 7,
        role: 'MANAGER',
        mobile: '9000000099',
      }),
    );
  });

  it('resolves users by mobile number as well as email', async () => {
    const { service } = makeService(realUser);
    const result = await service.login({
      username: '9000000099',
      password: 'secret123',
    });
    expect(result.accessToken).toBe('signed-token');
  });
});
