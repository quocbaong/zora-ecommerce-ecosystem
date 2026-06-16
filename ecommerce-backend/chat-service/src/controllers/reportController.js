const reportService = require("../services/reportService");
const { ReportReason, ReportStatus } = require("../models/reportModel");

/**
 * POST /api/chat/conversations/:conversationId/report
 * Submit a report for a conversation or user
 */
const submitReport = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { reason, description, evidenceMessageIds, evidenceImages } = req.body;
    const reporterId = req.userId;

    // Validate conversationId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!conversationId || !uuidRegex.test(conversationId)) {
      return res.status(400).json({ success: false, error: "Invalid conversationId format" });
    }

    if (!reason || typeof reason !== "string") {
      return res.status(400).json({ success: false, error: "reason is required" });
    }

    const normalizedReason = reason.trim().toUpperCase();
    if (!Object.values(ReportReason).includes(normalizedReason)) {
      return res.status(400).json({ success: false, error: "Invalid reason" });
    }

    if (!description || typeof description !== "string" || description.trim().length < 5) {
      return res.status(400).json({
        success: false,
        error: "Description must be a string of at least 5 characters",
      });
    }

    if (evidenceMessageIds && !Array.isArray(evidenceMessageIds)) {
      return res.status(400).json({
        success: false,
        error: "evidenceMessageIds must be an array",
      });
    }

    if (evidenceImages && !Array.isArray(evidenceImages)) {
      return res.status(400).json({
        success: false,
        error: "evidenceImages must be an array",
      });
    }

    // Submit report
    const report = await reportService.submitReport({
      conversationId,
      reporterId,
      reason: normalizedReason,
      description: description.trim(),
      evidenceMessageIds: evidenceMessageIds || [],
      evidenceImages: evidenceImages || [],
    });

    res.status(201).json({
      reportId: report.reportId,
    });
  } catch (err) {
    console.error("Error submitting report:", err);
    require('fs').writeFileSync('report_error.log', err.stack || err.message);
    const status = err.status || 500;
    res.status(status).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/chat/conversations/:conversationId/reports
 * Get all reports for a conversation (admin)
 */
const getConversationReports = async (req, res) => {
  try {
    if (req.userRole !== "ADMIN") {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    const { conversationId } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const lastKey = req.query.lastKey || null;

    if (!conversationId || !conversationId.trim()) {
      return res
        .status(400)
        .json({ success: false, error: "conversationId is required" });
    }

    const result = await reportService.getReportsByConversation(
      conversationId,
      limit,
      lastKey
    );

    const formattedReports = await Promise.all(
      result.reports.map(async (r) => {
        const userMeta = await reportService.getUserMetadata(r.reportedUserId);
        return {
          reportId: r.reportId,
          reporterId: r.reporterId,
          reportedUserId: r.reportedUserId,
          conversationId: r.conversationId,
          reason: r.reason,
          description: r.description,
          status: r.status,
          evidence: r.evidence,
          evidenceImages: r.evidenceImages || [],
          createdAt: r.createdAt,
          adminNote: r.adminNote || "",
          moderationAction: r.moderationAction || (r.status === "RESOLVED" ? "NONE" : null),
          resolvedAt: r.resolvedAt || null,
          rejectedAt: r.rejectedAt || null,
          violationCount: userMeta ? userMeta.violationCount : 0,
          banned: userMeta ? userMeta.banned : false,
        };
      })
    );

    res.json({
      success: true,
      data: formattedReports,
      nextKey: result.nextKey,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/chat/admin/reports
 * Get all reports filtered by status (admin dashboard)
 */
const getReports = async (req, res) => {
  try {
    if (req.userRole !== "ADMIN") {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    const status = req.query.status || ReportStatus.PENDING;
    const limit = parseInt(req.query.limit) || 20;
    const lastKey = req.query.lastKey || null;

    if (!Object.values(ReportStatus).includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${Object.values(ReportStatus).join(", ")}`,
      });
    }

    const result = await reportService.getReportsByStatus(
      status,
      limit,
      lastKey
    );

    const formattedReports = await Promise.all(
      result.reports.map(async (r) => {
        const userMeta = await reportService.getUserMetadata(r.reportedUserId);
        return {
          reportId: r.reportId,
          reporterId: r.reporterId,
          reportedUserId: r.reportedUserId,
          conversationId: r.conversationId,
          reason: r.reason,
          description: r.description,
          status: r.status,
          evidence: r.evidence,
          evidenceImages: r.evidenceImages || [],
          createdAt: r.createdAt,
          adminNote: r.adminNote || "",
          moderationAction: r.moderationAction || (r.status === "RESOLVED" ? "NONE" : null),
          resolvedAt: r.resolvedAt || null,
          rejectedAt: r.rejectedAt || null,
          violationCount: userMeta ? userMeta.violationCount : 0,
          banned: userMeta ? userMeta.banned : false,
        };
      })
    );

    res.json({
      success: true,
      data: formattedReports,
      nextKey: result.nextKey,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/chat/admin/reports/:reportId
 * Get a single report details
 */
const getReportDetail = async (req, res) => {
  try {
    if (req.userRole !== "ADMIN") {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    const reportId = req.params.reportId || req.params.id;
    if (!reportId || !reportId.trim()) {
      return res
        .status(400)
        .json({ success: false, error: "reportId is required" });
    }

    const report = await reportService.getReportById(reportId);

    if (!report) {
      return res
        .status(404)
        .json({ success: false, error: "Report not found" });
    }

    const userMeta = await reportService.getUserMetadata(report.reportedUserId);
    const formattedReport = {
      reportId: report.reportId,
      reporterId: report.reporterId,
      reportedUserId: report.reportedUserId,
      conversationId: report.conversationId,
      reason: report.reason,
      description: report.description,
      status: report.status,
      evidence: report.evidence,
      evidenceImages: report.evidenceImages || [],
      adminNote: report.adminNote || "",
      moderationAction: report.moderationAction || (report.status === "RESOLVED" ? "NONE" : null),
      resolvedAt: report.resolvedAt || null,
      rejectedAt: report.rejectedAt || null,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      violationCount: userMeta ? userMeta.violationCount : 0,
      banned: userMeta ? userMeta.banned : false,
    };

    res.json({ success: true, data: formattedReport });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * PATCH /api/chat/admin/reports/:reportId
 * Update report status (admin action)
 */
const updateReportStatus = async (req, res) => {
  try {
    if (req.userRole !== "ADMIN") {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    const reportId = req.params.reportId || req.params.id;
    if (!reportId || !reportId.trim()) {
      return res
        .status(400)
        .json({ success: false, error: "reportId is required" });
    }

    const { status, adminNote, action } = req.body;
    console.log("UPDATE REPORT STATUS request body:", req.body);

    if (!status || (status !== ReportStatus.RESOLVED && status !== ReportStatus.REJECTED)) {
      console.log("Returning 400: Invalid status", status);
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${ReportStatus.RESOLVED}, ${ReportStatus.REJECTED}`,
      });
    }

    let moderationAction = "NONE";
    if (status === ReportStatus.RESOLVED) {
      if (action) {
        const allowedActions = ["NONE", "WARNING", "BAN_7D", "BANNED"];
        if (!allowedActions.includes(action.toUpperCase())) {
          console.log("Returning 400: Invalid moderation action", action);
          return res.status(400).json({
            success: false,
            error: `Invalid moderation action. Must be one of: ${allowedActions.join(", ")}`,
          });
        }
        moderationAction = action.toUpperCase();
      }
    }

    const report = await reportService.updateReportStatus(reportId, {
      status,
      adminNote: adminNote || "",
      moderationAction,
      resolvedBy: req.userId,
    });

    const userMeta = await reportService.getUserMetadata(report.reportedUserId);
    const formattedReport = {
      reportId: report.reportId,
      reporterId: report.reporterId,
      reportedUserId: report.reportedUserId,
      conversationId: report.conversationId,
      reason: report.reason,
      description: report.description,
      status: report.status,
      evidence: report.evidence,
      adminNote: report.adminNote || "",
      moderationAction: report.moderationAction || (report.status === "RESOLVED" ? "NONE" : null),
      resolvedAt: report.resolvedAt || null,
      rejectedAt: report.rejectedAt || null,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      violationCount: userMeta ? userMeta.violationCount : 0,
      banned: userMeta ? userMeta.banned : false,
    };

    res.json({
      success: true,
      message: "Report status updated successfully",
      data: formattedReport,
    });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/chat/my-reports
 * Get user's own reports
 */
const getUserReports = async (req, res) => {
  try {
    const userId = req.userId;
    const limit = parseInt(req.query.limit) || 20;
    const lastKey = req.query.lastKey || null;

    const result = await reportService.getUserReports(userId, limit, lastKey);

    const formattedReports = result.reports.map((r) => ({
      reportId: r.reportId,
      reporterId: r.reporterId,
      reportedUserId: r.reportedUserId,
      conversationId: r.conversationId,
      reason: r.reason,
      description: r.description,
      status: r.status,
      evidence: r.evidence,
      evidenceImages: r.evidenceImages || [],
      createdAt: r.createdAt,
      adminNote: r.adminNote || "",
      moderationAction: r.moderationAction || (r.status === "RESOLVED" ? "NONE" : null),
      resolvedAt: r.resolvedAt || null,
      rejectedAt: r.rejectedAt || null,
    }));

    res.json({
      success: true,
      data: formattedReports,
      nextKey: result.nextKey,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  submitReport,
  getConversationReports,
  getReports,
  getReportDetail,
  updateReportStatus,
  getUserReports,
};
