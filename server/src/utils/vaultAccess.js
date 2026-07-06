import Vault from '../models/Vault.js';
import VaultMember from '../models/VaultMember.js';

/**
 * Resolve a user's role within a vault.
 * Returns one of: 'editor' (owner), 'viewer', or null (no access).
 */
export async function getVaultRole(vaultId, userId, { includeDeleted = false } = {}) {
  const query = { _id: vaultId };
  if (!includeDeleted) query.deletedAt = null;
  const vault = await Vault.findOne(query);
  if (!vault) return { vault: null, role: null };
  if (vault.owner.toString() === userId.toString()) {
    return { vault, role: 'editor' };
  }
  const member = await VaultMember.findOne({ vault: vault._id, user: userId });
  if (member) return { vault, role: member.role };
  return { vault, role: null };
}
