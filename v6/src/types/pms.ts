export type PaymentStatus = 'fully_paid' | 'not_paid' | 'partially_paid';
export type Channel = 'direct' | 'booking_com' | 'unknown';
export type MealPlan = 'bed_only' | 'bb' | 'half_board' | 'full_board';
export type BookingStatus = 'booked' | 'checked_in' | 'checked_out';

export interface Reservation {
  id: string;
  groupId?: string;
  guestName: string;
  roomId: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  bookingStatus: BookingStatus;
  paymentStatus: PaymentStatus;
  channel: Channel;
  mealPlan: MealPlan;
  adults: number;
  kidsCount: number;
  kidsAges: number[];
  totalAmount: number;
  amountPaid: number;
  color?: string;
}
