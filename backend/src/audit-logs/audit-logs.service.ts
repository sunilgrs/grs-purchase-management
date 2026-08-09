import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export interface AuditLogInput {
  entityType: string;
  entityId: string | number;
  action: string;
  description?: string;
  performedById?: number | null;
}

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  log(params: AuditLogInput) {
    return this.prisma.auditLog.create({
      data: {
        entityType: params.entityType,
        entityId: String(params.entityId),
        action: params.action,
        description: params.description ?? null,
        performedById: params.performedById ?? null,
      },
    });
  }

  findAll() {
    return this.prisma.auditLog.findMany({
      orderBy: { id: 'desc' },
      include: {
        User: { select: { id: true, name: true, mobile: true, email: true } },
      },
    });
  }

  async findOne(id: number) {
    const log = await this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        User: { select: { id: true, name: true, mobile: true, email: true } },
      },
    });
    if (!log) throw new NotFoundException(`AuditLog #${id} not found`);
    return log;
  }
}
