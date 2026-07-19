const rateLimit = require("express-rate-limit");
const router = require("express").Router();
const prisma = require("../config/prisma");
const { authMiddleware, optionalAuthMiddleware, adminMiddleware } = require("../middleware/auth.middleware");
const { writeAudit } = require("../utils/audit");
const { avatarData } = require("../services/avatar.service");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REQUEST_ID_RE = /^[a-zA-Z0-9:_-]{16,100}$/;
const userSelect = {
  id: true,
  username: true,
  email: true,
  avatar: { select: { kind: true, presetId: true, updatedAt: true } },
};

const supportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: "SUPPORT_RATE_LIMIT",
    message: "Слишком много обращений. Повторите попытку позже.",
  },
});

function apiError(res, status, code, message) {
  return res.status(status).json({ success: false, code, message });
}

function serializeMessage(message) {
  if (!message?.user) return message;
  const { avatar: _avatar, ...user } = message.user;
  return { ...message, user: { ...user, ...avatarData(message.user) } };
}

function sameRequester(message, req, email) {
  if (req.user) return message.userId === req.user.id;
  return !message.userId && Boolean(email) && message.email === email;
}

function samePayload(message, text, topic) {
  return message.text === text && message.topic === topic;
}

async function findRequest(clientRequestId) {
  if (!clientRequestId) return null;
  return prisma.supportMessage.findUnique({
    where: { clientRequestId },
    include: { user: { select: userSelect } },
  });
}

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const messages = await prisma.supportMessage.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        text: true,
        from: true,
        topic: true,
        status: true,
        userId: true,
        parentId: true,
        createdAt: true,
      },
    });
    return res.json({ success: true, data: messages.reverse() });
  } catch (error) {
    console.error("[Support] User history failed", error?.stack || error);
    return apiError(res, 500, "SUPPORT_HISTORY_FAILED", "Не удалось загрузить историю поддержки.");
  }
});

router.get("/", authMiddleware, adminMiddleware, async (_req, res) => {
  try {
    const messages = await prisma.supportMessage.findMany({
      where: { from: "user", parentId: null },
      orderBy: { createdAt: "desc" },
      take: 500,
      include: {
        user: { select: userSelect },
        replies: { orderBy: { createdAt: "asc" } },
      },
    });
    return res.json({ success: true, data: messages.map(serializeMessage) });
  } catch (error) {
    console.error("[Support] Admin list failed", error?.stack || error);
    return apiError(res, 500, "SUPPORT_LIST_FAILED", "Не удалось загрузить обращения поддержки.");
  }
});

router.post("/", supportLimiter, optionalAuthMiddleware, async (req, res) => {
  const text = String(req.body?.text || "").trim();
  const topic = String(req.body?.topic || "other").trim().slice(0, 60);
  const name = String(req.body?.name || "").trim().slice(0, 80);
  const email = String(req.body?.email || "").trim().toLowerCase().slice(0, 160);
  const clientRequestId = String(req.body?.clientRequestId || "").trim();

  if (text.length < 5 || text.length > 4000) {
    return apiError(res, 400, "SUPPORT_TEXT_INVALID", "Сообщение должно содержать от 5 до 4000 символов.");
  }
  if (!req.user && (!name || !EMAIL_RE.test(email))) {
    return apiError(res, 400, "SUPPORT_CONTACT_INVALID", "Для обращения без входа укажите имя и корректный email.");
  }
  if (clientRequestId && !REQUEST_ID_RE.test(clientRequestId)) {
    return apiError(res, 400, "SUPPORT_REQUEST_ID_INVALID", "Некорректный идентификатор отправки.");
  }

  try {
    const existing = await findRequest(clientRequestId);
    if (existing) {
      if (!sameRequester(existing, req, email)) {
        return apiError(res, 409, "SUPPORT_REQUEST_CONFLICT", "Идентификатор отправки уже использован.");
      }
      if (!samePayload(existing, text, topic)) {
        return apiError(res, 409, "SUPPORT_REQUEST_MISMATCH", "Эта попытка отправки уже связана с другим сообщением.");
      }
      return res.json({ success: true, duplicate: true, data: serializeMessage(existing), message: "Обращение уже принято." });
    }

    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.supportMessage.create({
        data: {
          text,
          topic,
          name: req.user ? null : name,
          email: req.user ? null : email,
          from: "user",
          userId: req.user?.id || null,
          clientRequestId: clientRequestId || null,
        },
        include: { user: { select: userSelect } },
      });
      await writeAudit(tx, {
        req,
        action: "support.created",
        entityType: "SupportMessage",
        entityId: created.id,
        targetUserId: req.user?.id || undefined,
        after: { topic, authenticated: Boolean(req.user) },
      });
      return created;
    });

    return res.status(201).json({ success: true, data: serializeMessage(message), message: "Обращение отправлено." });
  } catch (error) {
    if (error?.code === "P2002" && clientRequestId) {
      const existing = await findRequest(clientRequestId).catch(() => null);
      if (existing && sameRequester(existing, req, email) && samePayload(existing, text, topic)) {
        return res.json({ success: true, duplicate: true, data: serializeMessage(existing), message: "Обращение уже принято." });
      }
    }
    console.error("[Support] Create failed", error?.stack || error);
    return apiError(res, 500, "SUPPORT_CREATE_FAILED", "Не удалось отправить обращение.");
  }
});

router.post("/:id/reply", authMiddleware, adminMiddleware, async (req, res) => {
  const sourceId = Number(req.params.id);
  const text = String(req.body?.text || "").trim();
  if (!Number.isInteger(sourceId) || sourceId <= 0 || text.length < 2 || text.length > 4000) {
    return apiError(res, 400, "SUPPORT_REPLY_INVALID", "Введите корректный ответ.");
  }

  try {
    const source = await prisma.supportMessage.findUnique({ where: { id: sourceId } });
    if (!source || source.from !== "user" || source.parentId) {
      return apiError(res, 404, "SUPPORT_NOT_FOUND", "Обращение не найдено.");
    }

    const reply = await prisma.$transaction(async (tx) => {
      const created = await tx.supportMessage.create({
        data: {
          text,
          from: "admin",
          userId: source.userId,
          parentId: source.id,
          topic: source.topic,
          status: "answered",
        },
      });
      await tx.supportMessage.update({ where: { id: source.id }, data: { status: "answered" } });
      if (source.userId) {
        await tx.notification.create({
          data: {
            userId: source.userId,
            type: "support",
            title: "Ответ службы поддержки",
            message: text.slice(0, 180),
            link: "/support",
          },
        });
      }
      await writeAudit(tx, {
        req,
        action: "support.replied",
        entityType: "SupportMessage",
        entityId: source.id,
        targetUserId: source.userId || undefined,
        after: { replyId: created.id },
      });
      return created;
    });
    return res.status(201).json({ success: true, data: reply, message: "Ответ отправлен." });
  } catch (error) {
    console.error("[Support] Reply failed", error?.stack || error);
    return apiError(res, 500, "SUPPORT_REPLY_FAILED", "Не удалось отправить ответ.");
  }
});

router.delete("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return apiError(res, 400, "SUPPORT_ID_INVALID", "Некорректный ID обращения.");
  }

  try {
    const source = await prisma.supportMessage.findUnique({ where: { id } });
    if (!source) return apiError(res, 404, "SUPPORT_NOT_FOUND", "Обращение не найдено.");
    await prisma.$transaction(async (tx) => {
      await tx.supportMessage.delete({ where: { id } });
      await writeAudit(tx, {
        req,
        action: "support.deleted",
        entityType: "SupportMessage",
        entityId: id,
        targetUserId: source.userId || undefined,
      });
    });
    return res.json({ success: true, message: "Обращение удалено." });
  } catch (error) {
    console.error("[Support] Delete failed", error?.stack || error);
    return apiError(res, 500, "SUPPORT_DELETE_FAILED", "Не удалось удалить обращение.");
  }
});

module.exports = router;
