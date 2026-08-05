import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "../lib/env.js";

/**
 * Storage abstraction (Module 11 — Document Management). The rest of
 * the app calls storage.saveFile()/deleteFile() and never touches the
 * filesystem or the Supabase SDK directly — swapping STORAGE_DRIVER
 * later means implementing this same interface, changing nothing
 * else in the codebase.
 */
export interface StorageDriver {
  saveFile(buffer: Buffer, originalName: string): Promise<{ storageKey: string; url: string }>;
  deleteFile(storageKey: string): Promise<void>;
}

const STORAGE_ROOT = path.resolve(process.cwd(), "storage");

/**
 * Writes to the local filesystem. Fine for local development, but on
 * most hosting platforms (Railway included) local disk isn't
 * guaranteed to survive a redeploy — uploaded documents can silently
 * disappear. Use STORAGE_DRIVER=supabase for anything production.
 */
class LocalStorageDriver implements StorageDriver {
  async saveFile(buffer: Buffer, originalName: string) {
    await fs.mkdir(STORAGE_ROOT, { recursive: true });
    const ext = path.extname(originalName);
    const storageKey = `${crypto.randomUUID()}${ext}`;
    await fs.writeFile(path.join(STORAGE_ROOT, storageKey), buffer);
    return { storageKey, url: `/files/${storageKey}` };
  }

  async deleteFile(storageKey: string) {
    await fs.rm(path.join(STORAGE_ROOT, storageKey), { force: true });
  }
}

/**
 * Stores files in a Supabase Storage bucket. Uses the SERVICE ROLE key
 * (not the public anon key) because this code runs server-side only
 * and needs to write to a bucket regardless of row-level-security
 * policies — the service role key must never be sent to the browser
 * or committed to source control (it's read from env only).
 *
 * Bucket is treated as private: saveFile() returns a signed URL that
 * expires (SIGNED_URL_EXPIRY_SECONDS below), not a permanent public
 * link — appropriate for contracts/NDAs/invoices, which shouldn't be
 * guessable or permanently public just because someone has the URL.
 * If a document truly needs a permanent public link later, switch the
 * bucket to public and swap `createSignedUrl` for `getPublicUrl`.
 */
const SIGNED_URL_EXPIRY_SECONDS = 60 * 60 * 24 * 7; // 7 days

class SupabaseStorageDriver implements StorageDriver {
  private client: SupabaseClient;
  private bucket: string;

  constructor() {
    if (!env.supabase.url || !env.supabase.serviceRoleKey) {
      throw new Error(
        "STORAGE_DRIVER=supabase requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to be set. See .env.example."
      );
    }
    this.client = createClient(env.supabase.url, env.supabase.serviceRoleKey);
    this.bucket = env.supabase.storageBucket;
  }

  async saveFile(buffer: Buffer, originalName: string) {
    const ext = path.extname(originalName);
    const storageKey = `${crypto.randomUUID()}${ext}`;

    const { error: uploadError } = await this.client.storage
      .from(this.bucket)
      .upload(storageKey, buffer, {
        contentType: guessContentType(ext),
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Supabase Storage upload failed: ${uploadError.message}`);
    }

    const { data: signedData, error: signError } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(storageKey, SIGNED_URL_EXPIRY_SECONDS);

    if (signError || !signedData) {
      throw new Error(`Supabase Storage upload succeeded but signing the URL failed: ${signError?.message}`);
    }

    return { storageKey, url: signedData.signedUrl };
  }

  async deleteFile(storageKey: string) {
    const { error } = await this.client.storage.from(this.bucket).remove([storageKey]);
    if (error) {
      throw new Error(`Supabase Storage delete failed: ${error.message}`);
    }
  }

  /**
   * Signed URLs expire (see SIGNED_URL_EXPIRY_SECONDS). Call this to
   * get a fresh URL for a file whose original signed link has gone
   * stale — e.g. right before showing a document in the client portal.
   */
  async refreshUrl(storageKey: string): Promise<string> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(storageKey, SIGNED_URL_EXPIRY_SECONDS);
    if (error || !data) {
      throw new Error(`Could not refresh signed URL: ${error?.message}`);
    }
    return data.signedUrl;
  }
}

function guessContentType(ext: string): string {
  const map: Record<string, string> = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
  return map[ext.toLowerCase()] ?? "application/octet-stream";
}

function createStorageDriver(): StorageDriver {
  if (env.storageDriver === "supabase") {
    return new SupabaseStorageDriver();
  }
  return new LocalStorageDriver();
}

export const storage: StorageDriver = createStorageDriver();
