import analyticsRoutes from "./analytics.js";
import inventoryRouter from "./inventory.js";
import shopRouter from "./shop.js";
import salesRoutes from "./sales.js";
import paymentMethodRoutes from "./payment-methods.js";
import businessRulesRoutes from "./business-rules.js";
import mobileSessionRoutes from "./mobile-sessions.js";
import teamMemberRoutes from "./team-members.js";
import terminalRoutes from "./terminals.js";
import analyticsChatRoutes from "./analytics-chat.js";
import emailReceiptRoutes from "./email-receipts.js";
import smsReceiptRoutes from "./sms-receipts.js";
import receiptRoutes from "./receipts.js";
import subscriptionRoutes from "./subscription.js";
import notificationRoutes from "./notifications.js";
import adminOpsRoutes from "./admin-ops.js";
import { API_MOUNTS } from "./paths.js";

export function registerApiRoutes(app) {
  app.use(API_MOUNTS.analytics, analyticsRoutes);
  app.use(API_MOUNTS.inventory, inventoryRouter);
  app.use(API_MOUNTS.shop, shopRouter);
  app.use(API_MOUNTS.sales, salesRoutes);
  app.use(API_MOUNTS.paymentMethods, paymentMethodRoutes);
  app.use(API_MOUNTS.businessRules, businessRulesRoutes);
  app.use(API_MOUNTS.mobile, mobileSessionRoutes);
  app.use(API_MOUNTS.team, teamMemberRoutes);
  app.use(API_MOUNTS.terminals, terminalRoutes);
  app.use(API_MOUNTS.analyticsChats, analyticsChatRoutes);
  app.use(API_MOUNTS.emailReceipts, emailReceiptRoutes);
  app.use(API_MOUNTS.smsReceipts, smsReceiptRoutes);
  app.use(API_MOUNTS.receipts, receiptRoutes);
  app.use(API_MOUNTS.subscription, subscriptionRoutes);
  app.use(API_MOUNTS.notifications, notificationRoutes);
  app.use(API_MOUNTS.admin, adminOpsRoutes);
}
