import {
  Controller, Post, Get, Patch,
  Param, Body, Request, Res,
  UseGuards, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { SkipThrottle } from '@nestjs/throttler';
import { Response } from 'express';
import { DocumentsService } from './documents.service';
import { UpdateDocumentStatusDto } from './dto/document.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@SkipThrottle()
@Controller('documents')
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  /**
   * POST /documents/upload
   * Trader uploads their GST certificate (or other KYC document).
   * Multipart field name: "file". Optional body field: "documentType" (defaults to GST_CERTIFICATE).
   * Returns document metadata — no blob.
   */
  @UseGuards(JwtAuthGuard)
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB — matches DB constraint
      fileFilter: (_req, file, cb) => {
        const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        if (allowed.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Only PDF, JPG, and PNG files are allowed'), false);
        }
      },
    }),
  )
  async upload(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body('documentType') documentType: string,
  ) {
    return this.documentsService.upload(req.user.userId, req.user.role, file, documentType);
  }

  /**
   * GET /documents/:id/download
   * Streams the document blob back with proper Content-Type / Content-Disposition headers.
   * Traders can only download their own documents (RLS enforced in service).
   * Admins can download any document.
   */
  @UseGuards(JwtAuthGuard)
  @Get(':id/download')
  async download(
    @Request() req: any,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const doc = await this.documentsService.getDocumentBlob(req.user.userId, req.user.role, id);
    res.set('Content-Type', doc.mime_type || 'application/octet-stream');
    res.set('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.file_name)}"`);
    res.set('Content-Length', String(doc.document_blob.length));
    res.send(doc.document_blob);
  }

  /**
   * PATCH /documents/:id/status
   * Admin-only. Sets status = APPROVED or REJECTED.
   * DB trigger propagates the change to trader_profiles.kyc_status automatically.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Patch(':id/status')
  async updateStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateDocumentStatusDto,
  ) {
    return this.documentsService.updateStatus(req.user.userId, req.user.role, id, dto);
  }

}
