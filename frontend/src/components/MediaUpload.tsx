/**
 * src/components/MediaUpload.tsx
 * Upload and preview media attachments for posts.
 */
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { PostMediaInput } from '../lib/posts';

interface MediaUploadProps {
  workspaceId: string;
  media: PostMediaInput[];
  onChange: (media: PostMediaInput[]) => void;
  onUpload: (file: File) => Promise<PostMediaInput>;
  disabled?: boolean;
  maxFiles?: number;
}

export function MediaUpload({
  media,
  onChange,
  onUpload,
  disabled,
  maxFiles = 10,
}: MediaUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || disabled) return;

    const remaining = maxFiles - media.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${maxFiles} files allowed.`);
      return;
    }

    const toUpload = Array.from(files).slice(0, remaining);
    setUploading(true);

    try {
      const uploaded: PostMediaInput[] = [];
      for (const file of toUpload) {
        const item = await onUpload(file);
        uploaded.push(item);
      }
      onChange([...media, ...uploaded]);
      toast.success(`${uploaded.length} file(s) uploaded`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = (index: number) => {
    onChange(media.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div
        className={`rounded-xl border border-dashed border-ink-500 bg-ink-800/30 p-6 text-center ${
          disabled ? 'opacity-50' : 'cursor-pointer hover:border-brand/40'
        }`}
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime"
          multiple
          className="hidden"
          disabled={disabled || uploading}
          onChange={(e) => void handleFiles(e.target.files)}
        />
        <p className="text-sm text-muted">
          {uploading ? 'Uploading…' : 'Click to upload images or videos'}
        </p>
        <p className="mt-1 text-xs text-muted">JPEG, PNG, GIF, WebP, MP4, MOV — max 25MB</p>
      </div>

      {media.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {media.map((item, i) => (
            <div
              key={`${item.url}-${i}`}
              className="group relative overflow-hidden rounded-lg border border-ink-500 bg-ink-800/50"
            >
              {item.mimeType.startsWith('video/') ? (
                <video src={item.url} className="aspect-square w-full object-cover" muted />
              ) : (
                <img src={item.url} alt={item.filename} className="aspect-square w-full object-cover" />
              )}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="absolute right-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white opacity-0 transition group-hover:opacity-100"
                >
                  Remove
                </button>
              )}
              <p className="truncate px-2 py-1 text-xs text-muted">{item.filename}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
