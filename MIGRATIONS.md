# Database Migrations Guide

This document explains how to manage database schema changes using Drizzle Kit migrations.

## Overview

We use **Drizzle Kit** for database migrations, which provides a type-safe way to manage schema changes. Migrations are version-controlled SQL files that track all database structure changes.

## Why Migrations?

- ✅ **Version Control**: Track all database changes in git
- ✅ **Reproducibility**: Apply the same changes across environments (dev, staging, production)
- ✅ **Rollback Capability**: Revert changes if needed
- ✅ **Team Collaboration**: Multiple developers can work on schema changes
- ✅ **Production Safety**: Review SQL before applying changes

## Migration Workflow

### 1. Development Workflow

When developing locally, you can use either approach:

#### Option A: Quick Development (db:push)

```bash
# Make changes to shared/schema.ts
npm run db:push
```

**Pros**: Fast iteration, no migration files
**Cons**: No version control, can't track changes
**Use when**: Rapid prototyping, local development

#### Option B: Production Workflow (migrations)

```bash
# 1. Make changes to shared/schema.ts
# 2. Generate migration
npm run db:generate

# 3. Review the generated SQL in migrations/ folder
# 4. Apply migration to database
npm run db:migrate
```

**Pros**: Version controlled, reviewable, production-ready
**Cons**: Extra step
**Use when**: Ready to commit, team collaboration, production

### 2. Creating Your First Migration

```bash
# Generate migration from schema
npm run db:generate
```

This will:

1. Analyze `shared/schema.ts`
2. Compare with existing migrations
3. Create a new migration file in `migrations/`
4. Generate SQL statements for changes

Example output:

```
migrations/0000_ancient_nuke.sql     # Initial schema
migrations/0001_add_user_role.sql    # New migration
```

### 3. Reviewing Migrations

Always review the generated SQL before applying:

```bash
cat migrations/0001_add_user_role.sql
```

Example migration:

```sql
ALTER TABLE "users" ADD COLUMN "role" text DEFAULT 'user' NOT NULL;
```

### 4. Applying Migrations

```bash
# Run all pending migrations
npm run db:migrate
```

This will:

1. Connect to your database using `DATABASE_URL`
2. Check which migrations have been applied
3. Run any pending migrations in order
4. Track applied migrations in `__drizzle_migrations` table

### 5. Drizzle Studio (GUI Management)

Launch a visual database management tool:

```bash
npm run db:studio
```

This opens a web interface at `https://local.drizzle.studio` where you can:

- View all tables and data
- Run queries
- Inspect schema
- No database changes - read-only interface

## Available Scripts

| Command               | Description                                | When to Use                        |
| --------------------- | ------------------------------------------ | ---------------------------------- |
| `npm run db:generate` | Generate new migration from schema changes | After modifying `shared/schema.ts` |
| `npm run db:migrate`  | Run pending migrations                     | Before deploying, in CI/CD         |
| `npm run db:studio`   | Open Drizzle Studio GUI                    | Database inspection                |
| `npm run db:push`     | Push schema without migrations             | Quick local development            |

## Common Scenarios

### Scenario 1: Adding a New Column

1. **Edit schema**:

```typescript
// shared/schema.ts
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  email: text("email").notNull(),
  role: text("role").notNull().default("user"), // NEW COLUMN
});
```

2. **Generate migration**:

```bash
npm run db:generate
```

3. **Review the SQL**:

```bash
cat migrations/0001_*.sql
```

4. **Apply migration**:

```bash
npm run db:migrate
```

### Scenario 2: Adding a New Table

1. **Edit schema**:

```typescript
// shared/schema.ts
export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});
```

2. **Generate and apply**:

```bash
npm run db:generate
npm run db:migrate
```

### Scenario 3: Production Deployment

```bash
# In CI/CD pipeline or production server

# 1. Pull latest code with migrations
git pull origin main

# 2. Install dependencies
npm ci

# 3. Run migrations
npm run db:migrate

# 4. Start application
npm start
```

## Migration Files Structure

```
migrations/
├── 0000_ancient_nuke.sql        # Initial schema
├── 0001_add_sessions.sql        # Add sessions table
├── 0002_add_user_role.sql       # Add role column
├── meta/
│   ├── 0000_snapshot.json       # Schema snapshots
│   ├── 0001_snapshot.json
│   └── _journal.json            # Migration history
```

## Best Practices

### ✅ DO

1. **Always review generated SQL** before applying
2. **Run migrations in CI/CD** to catch issues early
3. **Test migrations on staging** before production
4. **Keep migrations in git** - commit them with code changes
5. **Use descriptive names** in migration files if renaming
6. **Backup production** database before major migrations

### ❌ DON'T

1. **Don't edit applied migrations** - create a new one instead
2. **Don't delete migration files** - they're permanent history
3. **Don't run `db:push` in production** - always use migrations
4. **Don't skip migration review** - SQL can be destructive
5. **Don't manually modify the database** - use migrations for all changes

## Environment Setup

### Development

Create `.env` file:

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/resume_repairer
```

### Production

Set environment variable:

```bash
export DATABASE_URL=postgresql://prod_user:secure_pass@prod-db:5432/resume_prod
```

### CI/CD

Set in GitHub Actions secrets:

```yaml
env:
  DATABASE_URL: postgresql://test:test@localhost:5432/resume_test
```

## Troubleshooting

### Error: "DATABASE_URL not set"

**Solution**: Create a `.env` file or set the environment variable:

```bash
export DATABASE_URL=postgresql://user:password@localhost:5432/dbname
```

### Error: "Migration already applied"

**Solution**: The migration was already run. Check migration status:

```sql
SELECT * FROM __drizzle_migrations;
```

### Error: "Column already exists"

**Solution**: Your database state doesn't match migrations. Either:

1. Reset database and re-run all migrations
2. Create a migration to handle existing state

### Migration Stuck / Failed

**Solution**:

1. Check database logs
2. Manually verify database state
3. If needed, manually complete the migration
4. Mark as applied in `__drizzle_migrations` table

## Migration Rollback

Drizzle doesn't have automatic rollbacks. To rollback:

1. **Option A**: Manually write reverse SQL

```sql
-- If migration added a column:
ALTER TABLE "users" DROP COLUMN "role";
```

2. **Option B**: Restore from database backup

3. **Option A**: Create a new migration that undoes changes

```bash
npm run db:generate  # After reverting schema.ts changes
```

## CI/CD Integration

Our CI/CD pipeline automatically runs migrations:

### GitHub Actions (`.github/workflows/ci.yml`)

```yaml
- name: Run database migrations
  run: npm run db:migrate
```

### Docker Deployment

```dockerfile
# In production entrypoint
CMD npm run db:migrate && npm start
```

Or use a separate migration job:

```bash
docker-compose run app npm run db:migrate
```

## Schema Evolution Example

### Version 0: Initial Schema (Week 1)

```typescript
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  email: text("email").notNull(),
});
```

### Version 1: Add Authentication (Week 2)

```typescript
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(), // ADDED
});
```

```bash
npm run db:generate  # Creates 0001_add_auth.sql
npm run db:migrate   # Applies migration
```

### Version 2: Add Profile (Week 3)

```typescript
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"), // ADDED
  plan: text("plan").default("free"), // ADDED
});
```

```bash
npm run db:generate  # Creates 0002_add_profile.sql
npm run db:migrate   # Applies migration
```

## Further Reading

- [Drizzle Kit Migrations](https://orm.drizzle.team/kit-docs/overview)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)

---

**Version**: 1.0
**Last Updated**: 2025-12-06
**Maintained By**: Development Team
