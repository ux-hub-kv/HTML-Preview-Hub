/**
 * Auto-expiry of uploaded previews (14 / 60 days / never).
 * Turned off by the site owner: uploads never expire and existing expiry dates are ignored.
 * Flip to `true` to bring the feature back — the stored `expires_at` values are kept.
 */
export const EXPIRY_ENABLED = false;

/** Days a deleted preview stays in the bucket before it is purged for good. */
export const TRASH_RETENTION_DAYS = 30;
