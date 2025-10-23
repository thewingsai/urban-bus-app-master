/*
  # UrbanBus Complete Database Schema

  ## Overview
  Complete database schema for UrbanBus - a comprehensive bus booking platform.
  Includes tables for operators, buses, routes, schedules, bookings, payments, 
  loyalty rewards, offers, and live tracking.

  ## New Tables

  ### 1. `bus_operators`
  Stores information about bus service providers
  - `id` (uuid, primary key) - Unique identifier
  - `name` (text) - Operator name
  - `email` (text) - Contact email
  - `phone` (text) - Contact phone
  - `rating` (decimal) - Average rating (0-5)
  - `total_buses` (integer) - Number of buses owned
  - `logo_url` (text) - URL to operator logo
  - `created_at` (timestamptz) - Record creation time

  ### 2. `buses`
  Contains details about individual buses
  - `id` (uuid, primary key) - Unique identifier
  - `operator_id` (uuid, foreign key) - References bus_operators
  - `bus_number` (text) - Registration/identification number
  - `bus_type` (text) - Type: AC, Non-AC, Sleeper, Seater, etc.
  - `total_seats` (integer) - Total seating capacity
  - `amenities` (jsonb) - Features like WiFi, charging points, etc.
  - `created_at` (timestamptz) - Record creation time

  ### 3. `routes`
  Defines travel routes between cities
  - `id` (uuid, primary key) - Unique identifier
  - `origin` (text) - Starting city
  - `destination` (text) - Ending city
  - `distance_km` (decimal) - Distance in kilometers
  - `duration_hours` (decimal) - Estimated travel duration
  - `stops` (jsonb) - Intermediate stops with timings
  - `created_at` (timestamptz) - Record creation time

  ### 4. `bus_schedules`
  Bus schedules with pricing and timing
  - `id` (uuid, primary key) - Unique identifier
  - `bus_id` (uuid, foreign key) - References buses
  - `route_id` (uuid, foreign key) - References routes
  - `departure_time` (time) - Daily departure time
  - `arrival_time` (time) - Daily arrival time
  - `base_price` (decimal) - Base ticket price
  - `available_days` (jsonb) - Days of week bus operates
  - `is_active` (boolean) - Whether schedule is currently active
  - `created_at` (timestamptz) - Record creation time

  ### 5. `bookings`
  Customer booking records
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, foreign key) - References auth.users
  - `schedule_id` (uuid, foreign key) - References bus_schedules
  - `travel_date` (date) - Date of travel
  - `seat_numbers` (jsonb) - Array of booked seat numbers
  - `total_amount` (decimal) - Total payment amount
  - `passenger_name` (text) - Primary passenger name
  - `passenger_email` (text) - Contact email
  - `passenger_phone` (text) - Contact phone
  - `passenger_age` (integer) - Passenger age
  - `passenger_gender` (text) - Passenger gender
  - `booking_status` (text) - Status: confirmed, cancelled, completed, rescheduled
  - `payment_status` (text) - Status: pending, completed, refunded
  - `booking_reference` (text) - Unique booking reference code
  - `created_at` (timestamptz) - Booking creation time
  - `updated_at` (timestamptz) - Last update time

  ### 6. `seat_availability`
  Tracks seat availability for specific dates
  - `id` (uuid, primary key) - Unique identifier
  - `schedule_id` (uuid, foreign key) - References bus_schedules
  - `travel_date` (date) - Date of travel
  - `booked_seats` (jsonb) - Array of booked seat numbers
  - `available_seats` (integer) - Number of available seats
  - `created_at` (timestamptz) - Record creation time
  - `updated_at` (timestamptz) - Last update time

  ### 7. `payments`
  Payment transaction records
  - `id` (uuid, primary key) - Unique identifier
  - `booking_id` (uuid, foreign key) - References bookings
  - `amount` (decimal) - Payment amount
  - `payment_method` (text) - Method: UPI, card, wallet, etc.
  - `transaction_id` (text) - External transaction reference
  - `payment_status` (text) - Status: pending, success, failed
  - `created_at` (timestamptz) - Transaction time

  ### 8. `offers`
  Promotional offers and discounts
  - `id` (uuid, primary key) - Unique identifier
  - `title` (text) - Offer title
  - `description` (text) - Offer description
  - `code` (text) - Promo code
  - `discount_type` (text) - Type: percentage, flat
  - `discount_value` (decimal) - Discount amount/percentage
  - `min_booking_amount` (decimal) - Minimum booking value required
  - `max_discount` (decimal) - Maximum discount cap
  - `valid_from` (timestamptz) - Offer start date
  - `valid_until` (timestamptz) - Offer end date
  - `is_active` (boolean) - Whether offer is currently active
  - `created_at` (timestamptz) - Record creation time

  ### 9. `user_rewards`
  Loyalty program rewards for users
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, foreign key) - References auth.users
  - `points` (integer) - Accumulated reward points
  - `tier` (text) - Membership tier: silver, gold, platinum
  - `free_rides` (integer) - Number of free rides earned
  - `created_at` (timestamptz) - Record creation time
  - `updated_at` (timestamptz) - Last update time

  ### 10. `reward_transactions`
  Track reward points earned and redeemed
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, foreign key) - References auth.users
  - `booking_id` (uuid, foreign key) - References bookings (nullable)
  - `points` (integer) - Points earned/spent (negative for redemption)
  - `transaction_type` (text) - Type: earned, redeemed
  - `description` (text) - Transaction description
  - `created_at` (timestamptz) - Transaction time

  ### 11. `bus_tracking`
  Real-time bus location tracking
  - `id` (uuid, primary key) - Unique identifier
  - `schedule_id` (uuid, foreign key) - References bus_schedules
  - `travel_date` (date) - Date of travel
  - `current_location` (text) - Current location description
  - `latitude` (decimal) - GPS latitude
  - `longitude` (decimal) - GPS longitude
  - `status` (text) - Status: on_time, delayed, arrived
  - `updated_at` (timestamptz) - Last update time

  ## Security
  
  ### Row Level Security (RLS)
  All tables have RLS enabled to protect data access.
  
  ### Policies
  
  #### Public Read Access
  - `bus_operators`, `buses`, `routes`, `bus_schedules` - Anyone can view
  - `seat_availability`, `offers` - Anyone can view
  
  #### Authenticated User Access
  - `bookings` - Users can create and view their own bookings
  - `payments` - Users can view their own payment records
  - `user_rewards`, `reward_transactions` - Users can view their own rewards
  - `bus_tracking` - Authenticated users can view tracking info
  
  ### Important Notes
  1. All monetary values use decimal type for precision
  2. JSONB used for flexible data (amenities, seats, stops)
  3. Composite unique constraints prevent duplicates
  4. Timestamps track all data changes
  5. Foreign keys ensure referential integrity
  6. Indexes added for performance optimization
*/

-- Create bus_operators table
CREATE TABLE IF NOT EXISTS bus_operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  rating decimal(2,1) DEFAULT 0.0,
  total_buses integer DEFAULT 0,
  logo_url text,
  created_at timestamptz DEFAULT now()
);

-- Create buses table
CREATE TABLE IF NOT EXISTS buses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid REFERENCES bus_operators(id) ON DELETE CASCADE,
  bus_number text NOT NULL UNIQUE,
  bus_type text NOT NULL,
  total_seats integer NOT NULL,
  amenities jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create routes table
CREATE TABLE IF NOT EXISTS routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origin text NOT NULL,
  destination text NOT NULL,
  distance_km decimal(10,2) NOT NULL,
  duration_hours decimal(4,2) NOT NULL,
  stops jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_routes_origin_destination ON routes(origin, destination);

-- Create bus_schedules table
CREATE TABLE IF NOT EXISTS bus_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id uuid REFERENCES buses(id) ON DELETE CASCADE,
  route_id uuid REFERENCES routes(id) ON DELETE CASCADE,
  departure_time time NOT NULL,
  arrival_time time NOT NULL,
  base_price decimal(10,2) NOT NULL,
  available_days jsonb DEFAULT '["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  schedule_id uuid REFERENCES bus_schedules(id) ON DELETE CASCADE,
  travel_date date NOT NULL,
  seat_numbers jsonb NOT NULL,
  total_amount decimal(10,2) NOT NULL,
  passenger_name text NOT NULL,
  passenger_email text NOT NULL,
  passenger_phone text NOT NULL,
  passenger_age integer,
  passenger_gender text,
  booking_status text DEFAULT 'confirmed',
  payment_status text DEFAULT 'pending',
  booking_reference text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_travel_date ON bookings(travel_date);
CREATE INDEX IF NOT EXISTS idx_bookings_reference ON bookings(booking_reference);

-- Create seat_availability table
CREATE TABLE IF NOT EXISTS seat_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid REFERENCES bus_schedules(id) ON DELETE CASCADE,
  travel_date date NOT NULL,
  booked_seats jsonb DEFAULT '[]'::jsonb,
  available_seats integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(schedule_id, travel_date)
);

CREATE INDEX IF NOT EXISTS idx_seat_availability_schedule_date ON seat_availability(schedule_id, travel_date);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  amount decimal(10,2) NOT NULL,
  payment_method text NOT NULL,
  transaction_id text,
  payment_status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);

-- Create offers table
CREATE TABLE IF NOT EXISTS offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL,
  discount_value decimal(10,2) NOT NULL,
  min_booking_amount decimal(10,2) DEFAULT 0,
  max_discount decimal(10,2),
  valid_from timestamptz DEFAULT now(),
  valid_until timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offers_code ON offers(code);
CREATE INDEX IF NOT EXISTS idx_offers_active ON offers(is_active);

-- Create user_rewards table
CREATE TABLE IF NOT EXISTS user_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  points integer DEFAULT 0,
  tier text DEFAULT 'silver',
  free_rides integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_rewards_user_id ON user_rewards(user_id);

-- Create reward_transactions table
CREATE TABLE IF NOT EXISTS reward_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  points integer NOT NULL,
  transaction_type text NOT NULL,
  description text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reward_transactions_user_id ON reward_transactions(user_id);

-- Create bus_tracking table
CREATE TABLE IF NOT EXISTS bus_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid REFERENCES bus_schedules(id) ON DELETE CASCADE,
  travel_date date NOT NULL,
  current_location text,
  latitude decimal(10,8),
  longitude decimal(11,8),
  status text DEFAULT 'on_time',
  updated_at timestamptz DEFAULT now(),
  UNIQUE(schedule_id, travel_date)
);

CREATE INDEX IF NOT EXISTS idx_bus_tracking_schedule_date ON bus_tracking(schedule_id, travel_date);

-- Enable Row Level Security
ALTER TABLE bus_operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE seat_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bus_operators (public read)
CREATE POLICY "Anyone can view bus operators"
  ON bus_operators FOR SELECT
  TO anon, authenticated
  USING (true);

-- RLS Policies for buses (public read)
CREATE POLICY "Anyone can view buses"
  ON buses FOR SELECT
  TO anon, authenticated
  USING (true);

-- RLS Policies for routes (public read)
CREATE POLICY "Anyone can view routes"
  ON routes FOR SELECT
  TO anon, authenticated
  USING (true);

-- RLS Policies for bus_schedules (public read)
CREATE POLICY "Anyone can view bus schedules"
  ON bus_schedules FOR SELECT
  TO anon, authenticated
  USING (true);

-- RLS Policies for seat_availability (public read)
CREATE POLICY "Anyone can view seat availability"
  ON seat_availability FOR SELECT
  TO anon, authenticated
  USING (true);

-- RLS Policies for offers (public read)
CREATE POLICY "Anyone can view active offers"
  ON offers FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- RLS Policies for bookings
CREATE POLICY "Users can create their own bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for payments
CREATE POLICY "Users can view their own payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = payments.booking_id
      AND bookings.user_id = auth.uid()
    )
  );

-- RLS Policies for user_rewards
CREATE POLICY "Users can view their own rewards"
  ON user_rewards FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own rewards"
  ON user_rewards FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for reward_transactions
CREATE POLICY "Users can view their own reward transactions"
  ON reward_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for bus_tracking
CREATE POLICY "Authenticated users can view bus tracking"
  ON bus_tracking FOR SELECT
  TO authenticated
  USING (true);