import { Injectable } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DatabaseService {
  private pool: Pool;

  constructor(private configService: ConfigService) {
    const connectionString = this.configService.get<string>('ELEX_CONNECTION_STRING');

    if (!connectionString) {
      throw new Error('ELEX_CONNECTION_STRING is not set');
    }

    this.pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
    });
  }

  async query(sql: string, params?: any[]): Promise<any> {
    return this.pool.query(sql, params);
  }

  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  async setContextUser(userId: string, role: string) {
    const client = await this.getClient();
    try {
      await client.query(`SET app.current_user_id = '${userId}'`);
      await client.query(`SET app.current_user_role = '${role}'`);
    } finally {
      client.release();
    }
  }
}
