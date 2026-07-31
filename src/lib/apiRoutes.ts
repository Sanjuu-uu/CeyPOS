const encode = encodeURIComponent;

export const API_ROUTES = {
  health: "/api/health",
  analytics: {
    chat: "/api/analytics/chat",
    chatStream: "/api/analytics/chat/stream",
    chats: "/api/analytics/chats",
    chatsForShop(shopId: string, userEmail?: string) {
      const params = new URLSearchParams({ shopId });
      if (userEmail) params.set("userEmail", userEmail);
      return `/api/analytics/chats?${params.toString()}`;
    },
    conversation(conversationId: string) {
      return `/api/analytics/chats/${encode(conversationId)}`;
    },
    conversationForShop(conversationId: string, shopId: string, userEmail?: string) {
      const params = new URLSearchParams({ shopId });
      if (userEmail) params.set("userEmail", userEmail);
      return `/api/analytics/chats/${encode(conversationId)}?${params.toString()}`;
    },
    conversationMessagesStream(conversationId: string) {
      return `/api/analytics/chats/${encode(conversationId)}/messages/stream`;
    },
  },
  admin: {
    status: "/api/admin/status",
    backupsRun: "/api/admin/backups/run",
    backupsRecover: "/api/admin/backups/recover",
    shopExport(shopId: string) {
      return `/api/admin/shops/${encode(shopId)}/export`;
    },
    supportConversations: "/api/admin/support/conversations",
    supportConversation(conversationId: string) {
      return `/api/admin/support/conversations/${encode(conversationId)}`;
    },
    supportConversationMessages(conversationId: string) {
      return `/api/admin/support/conversations/${encode(conversationId)}/messages`;
    },
    merchantSupportConversation(conversationId: string) {
      return `/api/admin/support/conversations/${encode(conversationId)}/merchant`;
    },
  },
  shop: {
    setup: "/api/shop/setup",
    meta(shopId: string, userEmail?: string) {
      const base = `/api/shop/${encode(shopId)}/meta`;
      return userEmail ? `${base}?userEmail=${encode(userEmail)}` : base;
    },
    snapshot(shopId: string, userEmail?: string) {
      const base = `/api/shop/${encode(shopId)}/snapshot`;
      return userEmail ? `${base}?userEmail=${encode(userEmail)}` : base;
    },
    exists(shopId: string, ownerEmail?: string, userEmail?: string) {
      const base = `/api/shop/${encode(shopId)}/exists`;
      const params = new URLSearchParams();
      if (ownerEmail) params.set("ownerEmail", ownerEmail);
      if (userEmail) params.set("userEmail", userEmail);
      const query = params.toString();
      return query ? `${base}?${query}` : base;
    },
  },
  inventory: {
    template: "/api/inventory/template",
    upload: "/api/inventory/upload",
    delete(shopId: string, inventoryCode: string) {
      return `/api/inventory/${encode(shopId)}/${encode(inventoryCode)}`;
    },
    bulkDelete(shopId: string) {
      return `/api/inventory/${encode(shopId)}/bulk-delete`;
    },
    operations(shopId: string) {
      return `/api/inventory/${encode(shopId)}/operations`;
    },
    suppliers(shopId: string) {
      return `/api/inventory/${encode(shopId)}/suppliers`;
    },
    purchaseOrders(shopId: string) {
      return `/api/inventory/${encode(shopId)}/purchase-orders`;
    },
    goodsReceived(shopId: string) {
      return `/api/inventory/${encode(shopId)}/goods-received`;
    },
    purchaseReturns(shopId: string) {
      return `/api/inventory/${encode(shopId)}/purchase-returns`;
    },
    adjustments(shopId: string) {
      return `/api/inventory/${encode(shopId)}/adjustments`;
    },
    stockCounts(shopId: string) {
      return `/api/inventory/${encode(shopId)}/stock-counts`;
    },
    variants(shopId: string) {
      return `/api/inventory/${encode(shopId)}/variants`;
    },
  },
  sales: {
    complete: "/api/sales/complete",
    bulkSync: "/api/sales/bulk-sync",
  },
  businessRules: {
    byShop(shopId: string) {
      return `/api/business-rules/${encode(shopId)}`;
    },
  },
  paymentMethods: {
    byShop(shopId: string) {
      return `/api/payment-methods/${encode(shopId)}`;
    },
  },
  notifications: {
    list(query: URLSearchParams | string) {
      return `/api/notifications?${String(query)}`;
    },
    read(notificationId: string, query: URLSearchParams | string) {
      return `/api/notifications/${encode(notificationId)}/read?${String(query)}`;
    },
    readAll(query: URLSearchParams | string) {
      return `/api/notifications/read-all?${String(query)}`;
    },
    preferences(query?: URLSearchParams | string) {
      return query ? `/api/notifications/preferences?${String(query)}` : "/api/notifications/preferences";
    },
  },
  receipts: {
    mintToken: "/api/receipts/mint-token",
    publicByToken(token: string) {
      return `/api/email-receipts/public/${encode(token)}`;
    },
  },
  emailReceipts: {
    send: "/api/email-receipts/send",
    status: "/api/email-receipts/status",
  },
  smsReceipts: {
    send: "/api/sms-receipts/send",
    status: "/api/sms-receipts/status",
  },
  subscription: {
    plans: "/api/subscription/plans",
    status(query: URLSearchParams | string) {
      return `/api/subscription/status?${String(query)}`;
    },
    checkout: "/api/subscription/checkout",
    cancel: "/api/subscription/cancel",
    retry: "/api/subscription/retry",
  },
  mobile: {
    sessionsCreate: "/api/mobile/sessions/create",
    sessionsValidate: "/api/mobile/sessions/validate",
    sessionsRevoke: "/api/mobile/sessions/revoke",
    importProduct: "/api/mobile/import-product",
  },
  team: {
    lookupOwner: "/api/team/lookup-owner",
    verifySendCode: "/api/team/verify/send-code",
    verifyCheckCode: "/api/team/verify/check-code",
    register: "/api/team/register",
    cancelOnboard: "/api/team/cancel-onboard",
    context(query: URLSearchParams | string) {
      return `/api/team/context?${String(query)}`;
    },
    members(query: URLSearchParams | string) {
      return `/api/team/members?${String(query)}`;
    },
    member(memberId: string) {
      return `/api/team/members/${encode(memberId)}`;
    },
  },
  terminals: {
    primaryEnsure: "/api/terminals/primary/ensure",
    pairingCodeCreate: "/api/terminals/pairing-code/create",
    pairingRequest: "/api/terminals/pairing/request",
    pairingClaim: "/api/terminals/pairing/claim",
    pairingApprove: "/api/terminals/pairing/approve",
    pairingReject: "/api/terminals/pairing/reject",
    pairingStatus(requestId: string, query?: URLSearchParams | string) {
      const base = `/api/terminals/pairing/status/${encode(requestId)}`;
      return query ? `${base}?${String(query)}` : base;
    },
    pairingPending(query: URLSearchParams | string) {
      return `/api/terminals/pairing/pending?${String(query)}`;
    },
    active(query: URLSearchParams | string) {
      return `/api/terminals/active?${String(query)}`;
    },
    shifts(query: URLSearchParams | string) {
      return `/api/terminals/shifts?${String(query)}`;
    },
    shiftsOpen: "/api/terminals/shifts/open",
    shiftsMovement: "/api/terminals/shifts/movement",
    shiftsClose: "/api/terminals/shifts/close",
    revoke: "/api/terminals/revoke",
  },
} as const;
