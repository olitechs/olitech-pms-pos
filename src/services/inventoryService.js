import { supabase } from '@/lib/supabaseClient';

export const inventoryService = {
	async listItems(propertyId) {
		const { data, error } = await supabase.from('inventory_items').select('*').eq('property_id', propertyId).order('name');
		if (error) throw new Error(error.message);
		return data;
	},

	async createItem({ propertyId, name, category, unit, quantity, lowStockThreshold }) {
		const { error } = await supabase.from('inventory_items').insert({
			property_id: propertyId,
			name,
			category: category || null,
			unit: unit || 'pcs',
			quantity: quantity || 0,
			low_stock_threshold: lowStockThreshold ?? 5,
		});
		if (error) throw new Error(error.message);
	},

	// Stock changes always go through the DB function so the movement log
	// (audit trail for section 33) can never drift from the live quantity.
	async adjustStock(itemId, change, reason) {
		const { data, error } = await supabase.rpc('fn_adjust_stock', { p_item_id: itemId, p_change: change, p_reason: reason });
		if (error) throw new Error(error.message);
		return data;
	},

	async listMovements(propertyId, itemId) {
		let query = supabase.from('inventory_movements').select('*, item:inventory_items(name)').eq('property_id', propertyId).order('created_at', { ascending: false });
		if (itemId) query = query.eq('item_id', itemId);
		const { data, error } = await query.limit(50);
		if (error) throw new Error(error.message);
		return data;
	},
};
