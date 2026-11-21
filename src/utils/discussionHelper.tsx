import React from 'react';

/**
 * Compresses an uploaded image (screenshot, textbook page, handwritten diagram)
 * to a lightweight base64 string (max 900px width/height, ~30-60KB)
 * so it fits easily within MySQL MEDIUMTEXT and loads instantly.
 */
export async function compressDiscussionImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Selected file is not an image.'));
    }
    if (file.size > 12 * 1024 * 1024) {
      return reject(new Error('Image exceeds 12MB limit.'));
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 900;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Could not get canvas context.'));
        }

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.82);
        resolve(compressedBase64);
      };
      img.onerror = () => reject(new Error('Failed to load image for compression.'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Auto-detects URLs in comment text and renders them as clickable links
 * like LinkedIn and Facebook post comments.
 */
export function renderTextWithLinks(text: string): React.ReactNode {
  if (!text) return null;

  // Regex matching http:// or https:// or www.
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  const parts = text.split(urlRegex);

  return (
    <span>
      {parts.map((part, index) => {
        if (part.match(urlRegex)) {
          const href = part.startsWith('www.') ? `https://${part}` : part;
          return (
            <a
              key={index}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-800 underline font-medium break-all transition-colors inline-flex items-center gap-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              <span>{part}</span>
            </a>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
}
