import { prisma } from '@kalehub/db'
import type { User } from '@kalehub/db'
import type { UpsertUserInput } from './user.types.js'

export interface IUserRepository {
  upsert(input: UpsertUserInput): Promise<User>
  findById(id: string): Promise<User | null>
}

export class PrismaUserRepository implements IUserRepository {
  async upsert(input: UpsertUserInput): Promise<User> {
    return prisma.user.upsert({
      where: { keycloakId: input.keycloakId },
      update: { email: input.email, name: input.name },
      create: { keycloakId: input.keycloakId, email: input.email, name: input.name },
    })
  }

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } })
  }
}
