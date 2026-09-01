# OliTechs PMS/POS — Hotel Feature Roadmap

This release adds the foundational room-inventory model: room types, room setup, rate-plan storage, richer reservations, and housekeeping tasks. The existing PMS/POS remains intact.

## Recommended full hotel feature set

### Front desk / PMS
- Live occupancy dashboard and room status board
- Room types and individual rooms
- Multi-room / group reservations
- Availability search and date-range conflict checking
- Walk-ins, check-in, check-out, early check-in and late check-out
- Room moves, room upgrades/downgrades, split/merge reservations
- No-show, cancellation, waitlist and overbooking controls
- Confirmation numbers and printable/email confirmations
- Guest profiles, ID/passport details, preferences and repeat-guest history
- Company/agent profiles and negotiated rates
- Rate plans, seasons, weekend rates, packages and restrictions
- Deposits, refunds, advance payments and folios
- City ledger / house accounts
- Taxes, service charge, discounts and inclusive/exclusive pricing
- Night audit, end-of-day closing and shift handover
- Cashier sessions and cashier reconciliation

### Housekeeping
- Live room-status board
- Cleaning tasks, assignments and priorities
- Inspection workflow
- Lost & found
- Linen/minibar tracking
- Out-of-order / out-of-service rooms
- Housekeeping productivity reports

### POS
- Restaurant/bar ordering
- Table/floor plans
- Split bills and seat-based ordering
- Discounts, voids, refunds and manager approvals
- Open tabs and transfers
- Kitchen/bar routing and KDS
- Recipes and ingredient depletion
- Stock counts, purchasing, suppliers and wastage
- Room-charge posting to guest folios
- M-Pesa/card/cash payment reconciliation
- Receipt printing and kitchen printing

### Finance / reporting
- Daily revenue and departmental revenue
- Occupancy, ADR and RevPAR
- Pickup / booking pace
- Revenue by room type and rate plan
- Payment-method reconciliation
- Tax reports
- Folio and outstanding-balance reports
- POS sales, product mix and cashier reports
- Profit/margin reporting when cost data is available
- Export to CSV/PDF and accounting integrations

### Operations
- Staff accounts and granular roles
- Shift scheduling and attendance
- Maintenance tickets and preventive maintenance
- Inventory and purchasing
- Suppliers and purchase orders
- Notifications and task inbox
- Audit log for sensitive changes
- Multi-branch / multi-property support
- Property branding, currency, timezone and tax configuration

### Guest experience / distribution
- Online booking engine
- Booking confirmation emails/SMS/WhatsApp
- Guest self-service portal
- Digital registration card
- OTA/channel-manager integration
- Direct booking website/widget
- Corporate/agent booking portal

### Platform / security
- Strong tenant isolation
- Role-based permissions by module/action
- Approval workflows for discounts, refunds and voids
- Backups and recovery procedures
- API/webhook integration layer
- Observability/error logging
- PWA/offline-aware POS for network interruptions

## Next implementation priorities

1. Rate plans + availability calendar
2. Guest profiles + reservation detail/folio screen
3. Housekeeping task assignment + inspections
4. Night audit + cashier shift reconciliation
5. Purchase orders + suppliers + stock consumption
6. Advanced POS discounts/voids/refunds/approvals
7. Financial and hotel KPI reports
8. Online booking/channel integrations


## Room Planner
- Monthly room-by-room calendar with grouped room types.
- Booking bars span arrival through departure and are color-coded by stay status.
- Month navigation, Today, refresh, and Add Booking hooks.
- Calendar remains visible when a property has zero rooms, with a guided empty state.
- Room setup remains available under Room Types & Setup.
