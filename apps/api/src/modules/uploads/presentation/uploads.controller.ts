import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { AuthUser, CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UploadsService } from '../application/uploads.service';

@ApiTags('uploads')
@ApiBearerAuth()
@Controller('reports')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post(':id/attachments')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
      fileFilter: (_request, file, callback) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        callback(null, allowed.includes(file.mimetype));
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @ApiOperation({ summary: 'Subir una fotografía (JPEG/PNG/WebP, máx. 5 MB)' })
  async upload(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseIntPipe) reportId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const attachment = await this.uploadsService.upload(actor, reportId, file);
    return {
      id: attachment.id,
      reporteId: attachment.reporteId,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      createdAt: attachment.createdAt.toISOString(),
      url: `/v1/reports/${attachment.reporteId}/attachments/${attachment.id}`,
    };
  }

  @Get(':id/attachments/:attachmentId')
  @ApiOperation({ summary: 'Descargar imagen con autorización por reporte' })
  async download(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseIntPipe) reportId: number,
    @Param('attachmentId', ParseIntPipe) attachmentId: number,
  ): Promise<StreamableFile> {
    const { attachment, content } = await this.uploadsService.download(
      actor,
      reportId,
      attachmentId,
    );
    return new StreamableFile(content, {
      type: attachment.mimeType,
      disposition: `inline; filename="reporte-${reportId}-${attachment.id}"`,
      length: content.byteLength,
    });
  }
}
