import type { User } from '@kalehub/db'
import type { IUserRepository, } from './user.repository.js'
import type { UpsertUserInput } from './user.types.js'

export class UserService {
  constructor(private readonly userRepo: IUserRepository) {}

  async upsertFromKeycloak(input: UpsertUserInput): Promise<User> {
    return this.userRepo.upsert(input)
  }

  async getById(id: string): Promise<User | null> {
    return this.userRepo.findById(id)
  }
}
