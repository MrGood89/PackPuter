import { Markup } from "telegraf";
import { UNIQUE_EMOJI_CHOICES } from "./emojiPicker";

/**
 * Build an inline keyboard for emoji selection with pagination
 * @param page Page number (0-based)
 * @param perPage Number of emojis per page
 * @returns Inline keyboard markup
 */
export function emojiPickerKeyboard(page = 0, perPage = 24) {
  const start = page * perPage;
  const slice = UNIQUE_EMOJI_CHOICES.slice(start, start + perPage);

  const rows: any[][] = [];
  const cols = 6; // 6 emojis per row
  
  // Create emoji rows
  for (let i = 0; i < slice.length; i += cols) {
    const row = slice.slice(i, i + cols).map((emoji) =>
      Markup.button.callback(emoji, `emoji_pick:${emoji}`)
    );
    rows.push(row);
  }

  // Add navigation row if needed
  const navRow: any[] = [];
  if (page > 0) {
    navRow.push(Markup.button.callback("⬅️ Previous", `emoji_page:${page - 1}`));
  }
  if (start + perPage < UNIQUE_EMOJI_CHOICES.length) {
    navRow.push(Markup.button.callback("Next ➡️", `emoji_page:${page + 1}`));
  }
  
  // Add default emoji button (only if not on first page or if no navigation)
  if (navRow.length === 0 || page === 0) {
    navRow.push(Markup.button.callback("Use 😀 default", "emoji_pick:😀"));
  }
  
  if (navRow.length > 0) {
    rows.push(navRow);
  }

  return Markup.inlineKeyboard(rows);
}

