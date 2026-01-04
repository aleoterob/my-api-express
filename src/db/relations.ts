/**
 * Definición de relaciones Drizzle ORM
 * Estas relaciones permiten hacer queries con joins tipados
 *
 * NOTA: La relación con auth.users existe a nivel de base de datos (foreign key)
 * pero no se puede expresar en Drizzle relations porque auth.users está en otro schema.
 * La foreign key: profiles.id -> auth.users.id (ON DELETE CASCADE)
 * El trigger automático crea un perfil cuando se crea un usuario en auth.users
 */

import { relations } from 'drizzle-orm';
import { profiles } from './schema/public/profiles';
import { users } from './schema/auth/users';
import { refreshTokens } from './schema/auth/refresh_tokens';

export const profilesRelations = relations(profiles, () => ({}));

export const usersRelations = relations(users, ({ many }) => ({
  refreshTokens: many(refreshTokens),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
  replacedBy: one(refreshTokens, {
    fields: [refreshTokens.replacedByToken],
    references: [refreshTokens.id],
  }),
}));
