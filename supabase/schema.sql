-- IPL Fantasy Bidding Game - Database Schema
-- Run this in your Supabase SQL Editor

-- Profiles table
CREATE TABLE profiles (
  phone TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  balance DECIMAL(10,2) DEFAULT 100.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Matches table
CREATE TABLE matches (
  id SERIAL PRIMARY KEY,
  team_a TEXT NOT NULL,
  team_b TEXT NOT NULL,
  match_date DATE NOT NULL,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'open', 'closed', 'settled')),
  winner TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bids table
CREATE TABLE bids (
  id SERIAL PRIMARY KEY,
  user_phone TEXT NOT NULL REFERENCES profiles(phone),
  match_id INTEGER NOT NULL REFERENCES matches(id),
  team_chosen TEXT NOT NULL,
  amount DECIMAL(10,2) DEFAULT 1.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_phone, match_id)
);

-- Admin phones table
CREATE TABLE admin_phones (
  phone TEXT PRIMARY KEY
);

-- Index for faster lookups
CREATE INDEX idx_bids_match ON bids(match_id);
CREATE INDEX idx_matches_date ON matches(match_date);
CREATE INDEX idx_matches_status ON matches(status);

-- ============================================
-- IPL 2025 Schedule Seed Data
-- (Update dates/teams for IPL 2026 when available)
-- ============================================

INSERT INTO matches (team_a, team_b, match_date) VALUES
  ('KKR', 'RCB', '2025-03-21'),
  ('SRH', 'RR', '2025-03-22'),
  ('CSK', 'MI', '2025-03-23'),
  ('DC', 'LSG', '2025-03-24'),
  ('GT', 'PBKS', '2025-03-25'),
  ('RR', 'KKR', '2025-03-26'),
  ('LSG', 'SRH', '2025-03-27'),
  ('RCB', 'CSK', '2025-03-28'),
  ('MI', 'DC', '2025-03-29'),
  ('GT', 'RR', '2025-03-30'),
  ('PBKS', 'KKR', '2025-03-31'),
  ('SRH', 'MI', '2025-04-01'),
  ('CSK', 'LSG', '2025-04-02'),
  ('DC', 'RCB', '2025-04-03'),
  ('PBKS', 'SRH', '2025-04-04'),
  ('MI', 'KKR', '2025-04-05'),
  ('RR', 'CSK', '2025-04-06'),
  ('LSG', 'GT', '2025-04-07'),
  ('RCB', 'PBKS', '2025-04-08'),
  ('DC', 'RR', '2025-04-09'),
  ('MI', 'LSG', '2025-04-10'),
  ('CSK', 'GT', '2025-04-11'),
  ('KKR', 'SRH', '2025-04-12'),
  ('PBKS', 'DC', '2025-04-13'),
  ('RCB', 'MI', '2025-04-14'),
  ('RR', 'LSG', '2025-04-15'),
  ('GT', 'KKR', '2025-04-16'),
  ('SRH', 'CSK', '2025-04-17'),
  ('DC', 'MI', '2025-04-18'),
  ('PBKS', 'RR', '2025-04-19'),
  ('KKR', 'CSK', '2025-04-20'),
  ('LSG', 'RCB', '2025-04-21'),
  ('GT', 'SRH', '2025-04-22'),
  ('MI', 'PBKS', '2025-04-23'),
  ('RCB', 'RR', '2025-04-24'),
  ('CSK', 'DC', '2025-04-25'),
  ('KKR', 'LSG', '2025-04-26'),
  ('SRH', 'GT', '2025-04-27'),
  ('PBKS', 'CSK', '2025-04-28'),
  ('RR', 'MI', '2025-04-29'),
  ('DC', 'KKR', '2025-04-30'),
  ('LSG', 'PBKS', '2025-05-01'),
  ('GT', 'RCB', '2025-05-02'),
  ('CSK', 'SRH', '2025-05-03'),
  ('MI', 'GT', '2025-05-04'),
  ('RR', 'DC', '2025-05-05'),
  ('KKR', 'PBKS', '2025-05-06'),
  ('RCB', 'LSG', '2025-05-07'),
  ('SRH', 'DC', '2025-05-08'),
  ('GT', 'CSK', '2025-05-09'),
  ('MI', 'RCB', '2025-05-10'),
  ('LSG', 'KKR', '2025-05-11'),
  ('PBKS', 'RR', '2025-05-12'),
  ('CSK', 'KKR', '2025-05-13'),
  ('DC', 'GT', '2025-05-14'),
  ('SRH', 'PBKS', '2025-05-15'),
  ('RR', 'RCB', '2025-05-16'),
  ('LSG', 'MI', '2025-05-17'),
  ('GT', 'DC', '2025-05-18'),
  ('CSK', 'PBKS', '2025-05-19'),
  ('KKR', 'MI', '2025-05-20'),
  ('RCB', 'SRH', '2025-05-21'),
  ('RR', 'GT', '2025-05-22'),
  ('LSG', 'CSK', '2025-05-23'),
  ('DC', 'PBKS', '2025-05-24'),
  ('MI', 'SRH', '2025-05-25'),
  ('KKR', 'RR', '2025-05-26'),
  ('RCB', 'DC', '2025-05-27'),
  ('PBKS', 'LSG', '2025-05-28'),
  ('GT', 'MI', '2025-05-29');
