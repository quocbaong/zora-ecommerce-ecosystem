const http = require("http");
const conversationModel = require("../models/conversationModel");
const messageModel = require("../models/messageModel");
const reportModel = require("../models/reportModel");
const { publishReportCreated, publishUserBanned, sendPersistentNotification } = require("./notificationService");
const { getIO } = require("../config/socket");

// Correct messageModel import
const messageModel2 = require("../models/messageModel");

/**
 * HTTP PUT helper to contact auth-service
 */
const callAuthServiceBan = (userId, durationDays) => {
  return new Promise((resolve) => {
    const rawUrl = process.env.AUTH_SERVICE_URL || "http://localhost:8081";
    const authUrl = rawUrl.startsWith("http") ? rawUrl : `http://${rawUrl}`;
    let url = `${authUrl}/auth/internal/users/${userId}/ban`;
    if (durationDays) {
      url += `?durationDays=${durationDays}`;
    }
    const parsedUrl = new URL(url);

    const options = {
      method: "PUT",
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      headers: {
        "Content-Type": "application/json",
      },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(true);
        } else {
          console.error("Auth service ban failed:", data);
          resolve(false);
        }
      });
    });

    req.on("error", (e) => {
      console.error("Error calling auth service:", e.message);
      resolve(false);
    });

    req.end();
  });
};

/**
 * HTTP POST helper to contact user-service to issue a warning
 */
const callUserServiceWarning = (userId, reason) => {
  return new Promise((resolve) => {
    const rawUrl = process.env.USER_SERVICE_URL || (process.env.KAFKA_SERVER ? "http://user-service:8082" : "http://localhost:8082");
    const userUrl = rawUrl.startsWith("http") ? rawUrl : `http://${rawUrl}`;
    const url = `${userUrl}/users/admin/users/${userId}/warning`;
    const parsedUrl = new URL(url);

    const postData = JSON.stringify({ reason: reason || "Vi phạm quy tắc chat" });

    const options = {
      method: "POST",
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
        "X-Role": "ADMIN",
        "X-User-Id": "system-chat-service"
      },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(true);
        } else {
          console.error("User service warning failed:", data);
          resolve(false);
        }
      });
    });

    req.on("error", (e) => {
      console.error("Error calling user service warning:", e.message);
      resolve(false);
    });

    req.write(postData);
    req.end();
  });
};

/**
 * Socket.io notification emitter + Persistent notification
 */
const sendNotification = (userId, conversationId, text, type = "SYSTEM_ALERT") => {
  try {
    const io = getIO();
    io.to(`user:${userId}`).emit("new_notification", {
      conversationId: conversationId || "",
      fromUserId: "system",
      preview: text,
      type: "SYSTEM",
      timestamp: new Date().toISOString(),
    });
  } catch (_) {
    // Socket.io not initialized or other issue
  }
  
  // Fire and forget persistent notification
  sendPersistentNotification(userId, type, "Thông báo kiểm duyệt", text).catch(() => {});
};

/**
 * Get the last N messages from a conversation for evidence snapshot
 */
const fetchEvidenceMessages = async (conversationId, limit = 20) => {
  try {
    const result = await messageModel2.getMessages(conversationId, null, limit);
    return result.messages || [];
  } catch (err) {
    console.error("Error fetching evidence messages:", err.message);
    return [];
  }
};

/**
 * Find the reported user in a conversation
 * For private chat: the other user
 */
const findReportedUser = async (conversationId, reporterId) => {
  try {
    const conversation = await conversationModel.getConversationById(
      conversationId
    );
    if (!conversation) return null;

    if (conversation.conversationType === "PRODUCT" || conversation.conversationType === "DIRECT") {
      if (conversation.userId === reporterId) {
        return conversation.sellerId;
      } else if (conversation.sellerId === reporterId) {
        return conversation.userId;
      }
    }
    return null;
  } catch (err) {
    console.error("Error finding reported user:", err.message);
    return null;
  }
};

/**
 * Verify user has access to report a conversation
 */
const verifyReportAccess = async (conversationId, reporterId) => {
  const userRecord = await conversationModel.getUserConversationRecord(
    reporterId,
    conversationId
  );

  if (userRecord) return userRecord;

  const conversation = await conversationModel.getConversationById(conversationId);
  if (!conversation) {
    const err = new Error("Conversation not found");
    err.status = 404;
    throw err;
  }

  if (conversation.userId !== reporterId && conversation.sellerId !== reporterId) {
    const err = new Error("Access denied");
    err.status = 403;
    throw err;
  }

  return conversation;
};

/**
 * Main function to submit a report
 */
const submitReport = async ({
  conversationId,
  reporterId,
  reason,
  description,
  evidenceMessageIds = [],
  evidenceImages = [],
}) => {
  // Validate conversation access (throws 404/403)
  await verifyReportAccess(conversationId, reporterId);

  // Find the reported user
  const reportedUserId = await findReportedUser(conversationId, reporterId);

  if (!reportedUserId) {
    const err = new Error("Reported user could not be determined for this conversation");
    err.status = 400;
    throw err;
  }

  if (reportedUserId === reporterId) {
    const err = new Error("Cannot report yourself");
    err.status = 400;
    throw err;
  }

  // Fetch last 20 messages for evidence snapshot
  const evidenceMessages = await fetchEvidenceMessages(conversationId, 20);

  // Create the report in DynamoDB
  const report = await reportModel.createReport({
    reporterId,
    reportedUserId,
    conversationId,
    reason,
    description,
    evidenceMessages,
    evidenceImages,
  });

  // Notify reporter
  sendNotification(reporterId, conversationId, "Báo cáo của bạn đã được gửi thành công.", "SYSTEM_ALERT");

  // Publish Kafka event - fail-safe check
  try {
    await publishReportCreated(report);
  } catch (kafkaError) {
    console.warn("Failed to publish report_created event to Kafka:", kafkaError.message);
  }

  return report;
};

/**
 * Get all reports by conversation (admin view)
 */
const getReportsByConversation = async (conversationId, limit = 20, lastKey) => {
  return await reportModel.getReportsByConversation(
    conversationId,
    limit,
    lastKey
  );
};

/**
 * Get all reports by status (admin dashboard)
 */
const getReportsByStatus = async (status, limit = 20, lastKey) => {
  return await reportModel.getReportsByStatus(status, limit, lastKey);
};

/**
 * Update report status (admin action)
 */
const updateReportStatus = async (reportId, { status, adminNote, moderationAction, resolvedBy }) => {
  const report = await reportModel.getReportById(reportId);
  if (!report) {
    const err = new Error("Report not found");
    err.status = 404;
    throw err;
  }

  const now = new Date().toISOString();
  const wasResolved = report.status === "RESOLVED";
  const wasRejected = report.status === "REJECTED";
  const reportedUserId = report.reportedUserId;

  const updateData = { status, adminNote };

  if (status === "RESOLVED") {
    updateData.moderationAction = moderationAction || "NONE";
    updateData.resolvedAt = now;
    updateData.resolvedBy = resolvedBy || "";
  } else if (status === "REJECTED") {
    updateData.rejectedAt = now;
  }

  const updatedReport = await reportModel.updateReportStatus(reportId, updateData);

  // Handle transitions
  if (status === "RESOLVED") {
    // 1. Transitioning to RESOLVED from non-RESOLVED: Increment violation count once
    if (!wasResolved) {
      const userMetadata = await reportModel.getUserMetadata(reportedUserId);
      const newViolationCount = (userMetadata.violationCount || 0) + 1;

      let isBanned = userMetadata.banned || false;
      let bannedAt = userMetadata.bannedAt || null;
      let accountStatus = userMetadata.accountStatus || "ACTIVE";

      let mutedUntil = null; // No more auto-mute

      if (moderationAction === "WARNING") {
        // Send warning to user-service so it records the warning
        await callUserServiceWarning(reportedUserId, report.reason || "Vi phạm quy tắc chat");
      }

      // Auto-ban only if the admin explicitly chose BANNED or BAN_7D action.
      if (!isBanned && (moderationAction === "BANNED" || moderationAction === "BAN_7D")) {
        isBanned = true;
        bannedAt = now;
        accountStatus = "BANNED";

        // Call auth-service to ban the user
        try {
          const durationDays = moderationAction === "BAN_7D" ? 7 : undefined;
          await callAuthServiceBan(reportedUserId, durationDays);
        } catch (authErr) {
          console.error(`Auth service sync failed for user ${reportedUserId}:`, authErr.message);
        }
        // Publish Kafka event
        await publishUserBanned(reportedUserId, moderationAction === "BAN_7D" ? "Vi phạm nội quy (Khóa 7 ngày)" : "Vi phạm nhiều lần");
      }

      // Save updated metadata to DynamoDB
      await reportModel.updateUserMetadata(reportedUserId, {
        violationCount: newViolationCount,
        banned: isBanned,
        bannedAt,
        accountStatus,
        mutedUntil,
      });

      // Send status-resolved notifications (always sent when status becomes RESOLVED)
      sendNotification(report.reporterId, report.conversationId, "Báo cáo của bạn đã được xử lý.", "REPORT_RESOLVED");
      sendNotification(reportedUserId, report.conversationId, "Tài khoản của bạn đã bị xử lý do vi phạm quy tắc chat.", "SYSTEM_ALERT");

      // Send action-specific notification
      if (isBanned) {
        sendNotification(reportedUserId, report.conversationId, moderationAction === "BAN_7D" ? "Tài khoản của bạn đã bị khóa 7 ngày. Vui lòng liên hệ hỗ trợ để kháng nghị." : "Tài khoản của bạn đã bị khóa vĩnh viễn do vi phạm nhiều lần. Vui lòng liên hệ hỗ trợ để kháng nghị.", "ACCOUNT_BANNED");
      } else {
        if (moderationAction === "WARNING") {
          sendNotification(reportedUserId, report.conversationId, "Tài khoản của bạn đã bị cảnh cáo do vi phạm quy tắc chat.", "WARNING");
        }
      }
    } else {
      // 2. It was already RESOLVED, but admin updates action / adminNote
      const oldAction = report.moderationAction || "NONE";
      const newAction = moderationAction || "NONE";

      if (oldAction !== newAction) {
        const userMetadata = await reportModel.getUserMetadata(reportedUserId);
        const updates = {};
        let mutedUntil = userMetadata.mutedUntil || null;

        if (newAction === "BANNED" || newAction === "BAN_7D") {
          if (!userMetadata.banned) {
            updates.banned = true;
            updates.bannedAt = now;
            updates.accountStatus = "BANNED";
            
            try {
              const durationDays = newAction === "BAN_7D" ? 7 : undefined;
              await callAuthServiceBan(reportedUserId, durationDays);
            } catch (authErr) {
              console.error(`Auth service sync failed for user ${reportedUserId}:`, authErr.message);
            }
            await publishUserBanned(reportedUserId, newAction === "BAN_7D" ? "Khóa tài khoản 7 ngày bởi admin" : "Bị khóa bởi admin");
          }
        } else {
          // If changing from BANNED to something else, UNBAN the user
          if ((oldAction === "BANNED" || oldAction === "BAN_7D") && userMetadata.banned) {
             updates.banned = false;
             updates.bannedAt = null;
             updates.accountStatus = "ACTIVE";
             try {
                await callAuthServiceUnban(reportedUserId);
             } catch (authErr) {
                console.error(`Auth service sync unban failed for user ${reportedUserId}:`, authErr.message);
             }
          }
          
          if (newAction === "WARNING" || newAction === "NONE") {
            // Send warning to user-service
            if (newAction === "WARNING") {
              await callUserServiceWarning(reportedUserId, report.reason || "Vi phạm quy tắc chat");
            }
          }
        }

        await reportModel.updateUserMetadata(reportedUserId, updates);

        // Notify about the new action (preventing duplicate notification by only sending on action change)
        if (userMetadata.banned) {
          sendNotification(reportedUserId, report.conversationId, newAction === "BAN_7D" ? "Tài khoản của bạn đã bị khóa 7 ngày. Vui lòng liên hệ hỗ trợ để kháng nghị." : "Tài khoản của bạn đã bị khóa vĩnh viễn do vi phạm nhiều lần. Vui lòng liên hệ hỗ trợ để kháng nghị.", "ACCOUNT_BANNED");
        } else {
          if (newAction === "WARNING") {
            sendNotification(reportedUserId, report.conversationId, "Tài khoản của bạn đã bị cảnh cáo do vi phạm quy tắc chat.", "SYSTEM_ALERT");
          }
        }
      }
    }
  } else if (status === "REJECTED") {
    // 3. Transition from RESOLVED to REJECTED: decrement violationCount
    if (wasResolved) {
      const userMetadata = await reportModel.getUserMetadata(reportedUserId);
      const newViolationCount = Math.max(0, (userMetadata.violationCount || 0) - 1);
      const updates = {
        violationCount: newViolationCount,
      };

      // Also clear mutedUntil safely if transitioning from a mute action to REJECTED
      const oldAction = report.moderationAction || "NONE";
      if (oldAction === "MUTE_24H" || oldAction === "MUTE_7D") {
        updates.mutedUntil = null;
      }

      await reportModel.updateUserMetadata(reportedUserId, updates);

      sendNotification(report.reporterId, report.conversationId, "Báo cáo của bạn không đủ bằng chứng vi phạm.", "REPORT_RESOLVED");
    } else if (!wasRejected) {
      // 4. Transition from PENDING to REJECTED
      sendNotification(report.reporterId, report.conversationId, "Báo cáo của bạn không đủ bằng chứng vi phạm.", "REPORT_RESOLVED");
    }
  }

  return updatedReport;
};

/**
 * Get report details
 */
const getReportById = async (reportId) => {
  return await reportModel.getReportById(reportId);
};

/**
 * Get user's reports (user dashboard)
 */
const getUserReports = async (userId, limit = 20, lastKey) => {
  return await reportModel.getReportsByReporter(userId, limit, lastKey);
};

const getUserMetadata = async (userId) => {
  return await reportModel.getUserMetadata(userId);
};

const unbanUser = async (userId) => {
  await reportModel.updateUserMetadata(userId, {
    banned: false,
    accountStatus: "ACTIVE",
    mutedUntil: null
  });
  // Send notification to user via socket if they are somehow online
  sendNotification(userId, null, "Tài khoản của bạn đã được mở khóa. Bạn có thể chat bình thường.", "SYSTEM_ALERT");
};

const updateUserChatBan = async (userId, chatBanUntil) => {
  await reportModel.updateUserMetadata(userId, {
    mutedUntil: chatBanUntil
  });
  sendNotification(userId, null, "Tài khoản của bạn đã bị cấm chat theo hệ thống cảnh cáo 3 lần.", "SYSTEM_ALERT");
};

module.exports = {
  submitReport,
  getReportsByConversation,
  getReportsByStatus,
  updateReportStatus,
  getReportById,
  getUserReports,
  getUserMetadata,
  fetchEvidenceMessages,
  findReportedUser,
  verifyReportAccess,
  unbanUser,
  updateUserChatBan,
};
