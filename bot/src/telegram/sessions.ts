export type SessionMode = 'batch' | 'convert' | 'ai' | 'ai_image' | 'pack' | null;

export interface UploadedFile {
  fileId: string;
  filePath?: string;
  metadata?: {
    duration?: number;
    kb?: number;
    width?: number;
    height?: number;
    fps?: number;
  };
}

export interface AIStyle {
  outlineWidth?: number;
  fontFamily?: string;
  strokeWidth?: number;
  colorTheme?: string;
}

export interface Session {
  mode: SessionMode;
  uploadedFiles: UploadedFile[];
  projectContext?: string;
  chosenTemplate?: string;
  chosenPackAction?: 'new' | 'existing';
  emoji?: string;
  packTitle?: string;
  existingPackName?: string;
  packSize?: number; // for AI Generate Pack
  theme?: string; // for AI Generate Pack
  autoProceedSent?: boolean; // Track if auto-proceed message was sent
  stickerFormat?: 'static' | 'video'; // Sticker format for pack creation
  aiStyle?: AIStyle; // Pack style seed for consistency
  awaitingEmojiPick?: boolean; // Track if waiting for emoji selection
  emojiPickPage?: number; // Current page of emoji picker
  imageStickerMode?: 'custom' | 'auto'; // Mode for image sticker generation
  customInstructions?: string; // Custom instructions for single sticker mode
  baseImagePath?: string; // Local path to prepared asset (for debugging)
  baseImageUrl?: string; // Public HTTPS URL to prepared asset (for Memeputer)
  assetKey?: string; // Storage key for the uploaded asset
}

const sessions = new Map<number, Session>();

export function getSession(userId: number): Session {
  if (!sessions.has(userId)) {
    sessions.set(userId, {
      mode: null,
      uploadedFiles: [],
    });
  }
  return sessions.get(userId)!;
}

export function setSession(userId: number, session: Partial<Session>): void {
  const current = getSession(userId);
  sessions.set(userId, { ...current, ...session });
}

export function clearSession(userId: number): void {
  sessions.delete(userId);
}

export function resetSession(userId: number): void {
  sessions.set(userId, {
    mode: null,
    uploadedFiles: [],
  });
}

