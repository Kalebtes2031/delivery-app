export default {
  notifications: "ማሳወቂያዎች",
  unread: "ያልተነበቡ",
  allCaughtUp: "ሁሉም ተነብቧል",
  markAll: "ሁሉንም ያንብቡ",
  noNotifications: "ምንም ማሳወቂያዎች የሉም",
  newAssignmentsHere: "አዳዲስ የማቅረብ ስራዎች እዚህ ይታያሉ",
  info: "መረጃ",
  noLinkedDelivery: "ለዚህ ማሳወቂያ የተገናኘ ማቅረብ አልተገኘም",
  deliveryNotFound: "ለዚህ ማሳወቂያ ማቅረብ አልተገኘም",
  justNow: "አሁን",
  minutesAgo: "ደቂቃ በፊት",
  hoursAgo: "ሰዓት በፊት",
  daysAgo: "ቀን በፊት",
  // ── Event translations for notification content ──
  events: {
    'delivery.assigned': {
      title: "አዲስ የማድረሻ ስራ",
      body: "ትዕዛዝ #{{vendor_order_id}} ከ{{company}}"
    },
    'delivery.out_for_delivery': {
      title: "ለማድረስ ወጥቷል",
      body: "ከ{{company}} የመጣው ትዕዛዝ ለማድረስ ወጥቷል"
    },
    'delivery.delivered': {
      title: "ማድረስ ተጠናቋል",
      body: "ከ{{company}} የመጣው ትዕዛዝ ተደርሷል"
    },
    'vendororder.new': {
      title: "አዲስ ትዕዛዝ",
      body: "አዲስ ትዕዛዝ #{{vendor_order_id}} ለ{{company}} — {{amount}} {{currency}}"
    },
    'vendororder.preparing': {
      title: "ትዕዛዝ በመዘጋጀት ላይ",
      body: "{{company}} ትዕዛዝዎን #{{vendor_order_id}} እያዘጋጀ ነው"
    },
    'order.paid': {
      title: "ክፍያ ተቀብሏል",
      body: "ትዕዛዝ #{{order_id}} ክፍያ {{amount}} {{currency}} ተከፍሏል"
    },
    'order.payment_failed': {
      title: "ክፍያ አልተሳካም",
      body: "ለትዕዛዝ #{{order_id}} ክፍያ አልተሳካም"
    }
  }
};