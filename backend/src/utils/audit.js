function clientIp(req) {
  return String(
    req?.headers?.["cf-connecting-ip"] ||
      req?.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req?.ip ||
      "",
  ).slice(0, 120) || null;
}

async function writeAudit(client, {
  req,
  actorId,
  targetUserId,
  action,
  entityType,
  entityId,
  before,
  after,
  metadata,
}) {
  return client.auditLog.create({
    data: {
      actorId: actorId || req?.user?.id || null,
      targetUserId: targetUserId || null,
      action: String(action),
      entityType: String(entityType),
      entityId: entityId === undefined || entityId === null ? null : String(entityId),
      before: before === undefined ? undefined : before,
      after: after === undefined ? undefined : after,
      metadata: metadata === undefined ? undefined : metadata,
      ip: clientIp(req),
    },
  });
}

module.exports = { clientIp, writeAudit };
