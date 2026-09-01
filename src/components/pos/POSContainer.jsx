import React, { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useStore } from '@/data/AppStore';
import { tableLabel } from '@/data/mockData';
import AppHeader from '@/components/pos/AppHeader';
import FloorPlan from '@/components/pos/FloorPlan';
import OrderTaking from '@/components/pos/OrderTaking';
import BillPayment from '@/components/pos/BillPayment';
import OpenTableDialog from '@/components/pos/OpenTableDialog';

function buildKitchenTicketText(center, lines, { orderNumber, table }) {
	return [
		'VISIWA BEACH RESORT',
		`${center.toUpperCase()} TICKET`,
		`${orderNumber} · Table ${tableLabel(table)}`,
		new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }),
		'--------------------------------',
		...lines.map((l) => `${l.qty}x ${l.name}`),
		'--------------------------------',
	].join('\n');
}

// Owns the floor → order → bill flow for the POS module: table selection,
// opening a new table session, taking an order, and settling the bill.
export default function POSContainer() {
	const store = useStore();
	const [activeTab, setActiveTab] = useState('floor');
	const [activeTable, setActiveTable] = useState(null);
	const [pendingTable, setPendingTable] = useState(null); // table awaiting "open" dialog
	// Order lines are kept per-table so switching tabs/tables doesn't lose an in-progress order.
	const [orderLinesByTable, setOrderLinesByTable] = useState({});

	// Stable per-table order numbers (regenerated each time a table is opened).
	const orderNumbersRef = useRef({});
	const orderLines = activeTable ? orderLinesByTable[activeTable.id] || [] : [];
	const setOrderLines = useCallback((updater) => {
		if (!activeTable) return;
		setOrderLinesByTable((prev) => {
			const current = prev[activeTable.id] || [];
			const next = typeof updater === 'function' ? updater(current) : updater;
			return { ...prev, [activeTable.id]: next };
		});
	}, [activeTable]);

	const handleTableSelect = (table) => {
		const session = store.getSession(table.id);
		if (!session) {
			// Free table — ask for guests/waiter before opening an order.
			setPendingTable(table);
			return;
		}
		if (!orderNumbersRef.current[table.id]) {
			orderNumbersRef.current[table.id] = `ORD-${String(table.number).padStart(3, '0')}-${Math.floor(Date.now() / 10000) % 1000}`;
		}
		setActiveTable(table);
		setActiveTab(session.status === 'unsettled' ? 'bill' : 'order');
	};

	const handleStartTable = ({ guests, waiter }) => {
		store.openTable(pendingTable.id, { guests, waiter });
		orderNumbersRef.current[pendingTable.id] = `ORD-${String(pendingTable.number).padStart(3, '0')}-${Math.floor(Date.now() / 10000) % 1000}`;
		setActiveTable(pendingTable);
		setPendingTable(null);
		setActiveTab('order');
	};

	// Firing the order to the kitchen is recorded first and unconditionally —
	// a printer failure never loses or duplicates the order itself. Any
	// failed ticket surfaces as a dismissable, retryable toast so staff can
	// keep working the floor instead of being blocked on a printer issue.
	const handleSendToKitchen = async () => {
		const table = activeTable;
		const orderNumber = orderNumbersRef.current[table.id];
		const linesSnapshot = orderLinesByTable[table.id] || [];

		setActiveTab('floor');
		setActiveTable(null);

		const { id: kitchenOrderId, failedCenters } = await store.fireKitchenOrder({
			table, orderLines: linesSnapshot, orderNumber,
			buildTicketText: (center, lines) => buildKitchenTicketText(center, lines, { orderNumber, table }),
		});

		if (failedCenters.length === 0) {
			toast.success(`Order ${orderNumber} sent to kitchen.`);
			return;
		}

		toast.error(`Order ${orderNumber} was saved, but the ${failedCenters.join(', ')} ticket didn't print.`, {
			description: 'The order is safe — only the ticket failed to print.',
			duration: 12000,
			action: {
				label: 'Retry Ticket',
				onClick: async () => {
					for (const center of failedCenters) {
						const result = await store.retryKitchenPrint(kitchenOrderId, center, (c, lines) => buildKitchenTicketText(c, lines, { orderNumber, table }));
						if (result.ok) toast.success(`${center} ticket printed.`);
						else toast.error(`${center} ticket still failed: ${result.friendlyError}`);
					}
				},
			},
		});
	};

	const handleBillRequest = () => {
		if (!activeTable) return;
		store.setUnsettled(activeTable.id);
		setActiveTab('bill');
	};

	const handleConfirmPayment = () => {
		if (!activeTable) return;
		store.closeTable(activeTable.id);
		setOrderLinesByTable((prev) => {
			const next = { ...prev };
			delete next[activeTable.id];
			return next;
		});
		setActiveTable(null);
		setActiveTab('floor');
	};

	return (
		<div className="flex flex-col h-full overflow-hidden">
			<AppHeader activeTab={activeTab} onTabChange={setActiveTab} activeTable={activeTable} />

			<div className="flex-1 min-h-0">
				{activeTab === 'floor' && <FloorPlan onTableSelect={handleTableSelect} />}

				{activeTab === 'order' && activeTable && (
					<OrderTaking
						table={activeTable}
						orderLines={orderLines}
						setOrderLines={setOrderLines}
						onSendToKitchen={handleSendToKitchen}
						onBill={handleBillRequest}
						orderNumber={orderNumbersRef.current[activeTable.id]}
					/>
				)}

				{activeTab === 'bill' && activeTable && (
					<BillPayment
						table={activeTable}
						orderLines={orderLines}
						onConfirmPayment={handleConfirmPayment}
					/>
				)}
			</div>

			<OpenTableDialog
				open={!!pendingTable}
				table={pendingTable}
				staff={store.staff}
				onCancel={() => setPendingTable(null)}
				onStart={handleStartTable}
			/>
		</div>
	);
}
