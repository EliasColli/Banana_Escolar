import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { STORAGE_PORT, StoragePort } from '../../../integrations/storage/storage.port';
import { canUploadAttachment, canViewReport } from '../../reports/domain/report.rules';
import { Actor, ReportRepository } from '../../reports/domain/report.types';
import { REPORT_REPOSITORY } from '../../reports/domain/report.repository';
import { PrismaService } from '../../../database/prisma.service';

interface DetectedType {
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  extension: 'jpg' | 'png' | 'webp';
}

function detectImage(buffer: Buffer): DetectedType | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: 'image/jpeg', extension: 'jpg' };
  }
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return { mimeType: 'image/png', extension: 'png' };
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { mimeType: 'image/webp', extension: 'webp' };
  }
  return null;
}

@Injectable()
export class UploadsService {
  private readonly maxBytes: number;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REPORT_REPOSITORY) private readonly reports: ReportRepository,
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
    configService: ConfigService,
  ) {
    this.maxBytes = configService.get<number>('storage.maxUploadBytes') ?? 5 * 1024 * 1024;
  }

  async upload(actor: Actor, reportId: number, file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Debes adjuntar un archivo en el campo "file".');
    if (file.size > this.maxBytes) {
      throw new BadRequestException(`La imagen supera el máximo de ${this.maxBytes} bytes.`);
    }

    const report = await this.reports.findById(reportId);
    if (!report) throw new NotFoundException('Reporte no encontrado.');

    const view = canViewReport(actor, report);
    if (!view.ok) throw new NotFoundException('Reporte no encontrado.');
    const allowed = canUploadAttachment(actor, report);
    if (!allowed.ok) throw new ForbiddenException(allowed.reason);

    const existing = await this.prisma.reportAttachment.count({ where: { reporteId: reportId } });
    if (existing > 0) {
      throw new ConflictException('Este reporte ya tiene una imagen. Elimínala antes de subir otra.');
    }

    const type = detectImage(file.buffer);
    if (!type) {
      throw new BadRequestException('Formato no permitido. Usa JPEG, PNG o WebP.');
    }

    const storageKey = `reports/${reportId}/${randomUUID()}.${type.extension}`;
    await this.storage.save(storageKey, file.buffer);

    try {
      return await this.prisma.reportAttachment.create({
        data: {
          reporteId: reportId,
          storageKey,
          mimeType: type.mimeType,
          sizeBytes: file.size,
          uploadedBy: actor.id,
        },
      });
    } catch (error) {
      await this.storage.delete(storageKey).catch(() => undefined);
      throw error;
    }
  }

  async download(actor: Actor, reportId: number, attachmentId: number) {
    const report = await this.reports.findById(reportId);
    if (!report) throw new NotFoundException('Reporte no encontrado.');
    const view = canViewReport(actor, report);
    if (!view.ok) throw new NotFoundException('Reporte no encontrado.');

    const attachment = await this.prisma.reportAttachment.findFirst({
      where: { id: attachmentId, reporteId: reportId },
    });
    if (!attachment) throw new NotFoundException('Adjunto no encontrado.');

    const content = await this.storage.read(attachment.storageKey);
    return { attachment, content };
  }
}
