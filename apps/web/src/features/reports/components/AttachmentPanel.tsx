import type { Attachment, Report } from '@banana/api-client';
import { useQuery } from '@tanstack/react-query';
import { ImagePlus, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { reportService } from '../api/report-service';
import { useUploadAttachment } from '../hooks/use-reports';
import { formatBytes, formatDate } from '@/shared/lib/labels';

function AttachmentImage({ reportId, attachment }: { reportId: number; attachment: Attachment }) {
  const { data, isPending, isError } = useQuery({
    queryKey: ['attachment', reportId, attachment.id],
    queryFn: async () => {
      const blob = await reportService.download(reportId, attachment.id);
      return URL.createObjectURL(blob);
    },
    staleTime: Number.POSITIVE_INFINITY,
  });

  useEffect(() => {
    return () => {
      if (data) URL.revokeObjectURL(data);
    };
  }, [data]);

  if (isPending) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl bg-slate-100">
        <Loader2 className="size-6 animate-spin text-slate-400" />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-500">
        No se pudo cargar la imagen.
      </div>
    );
  }
  return (
    <button
      type="button"
      className="group relative block w-full overflow-hidden rounded-xl bg-slate-100"
      onClick={() => window.open(data, '_blank', 'noopener')}
      title="Abrir imagen"
    >
      <img
        src={data}
        alt={`Fotografía del reporte ${reportId}`}
        className="max-h-80 w-full object-cover transition group-hover:opacity-95"
      />
      <span className="absolute right-2 bottom-2 rounded-md bg-slate-900/70 px-2 py-1 text-[11px] font-medium text-white">
        {formatBytes(attachment.sizeBytes)} · {formatDate(attachment.createdAt)}
      </span>
    </button>
  );
}

export function AttachmentPanel({ report, canEdit }: { report: Report; canEdit: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<string | null>(null);
  const upload = useUploadAttachment(report.id);
  const attachment = report.adjuntos?.[0];

  const onSelect = (selected: File | null) => {
    setValidation(null);
    upload.reset();
    if (!selected) {
      setFile(null);
      return;
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(selected.type)) {
      setValidation('Formato no permitido. Usa JPEG, PNG o WebP.');
      setFile(null);
      return;
    }
    if (selected.size > 5 * 1024 * 1024) {
      setValidation('La imagen supera el máximo de 5 MB.');
      setFile(null);
      return;
    }
    setFile(selected);
  };

  if (attachment) {
    return (
      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-800">Fotografía</h2>
        <AttachmentImage reportId={report.id} attachment={attachment} />
      </div>
    );
  }

  if (!canEdit) return null;

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-slate-800">Fotografía</h2>
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => onSelect(event.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          className="flex w-full flex-col items-center gap-2 rounded-lg py-4 text-sm text-slate-500 hover:text-slate-800"
          onClick={() => fileRef.current?.click()}
        >
          <ImagePlus className="size-6 text-banana-600" />
          {file ? file.name : 'Adjuntar una fotografía (máx. 5 MB)'}
        </button>
        {validation && <p className="mt-2 text-xs text-red-600">{validation}</p>}
        {upload.isError && (
          <p className="mt-2 text-xs text-red-600">{upload.error.message}</p>
        )}
        {file && (
          <button
            type="button"
            className="btn-primary mt-3 w-full"
            disabled={upload.isPending}
            onClick={() => upload.mutate(file)}
          >
            {upload.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Subir imagen
          </button>
        )}
      </div>
    </div>
  );
}
