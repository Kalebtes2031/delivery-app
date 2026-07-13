export default {
  notifications: "Notifications",
  unread: "unread",
  allCaughtUp: "You're all caught up",
  markAll: "Mark all",
  noNotifications: "No notifications yet",
  newAssignmentsHere: "New delivery assignments will appear here.",
  info: "Info",
  noLinkedDelivery: "No linked delivery found for this notification",
  deliveryNotFound: "Delivery not found for this notification",
  justNow: "just now",
  minutesAgo: "minutes ago",
  hoursAgo: "hours ago",
  daysAgo: "days ago",
  // ── Event translations for notification content ──
  events: {
    'delivery.assigned': {
      title: "New Delivery Assignment",
      body: "Order #{{vendor_order_id}} from {{company}}"
    },
    'delivery.out_for_delivery': {
      title: "Out for Delivery",
      body: "Order from {{company}} is out for delivery"
    },
    'delivery.delivered': {
      title: "Delivery Completed",
      body: "Order from {{company}} has been delivered"
    },
    'vendororder.new': {
      title: "New Order",
      body: "New order #{{vendor_order_id}} for {{company}} — {{amount}} {{currency}}"
    },
    'vendororder.preparing': {
      title: "Order Preparing",
      body: "{{company}} is now preparing your order #{{vendor_order_id}}"
    },
    'order.paid': {
      title: "Payment Received",
      body: "Order #{{order_id}} paid {{amount}} {{currency}}"
    },
    'order.payment_failed': {
      title: "Payment Failed",
      body: "Payment for order #{{order_id}} failed"
    }
  }
};