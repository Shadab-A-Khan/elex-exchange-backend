import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { UpdateDocumentStatusDto, DocumentStatus } from './dto/document.dto';

@Injectable()
export class DocumentsService {
  constructor(private db: DatabaseService) {}

  // ─── Upload ────────────────────────────────────────────────────────────────
  // Inserts the file as a BYTEA blob into documents with status = 'PENDING'.
  // trader_profile_id is always resolved server-side from the JWT userId —
  // never accepted from the client.

  async upload(
    userId: string,
    role: string,
    file: Express.Multer.File,
    documentType: string,
  ) {
    if (!file) throw new BadRequestException('No file provided');

    const client = await this.db.getClient();
    try {
      await client.query('BEGIN');
      await client.query(`SELECT set_config('app.current_user_id', $1, true)`, [userId]);
      await client.query(`SELECT set_config('app.current_user_role', $1, true)`, [role]);

      const profileRes = await client.query(
        `SELECT id FROM trader_profiles WHERE user_id = $1 LIMIT 1`,
        [userId],
      );
      if (!profileRes.rows.length) {
        throw new ForbiddenException('Trader profile not found');
      }
      const traderProfileId: string = profileRes.rows[0].id;

      const res = await client.query(
        `INSERT INTO documents
           (trader_profile_id, user_id, document_type, file_name, file_size, mime_type, document_blob)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, document_type, file_name, file_size, mime_type, status, created_at`,
        [
          traderProfileId,
          userId,
          documentType || 'GST_CERTIFICATE',
          file.originalname,
          file.size,
          file.mimetype,
          file.buffer,
        ],
      );

      await client.query('COMMIT');
      return res.rows[0];
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  // ─── Download ──────────────────────────────────────────────────────────────
  // Returns { document_blob, file_name, mime_type } for the controller to stream.
  // RLS documents_select_policy enforces access: traders see own, admins see all.

  async getDocumentBlob(userId: string, role: string, documentId: string) {
    const client = await this.db.getClient();
    try {
      await client.query('BEGIN');
      await client.query(`SELECT set_config('app.current_user_id', $1, true)`, [userId]);
      await client.query(`SELECT set_config('app.current_user_role', $1, true)`, [role]);

      const result = await client.query(
        `SELECT document_blob, file_name, mime_type FROM documents WHERE id = $1`,
        [documentId],
      );

      await client.query('COMMIT');

      if (!result.rows.length) throw new NotFoundException('Document not found');

      const { document_blob, file_name, mime_type } = result.rows[0];
      if (!document_blob) throw new NotFoundException('Document file not available');

      return { document_blob, file_name, mime_type };
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  // ─── Update status ─────────────────────────────────────────────────────────
  // Admin-only. Sets status = APPROVED or REJECTED + rejection_reason +
  // verified_by + verified_at. The DB trigger sync_document_status_to_kyc
  // fires automatically and propagates to trader_profiles.kyc_status.

  async updateStatus(
    adminId: string,
    adminRole: string,
    documentId: string,
    dto: UpdateDocumentStatusDto,
  ) {
    if (dto.status === DocumentStatus.REJECTED && !dto.rejectionReason?.trim()) {
      throw new BadRequestException('rejectionReason is required when rejecting a document');
    }

    const client = await this.db.getClient();
    try {
      await client.query('BEGIN');
      await client.query(`SELECT set_config('app.current_user_id', $1, true)`, [adminId]);
      await client.query(`SELECT set_config('app.current_user_role', $1, true)`, [adminRole]);

      const result = await client.query(
        `UPDATE documents
         SET
           status           = $1,
           rejection_reason = $2,
           verified_by      = $3,
           verified_at      = NOW()
         WHERE id = $4
         RETURNING id, status, rejection_reason, verified_by, verified_at, trader_profile_id`,
        [
          dto.status,
          dto.status === DocumentStatus.REJECTED ? dto.rejectionReason!.trim() : null,
          adminId,
          documentId,
        ],
      );

      if (!result.rows.length) throw new NotFoundException('Document not found');

      await client.query('COMMIT');
      // DB trigger fires here → trader_profiles.kyc_status synced automatically
      return result.rows[0];
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

}
