-- =============================================
-- DEMO VENTURE PARTNERS - TEST DATA SEED SCRIPT
-- =============================================
-- 52 deals (1 per week), 50 closed + 2 active
-- 20 LP contacts, ~166 deal-LP relationships
-- All committed/interested sums verified
--
-- INSTRUCTIONS:
--   1. Run this script in the Supabase SQL Editor
--   2. Then manually add yourself to the 'users' table:
--      INSERT INTO users (id, email, name, organization_id, role)
--      VALUES ('<your-auth-uid>', '<email>', 'Your Name', 'bb000000-0000-0000-0000-000000000001', 'admin');

BEGIN;

-- CLEANUP
DELETE FROM deal_lp_relationships WHERE deal_id IN (SELECT id FROM deals WHERE organization_id = 'bb000000-0000-0000-0000-000000000001');
DELETE FROM deals WHERE organization_id = 'bb000000-0000-0000-0000-000000000001';
DELETE FROM lp_contacts WHERE organization_id = 'bb000000-0000-0000-0000-000000000001';
DELETE FROM users WHERE organization_id = 'bb000000-0000-0000-0000-000000000001';
DELETE FROM organizations WHERE id = 'bb000000-0000-0000-0000-000000000001';

-- ORGANIZATION
INSERT INTO organizations (id, name, domain) VALUES
  ('bb000000-0000-0000-0000-000000000001', 'Demo Venture Partners', 'demoventurepartners.com');

-- LP CONTACTS (20)
INSERT INTO lp_contacts (id, organization_id, name, email, firm, title, investor_type, accreditation_status, kyc_status, preferred_check_size, total_commitments) VALUES
  ('cc000000-0000-0000-0000-000000000001', 'bb000000-0000-0000-0000-000000000001', 'Sarah Chen', 'sarah.chen@sequoiacap.com', 'Sequoia Capital', 'Partner', 'institution', 'qualified_purchaser', 'approved', 500000, 3750000),
  ('cc000000-0000-0000-0000-000000000002', 'bb000000-0000-0000-0000-000000000001', 'Michael Roberts', 'm.roberts@a16z.com', 'Andreessen Horowitz', 'General Partner', 'institution', 'qualified_purchaser', 'approved', 750000, 4200000),
  ('cc000000-0000-0000-0000-000000000003', 'bb000000-0000-0000-0000-000000000001', 'Priya Patel', 'priya@tigerglobal.com', 'Tiger Global', 'Managing Director', 'institution', 'qualified_purchaser', 'approved', 600000, 3100000),
  ('cc000000-0000-0000-0000-000000000004', 'bb000000-0000-0000-0000-000000000001', 'James Morrison', 'james@lsvp.com', 'Lightspeed Ventures', 'Partner', 'institution', 'qualified_purchaser', 'approved', 400000, 2800000),
  ('cc000000-0000-0000-0000-000000000005', 'bb000000-0000-0000-0000-000000000001', 'Elena Volkov', 'elena@dstglobal.com', 'DST Global', 'Investment Director', 'institution', 'qualified_purchaser', 'approved', 500000, 3500000),
  ('cc000000-0000-0000-0000-000000000006', 'bb000000-0000-0000-0000-000000000001', 'David Kim', 'dkim@bvp.com', 'Bessemer Venture Partners', 'Partner', 'institution', 'qualified_purchaser', 'approved', 350000, 2600000),
  ('cc000000-0000-0000-0000-000000000007', 'bb000000-0000-0000-0000-000000000001', 'Rachel Thompson', 'rachel@foundersfund.com', 'Founders Fund', 'Principal', 'institution', 'qualified_purchaser', 'approved', 600000, 3900000),
  ('cc000000-0000-0000-0000-000000000008', 'bb000000-0000-0000-0000-000000000001', 'Amanda Walsh', 'awalsh@coatue.com', 'Coatue Management', 'Partner', 'institution', 'qualified_purchaser', 'approved', 500000, 3200000),
  ('cc000000-0000-0000-0000-000000000009', 'bb000000-0000-0000-0000-000000000001', 'Robert Zhang', 'rzhang@gic.com.sg', 'GIC', 'Senior VP', 'sovereign_wealth', 'qualified_purchaser', 'approved', 800000, 4800000),
  ('cc000000-0000-0000-0000-000000000010', 'bb000000-0000-0000-0000-000000000001', 'Lisa Park', 'lisa.park@insightpartners.com', 'Insight Partners', 'Managing Director', 'institution', 'qualified_purchaser', 'approved', 450000, 2900000),
  ('cc000000-0000-0000-0000-000000000011', 'bb000000-0000-0000-0000-000000000001', 'Maria Santos', 'maria@qed.com', 'QED Investors', 'Partner', 'institution', 'qualified_purchaser', 'approved', 400000, 2400000),
  ('cc000000-0000-0000-0000-000000000012', 'bb000000-0000-0000-0000-000000000001', 'Andrew Foster', 'andrew@indexventures.com', 'Index Ventures', 'Partner', 'institution', 'qualified_purchaser', 'approved', 500000, 3300000),
  ('cc000000-0000-0000-0000-000000000013', 'bb000000-0000-0000-0000-000000000001', 'Jennifer Liu', 'jliu@accel.com', 'Accel Partners', 'Principal', 'institution', 'qualified_purchaser', 'approved', 350000, 2100000),
  ('cc000000-0000-0000-0000-000000000014', 'bb000000-0000-0000-0000-000000000001', 'Sophia Anderson', 'sophia@battery.com', 'Battery Ventures', 'General Partner', 'institution', 'qualified_purchaser', 'approved', 450000, 2700000),
  ('cc000000-0000-0000-0000-000000000015', 'bb000000-0000-0000-0000-000000000001', 'Daniel Goldstein', 'daniel@kkr.com', 'KKR', 'Director', 'institution', 'qualified_purchaser', 'approved', 700000, 4100000),
  ('cc000000-0000-0000-0000-000000000016', 'bb000000-0000-0000-0000-000000000001', 'Natalie Kim', 'natalie@thrivecp.com', 'Thrive Capital', 'Vice President', 'institution', 'qualified_purchaser', 'approved', 400000, 2500000),
  ('cc000000-0000-0000-0000-000000000017', 'bb000000-0000-0000-0000-000000000001', 'Carlos Mendez', 'carlos@softbank.com', 'SoftBank Vision Fund', 'Investment Director', 'institution', 'qualified_purchaser', 'in_review', 600000, 1800000),
  ('cc000000-0000-0000-0000-000000000018', 'bb000000-0000-0000-0000-000000000001', 'Thomas Baker', 'tbaker@generalcatalyst.com', 'General Catalyst', 'Partner', 'institution', 'qualified_purchaser', 'pending', 500000, 1500000),
  ('cc000000-0000-0000-0000-000000000019', 'bb000000-0000-0000-0000-000000000001', 'William Chen', 'will.chen@ribbitcap.com', 'Ribbit Capital', 'Principal', 'institution', 'accredited_investor', 'not_started', 300000, 900000),
  ('cc000000-0000-0000-0000-000000000020', 'bb000000-0000-0000-0000-000000000001', 'Mark Patterson', 'mpatterson@wellington.com', 'Wellington Management', 'Senior Analyst', 'institution', 'qualified_purchaser', 'expired', 400000, 1200000);

-- DEALS (52 deals, one per week, 50 closed + 2 active)
-- Chart groups by created_at into weekly buckets
INSERT INTO deals (id, organization_id, name, company_name, description, target_raise, total_committed, total_interested, min_check_size, max_check_size, fee_percent, carry_percent, status, investment_stage, investment_type, created_date, close_date, created_at) VALUES
  ('dd000000-0000-0000-0000-000000000001', 'bb000000-0000-0000-0000-000000000001',
   'Aurora Ventures SPV', 'Aurora Tech', 'AI workflow automation for small businesses.',
   1000000, 1000000, 0, 50000, 300000, 2.0, 20, 'closed', 'Seed', 'Equity', (CURRENT_DATE-INTERVAL '51 weeks')::DATE, (CURRENT_DATE-INTERVAL '43 weeks')::DATE, NOW()-INTERVAL '51 weeks'),
  ('dd000000-0000-0000-0000-000000000002', 'bb000000-0000-0000-0000-000000000001',
   'Meridian Series A SPV', 'Meridian Technologies', 'AI-powered supply chain optimization for manufacturers.',
   1500000, 1400000, 0, 100000, 500000, 2.0, 20, 'closed', 'Series A', 'Equity', (CURRENT_DATE-INTERVAL '50 weeks')::DATE, (CURRENT_DATE-INTERVAL '42 weeks')::DATE, NOW()-INTERVAL '50 weeks'),
  ('dd000000-0000-0000-0000-000000000003', 'bb000000-0000-0000-0000-000000000001',
   'Crest Networks SPV', 'Crest Networks', 'Mesh networking hardware for rural broadband.',
   1200000, 1100000, 1300000, 50000, 300000, 2.0, 20, 'closed', 'Seed', 'Equity', (CURRENT_DATE-INTERVAL '49 weeks')::DATE, (CURRENT_DATE-INTERVAL '41 weeks')::DATE, NOW()-INTERVAL '49 weeks'),
  ('dd000000-0000-0000-0000-000000000004', 'bb000000-0000-0000-0000-000000000001',
   'Drift Analytics SPV', 'Drift Analytics', 'Real-time customer behavior analytics for e-commerce.',
   1300000, 1200000, 0, 50000, 300000, 2.0, 20, 'closed', 'Seed', 'Equity', (CURRENT_DATE-INTERVAL '48 weeks')::DATE, (CURRENT_DATE-INTERVAL '40 weeks')::DATE, NOW()-INTERVAL '48 weeks'),
  ('dd000000-0000-0000-0000-000000000005', 'bb000000-0000-0000-0000-000000000001',
   'Catalyst Infrastructure Fund', 'Catalyst Systems', 'Cloud infrastructure for distributed developer teams.',
   2500000, 2400000, 0, 150000, 800000, 2.0, 20, 'closed', 'Series B', 'Equity', (CURRENT_DATE-INTERVAL '47 weeks')::DATE, (CURRENT_DATE-INTERVAL '39 weeks')::DATE, NOW()-INTERVAL '47 weeks'),
  ('dd000000-0000-0000-0000-000000000006', 'bb000000-0000-0000-0000-000000000001',
   'Echo Systems SPV', 'Echo Systems', 'Voice AI platform for enterprise customer support.',
   1000000, 900000, 1100000, 100000, 500000, 2.0, 20, 'closed', 'Series A', 'Equity', (CURRENT_DATE-INTERVAL '46 weeks')::DATE, (CURRENT_DATE-INTERVAL '38 weeks')::DATE, NOW()-INTERVAL '46 weeks'),
  ('dd000000-0000-0000-0000-000000000007', 'bb000000-0000-0000-0000-000000000001',
   'Flux Digital SPV', 'Flux Digital', 'Digital asset management for creative agencies.',
   1500000, 1400000, 0, 100000, 500000, 2.0, 20, 'closed', 'Series A', 'Equity', (CURRENT_DATE-INTERVAL '45 weeks')::DATE, (CURRENT_DATE-INTERVAL '37 weeks')::DATE, NOW()-INTERVAL '45 weeks'),
  ('dd000000-0000-0000-0000-000000000008', 'bb000000-0000-0000-0000-000000000001',
   'Atlas Growth Equity SPV', 'Atlas Analytics', 'Enterprise analytics with real-time data processing.',
   3500000, 3400000, 0, 200000, 1000000, 1.5, 25, 'closed', 'Growth', 'Equity', (CURRENT_DATE-INTERVAL '44 weeks')::DATE, (CURRENT_DATE-INTERVAL '36 weeks')::DATE, NOW()-INTERVAL '44 weeks'),
  ('dd000000-0000-0000-0000-000000000009', 'bb000000-0000-0000-0000-000000000001',
   'Genesis Labs SPV', 'Genesis Labs', 'Synthetic biology tools for food ingredient R&D.',
   1200000, 1100000, 1300000, 50000, 300000, 2.0, 20, 'closed', 'Seed', 'Equity', (CURRENT_DATE-INTERVAL '43 weeks')::DATE, (CURRENT_DATE-INTERVAL '35 weeks')::DATE, NOW()-INTERVAL '43 weeks'),
  ('dd000000-0000-0000-0000-000000000010', 'bb000000-0000-0000-0000-000000000001',
   'Harbor Tech SPV', 'Harbor Tech', 'Port logistics software for maritime shipping.',
   1500000, 1400000, 0, 100000, 500000, 2.0, 20, 'closed', 'Series A', 'Equity', (CURRENT_DATE-INTERVAL '42 weeks')::DATE, (CURRENT_DATE-INTERVAL '34 weeks')::DATE, NOW()-INTERVAL '42 weeks'),
  ('dd000000-0000-0000-0000-000000000011', 'bb000000-0000-0000-0000-000000000001',
   'Blueprint EdTech SPV', 'Blueprint Learning', 'Adaptive ML-powered K-12 education curriculum.',
   2000000, 1800000, 0, 100000, 500000, 2.0, 20, 'closed', 'Series A', 'Equity', (CURRENT_DATE-INTERVAL '41 weeks')::DATE, (CURRENT_DATE-INTERVAL '33 weeks')::DATE, NOW()-INTERVAL '41 weeks'),
  ('dd000000-0000-0000-0000-000000000012', 'bb000000-0000-0000-0000-000000000001',
   'Ionic Platforms SPV', 'Ionic Platforms', 'Low-code platform for internal enterprise tools.',
   1000000, 900000, 1100000, 50000, 300000, 2.0, 20, 'closed', 'Seed', 'Equity', (CURRENT_DATE-INTERVAL '40 weeks')::DATE, (CURRENT_DATE-INTERVAL '32 weeks')::DATE, NOW()-INTERVAL '40 weeks'),
  ('dd000000-0000-0000-0000-000000000013', 'bb000000-0000-0000-0000-000000000001',
   'Jupiter Cloud SPV', 'Jupiter Cloud', 'Multi-cloud orchestration for mid-market companies.',
   1800000, 1600000, 0, 100000, 500000, 2.0, 20, 'closed', 'Series A', 'Equity', (CURRENT_DATE-INTERVAL '39 weeks')::DATE, (CURRENT_DATE-INTERVAL '31 weeks')::DATE, NOW()-INTERVAL '39 weeks'),
  ('dd000000-0000-0000-0000-000000000014', 'bb000000-0000-0000-0000-000000000001',
   'Prism Biotech SPV', 'Prism Therapeutics', 'Novel mRNA therapeutics for autoimmune diseases.',
   2500000, 2400000, 0, 150000, 800000, 2.0, 20, 'closed', 'Series B', 'Equity', (CURRENT_DATE-INTERVAL '38 weeks')::DATE, (CURRENT_DATE-INTERVAL '30 weeks')::DATE, NOW()-INTERVAL '38 weeks'),
  ('dd000000-0000-0000-0000-000000000015', 'bb000000-0000-0000-0000-000000000001',
   'Kinetic Data SPV', 'Kinetic Data', 'IoT sensor data pipeline for industrial manufacturers.',
   1200000, 1000000, 1200000, 50000, 300000, 2.0, 20, 'closed', 'Seed', 'Equity', (CURRENT_DATE-INTERVAL '37 weeks')::DATE, (CURRENT_DATE-INTERVAL '29 weeks')::DATE, NOW()-INTERVAL '37 weeks'),
  ('dd000000-0000-0000-0000-000000000016', 'bb000000-0000-0000-0000-000000000001',
   'Lunar AI SPV', 'Lunar AI', 'Computer vision quality control for semiconductor fabs.',
   2000000, 1800000, 0, 100000, 500000, 2.0, 20, 'closed', 'Series A', 'Equity', (CURRENT_DATE-INTERVAL '36 weeks')::DATE, (CURRENT_DATE-INTERVAL '28 weeks')::DATE, NOW()-INTERVAL '36 weeks'),
  ('dd000000-0000-0000-0000-000000000017', 'bb000000-0000-0000-0000-000000000001',
   'Horizon SaaS SPV', 'Horizon Software', 'Vertical SaaS for property management.',
   4000000, 3800000, 0, 150000, 800000, 2.0, 20, 'closed', 'Series B', 'Equity', (CURRENT_DATE-INTERVAL '35 weeks')::DATE, (CURRENT_DATE-INTERVAL '27 weeks')::DATE, NOW()-INTERVAL '35 weeks'),
  ('dd000000-0000-0000-0000-000000000018', 'bb000000-0000-0000-0000-000000000001',
   'Matrix Security SPV', 'Matrix Security', 'Endpoint detection for regulated industries.',
   1500000, 1400000, 1600000, 100000, 500000, 2.0, 20, 'closed', 'Series A', 'Equity', (CURRENT_DATE-INTERVAL '34 weeks')::DATE, (CURRENT_DATE-INTERVAL '26 weeks')::DATE, NOW()-INTERVAL '34 weeks'),
  ('dd000000-0000-0000-0000-000000000019', 'bb000000-0000-0000-0000-000000000001',
   'Neural Works SPV', 'Neural Works', 'Neural interface software for assistive devices.',
   1800000, 1600000, 0, 100000, 500000, 2.0, 20, 'closed', 'Series A', 'Equity', (CURRENT_DATE-INTERVAL '33 weeks')::DATE, (CURRENT_DATE-INTERVAL '25 weeks')::DATE, NOW()-INTERVAL '33 weeks'),
  ('dd000000-0000-0000-0000-000000000020', 'bb000000-0000-0000-0000-000000000001',
   'Nova Clean Energy SPV', 'Nova Energy', 'Solid-state battery tech for commercial EV fleets.',
   3500000, 3400000, 0, 150000, 800000, 2.0, 20, 'closed', 'Series B', 'Equity', (CURRENT_DATE-INTERVAL '32 weeks')::DATE, (CURRENT_DATE-INTERVAL '24 weeks')::DATE, NOW()-INTERVAL '32 weeks'),
  ('dd000000-0000-0000-0000-000000000021', 'bb000000-0000-0000-0000-000000000001',
   'Opal Health SPV', 'Opal Health', 'Telehealth platform for rural healthcare providers.',
   1000000, 900000, 1100000, 50000, 300000, 2.0, 20, 'closed', 'Seed', 'Equity', (CURRENT_DATE-INTERVAL '31 weeks')::DATE, (CURRENT_DATE-INTERVAL '23 weeks')::DATE, NOW()-INTERVAL '31 weeks'),
  ('dd000000-0000-0000-0000-000000000022', 'bb000000-0000-0000-0000-000000000001',
   'Pixel Media SPV', 'Pixel Media', 'AI video editing and distribution for creators.',
   1500000, 1400000, 0, 100000, 500000, 2.0, 20, 'closed', 'Series A', 'Equity', (CURRENT_DATE-INTERVAL '30 weeks')::DATE, (CURRENT_DATE-INTERVAL '22 weeks')::DATE, NOW()-INTERVAL '30 weeks'),
  ('dd000000-0000-0000-0000-000000000023', 'bb000000-0000-0000-0000-000000000001',
   'Apex Fintech SPV', 'Apex Financial', 'Embedded lending infrastructure for vertical SaaS.',
   5000000, 4800000, 0, 200000, 1000000, 1.5, 25, 'closed', 'Growth', 'Equity', (CURRENT_DATE-INTERVAL '29 weeks')::DATE, (CURRENT_DATE-INTERVAL '21 weeks')::DATE, NOW()-INTERVAL '29 weeks'),
  ('dd000000-0000-0000-0000-000000000024', 'bb000000-0000-0000-0000-000000000001',
   'Quartz Finance SPV', 'Quartz Finance', 'Automated compliance reporting for fintech startups.',
   2000000, 1800000, 2000000, 100000, 500000, 2.0, 20, 'closed', 'Series A', 'Equity', (CURRENT_DATE-INTERVAL '28 weeks')::DATE, (CURRENT_DATE-INTERVAL '20 weeks')::DATE, NOW()-INTERVAL '28 weeks'),
  ('dd000000-0000-0000-0000-000000000025', 'bb000000-0000-0000-0000-000000000001',
   'Ridge Computing SPV', 'Ridge Computing', 'Edge computing for autonomous vehicle fleets.',
   1500000, 1400000, 0, 50000, 300000, 2.0, 20, 'closed', 'Seed', 'Equity', (CURRENT_DATE-INTERVAL '27 weeks')::DATE, (CURRENT_DATE-INTERVAL '19 weeks')::DATE, NOW()-INTERVAL '27 weeks'),
  ('dd000000-0000-0000-0000-000000000026', 'bb000000-0000-0000-0000-000000000001',
   'Summit PropTech SPV', 'Summit Spaces', 'IoT smart building management for commercial real estate.',
   3000000, 2800000, 0, 150000, 800000, 2.0, 20, 'closed', 'Series B', 'Equity', (CURRENT_DATE-INTERVAL '26 weeks')::DATE, (CURRENT_DATE-INTERVAL '18 weeks')::DATE, NOW()-INTERVAL '26 weeks'),
  ('dd000000-0000-0000-0000-000000000027', 'bb000000-0000-0000-0000-000000000001',
   'Signal AI SPV', 'Signal AI', 'NLP market intelligence for hedge funds.',
   1800000, 1600000, 1800000, 100000, 500000, 2.0, 20, 'closed', 'Series A', 'Equity', (CURRENT_DATE-INTERVAL '25 weeks')::DATE, (CURRENT_DATE-INTERVAL '17 weeks')::DATE, NOW()-INTERVAL '25 weeks'),
  ('dd000000-0000-0000-0000-000000000028', 'bb000000-0000-0000-0000-000000000001',
   'Tidal Energy SPV', 'Tidal Energy', 'Tidal power generation for coastal communities.',
   2500000, 2400000, 0, 100000, 500000, 2.0, 20, 'closed', 'Series A', 'Equity', (CURRENT_DATE-INTERVAL '24 weeks')::DATE, (CURRENT_DATE-INTERVAL '16 weeks')::DATE, NOW()-INTERVAL '24 weeks'),
  ('dd000000-0000-0000-0000-000000000029', 'bb000000-0000-0000-0000-000000000001',
   'Beacon Defense SPV', 'Beacon Security', 'AI threat detection for critical infrastructure.',
   4000000, 3800000, 0, 150000, 800000, 2.0, 20, 'closed', 'Series B', 'Equity', (CURRENT_DATE-INTERVAL '23 weeks')::DATE, (CURRENT_DATE-INTERVAL '15 weeks')::DATE, NOW()-INTERVAL '23 weeks'),
  ('dd000000-0000-0000-0000-000000000030', 'bb000000-0000-0000-0000-000000000001',
   'Unity Software SPV', 'Unity Software', 'No-code collaboration for distributed teams.',
   2000000, 1800000, 2000000, 100000, 500000, 2.0, 20, 'closed', 'Series A', 'Equity', (CURRENT_DATE-INTERVAL '22 weeks')::DATE, (CURRENT_DATE-INTERVAL '14 weeks')::DATE, NOW()-INTERVAL '22 weeks'),
  ('dd000000-0000-0000-0000-000000000031', 'bb000000-0000-0000-0000-000000000001',
   'Valor Defense SPV', 'Valor Defense', 'Drone swarm coordination for defense applications.',
   1500000, 1400000, 0, 100000, 500000, 2.0, 20, 'closed', 'Series A', 'Equity', (CURRENT_DATE-INTERVAL '21 weeks')::DATE, (CURRENT_DATE-INTERVAL '13 weeks')::DATE, NOW()-INTERVAL '21 weeks'),
  ('dd000000-0000-0000-0000-000000000032', 'bb000000-0000-0000-0000-000000000001',
   'Quantum AI Fund', 'Quantum Computing Inc', 'Quantum ML platform for drug discovery.',
   7000000, 6800000, 0, 250000, 1500000, 1.5, 25, 'closed', 'Series C', 'Equity', (CURRENT_DATE-INTERVAL '20 weeks')::DATE, (CURRENT_DATE-INTERVAL '12 weeks')::DATE, NOW()-INTERVAL '20 weeks'),
  ('dd000000-0000-0000-0000-000000000033', 'bb000000-0000-0000-0000-000000000001',
   'Wave Payments SPV', 'Wave Payments', 'Cross-border B2B payment processing.',
   1500000, 1400000, 1600000, 100000, 500000, 2.0, 20, 'closed', 'Series A', 'Equity', (CURRENT_DATE-INTERVAL '19 weeks')::DATE, (CURRENT_DATE-INTERVAL '11 weeks')::DATE, NOW()-INTERVAL '19 weeks'),
  ('dd000000-0000-0000-0000-000000000034', 'bb000000-0000-0000-0000-000000000001',
   'Xenon Materials SPV', 'Xenon Materials', 'Advanced ceramic composites for aerospace.',
   1200000, 1000000, 0, 50000, 300000, 2.0, 20, 'closed', 'Seed', 'Equity', (CURRENT_DATE-INTERVAL '18 weeks')::DATE, (CURRENT_DATE-INTERVAL '10 weeks')::DATE, NOW()-INTERVAL '18 weeks'),
  ('dd000000-0000-0000-0000-000000000035', 'bb000000-0000-0000-0000-000000000001',
   'Forge Robotics SPV', 'Forge Automation', 'Warehouse robotics-as-a-service for e-commerce.',
   2500000, 2400000, 0, 150000, 800000, 2.0, 20, 'closed', 'Series B', 'Equity', (CURRENT_DATE-INTERVAL '17 weeks')::DATE, (CURRENT_DATE-INTERVAL '9 weeks')::DATE, NOW()-INTERVAL '17 weeks'),
  ('dd000000-0000-0000-0000-000000000036', 'bb000000-0000-0000-0000-000000000001',
   'Yield AgTech SPV', 'Yield AgTech', 'Precision agriculture drone imaging and ML analysis.',
   2000000, 1800000, 2000000, 100000, 500000, 2.0, 20, 'closed', 'Series A', 'Equity', (CURRENT_DATE-INTERVAL '16 weeks')::DATE, (CURRENT_DATE-INTERVAL '8 weeks')::DATE, NOW()-INTERVAL '16 weeks'),
  ('dd000000-0000-0000-0000-000000000037', 'bb000000-0000-0000-0000-000000000001',
   'Alpine Medical SPV', 'Alpine Medical', 'Wearable ECG monitors for cardiac patients.',
   1000000, 900000, 0, 50000, 300000, 2.0, 20, 'closed', 'Seed', 'Equity', (CURRENT_DATE-INTERVAL '15 weeks')::DATE, (CURRENT_DATE-INTERVAL '7 weeks')::DATE, NOW()-INTERVAL '15 weeks'),
  ('dd000000-0000-0000-0000-000000000038', 'bb000000-0000-0000-0000-000000000001',
   'Orion Space Tech SPV', 'Orion Orbital', 'Small satellite constellation for agriculture monitoring.',
   3000000, 2800000, 0, 150000, 800000, 2.0, 20, 'closed', 'Series B', 'Equity', (CURRENT_DATE-INTERVAL '14 weeks')::DATE, (CURRENT_DATE-INTERVAL '6 weeks')::DATE, NOW()-INTERVAL '14 weeks'),
  ('dd000000-0000-0000-0000-000000000039', 'bb000000-0000-0000-0000-000000000001',
   'Basin Logistics SPV', 'Basin Logistics', 'Last-mile cold chain logistics for perishables.',
   1800000, 1600000, 1800000, 100000, 500000, 2.0, 20, 'closed', 'Series A', 'Equity', (CURRENT_DATE-INTERVAL '13 weeks')::DATE, (CURRENT_DATE-INTERVAL '5 weeks')::DATE, NOW()-INTERVAL '13 weeks'),
  ('dd000000-0000-0000-0000-000000000040', 'bb000000-0000-0000-0000-000000000001',
   'Cobalt Biotech SPV', 'Cobalt Biotech', 'CRISPR gene therapy tools for rare diseases.',
   1300000, 1200000, 0, 50000, 300000, 2.0, 20, 'closed', 'Seed', 'Equity', (CURRENT_DATE-INTERVAL '12 weeks')::DATE, (CURRENT_DATE-INTERVAL '4 weeks')::DATE, NOW()-INTERVAL '12 weeks'),
  ('dd000000-0000-0000-0000-000000000041', 'bb000000-0000-0000-0000-000000000001',
   'Vertex Cybersecurity SPV', 'Vertex Security', 'Zero-trust security for remote enterprise workforces.',
   4500000, 4200000, 0, 200000, 1000000, 1.5, 25, 'closed', 'Growth', 'Equity', (CURRENT_DATE-INTERVAL '11 weeks')::DATE, (CURRENT_DATE-INTERVAL '3 weeks')::DATE, NOW()-INTERVAL '11 weeks'),
  ('dd000000-0000-0000-0000-000000000042', 'bb000000-0000-0000-0000-000000000001',
   'Delta Robotics SPV', 'Delta Robotics', 'Surgical robotics for minimally invasive procedures.',
   2000000, 1800000, 2000000, 100000, 500000, 2.0, 20, 'closed', 'Series A', 'Equity', (CURRENT_DATE-INTERVAL '10 weeks')::DATE, (CURRENT_DATE-INTERVAL '2 weeks')::DATE, NOW()-INTERVAL '10 weeks'),
  ('dd000000-0000-0000-0000-000000000043', 'bb000000-0000-0000-0000-000000000001',
   'Ether Cloud SPV', 'Ether Cloud', 'Decentralized cloud storage for healthcare data.',
   1500000, 1400000, 0, 100000, 500000, 2.0, 20, 'closed', 'Series A', 'Equity', (CURRENT_DATE-INTERVAL '9 weeks')::DATE, (CURRENT_DATE-INTERVAL '3 days')::DATE, NOW()-INTERVAL '9 weeks'),
  ('dd000000-0000-0000-0000-000000000044', 'bb000000-0000-0000-0000-000000000001',
   'Cascade Climate Fund', 'Cascade Carbon', 'Carbon capture marketplace for industrial emitters.',
   5000000, 4800000, 0, 200000, 1000000, 1.5, 25, 'closed', 'Growth', 'Equity', (CURRENT_DATE-INTERVAL '8 weeks')::DATE, (CURRENT_DATE-INTERVAL '3 days')::DATE, NOW()-INTERVAL '8 weeks'),
  ('dd000000-0000-0000-0000-000000000045', 'bb000000-0000-0000-0000-000000000001',
   'Falcon Aerospace SPV', 'Falcon Aerospace', 'Reusable launch vehicle components manufacturing.',
   1800000, 1600000, 1800000, 100000, 500000, 2.0, 20, 'closed', 'Series A', 'Equity', (CURRENT_DATE-INTERVAL '7 weeks')::DATE, (CURRENT_DATE-INTERVAL '3 days')::DATE, NOW()-INTERVAL '7 weeks'),
  ('dd000000-0000-0000-0000-000000000046', 'bb000000-0000-0000-0000-000000000001',
   'Ember AgTech SPV', 'Ember Farms', 'Precision agriculture with ML crop analysis.',
   2500000, 2400000, 0, 100000, 500000, 2.0, 20, 'closed', 'Series A', 'Equity', (CURRENT_DATE-INTERVAL '6 weeks')::DATE, (CURRENT_DATE-INTERVAL '3 days')::DATE, NOW()-INTERVAL '6 weeks'),
  ('dd000000-0000-0000-0000-000000000047', 'bb000000-0000-0000-0000-000000000001',
   'Gateway Commerce SPV', 'Gateway Commerce', 'AI-powered inventory optimization for DTC brands.',
   2000000, 1800000, 0, 100000, 500000, 2.0, 20, 'closed', 'Series A', 'Equity', (CURRENT_DATE-INTERVAL '5 weeks')::DATE, (CURRENT_DATE-INTERVAL '3 days')::DATE, NOW()-INTERVAL '5 weeks'),
  ('dd000000-0000-0000-0000-000000000048', 'bb000000-0000-0000-0000-000000000001',
   'Pinnacle Logistics SPV', 'Pinnacle Freight', 'AI-optimized last-mile delivery for urban markets.',
   3500000, 3200000, 0, 150000, 800000, 2.0, 20, 'closed', 'Series B', 'Equity', (CURRENT_DATE-INTERVAL '4 weeks')::DATE, (CURRENT_DATE-INTERVAL '3 days')::DATE, NOW()-INTERVAL '4 weeks'),
  ('dd000000-0000-0000-0000-000000000049', 'bb000000-0000-0000-0000-000000000001',
   'Halo Fintech SPV', 'Halo Fintech', 'AI credit scoring for underbanked populations.',
   1500000, 1400000, 1600000, 100000, 500000, 2.0, 20, 'closed', 'Series A', 'Equity', (CURRENT_DATE-INTERVAL '3 weeks')::DATE, (CURRENT_DATE-INTERVAL '3 days')::DATE, NOW()-INTERVAL '3 weeks'),
  ('dd000000-0000-0000-0000-000000000050', 'bb000000-0000-0000-0000-000000000001',
   'Nexus HealthTech SPV', 'Nexus Health', 'Remote patient monitoring for major EHR systems.',
   4000000, 3800000, 0, 200000, 1000000, 1.5, 25, 'closed', 'Series C', 'Equity', (CURRENT_DATE-INTERVAL '2 weeks')::DATE, (CURRENT_DATE-INTERVAL '3 days')::DATE, NOW()-INTERVAL '2 weeks'),
  -- ACTIVE DEALS
  ('dd000000-0000-0000-0000-000000000051', 'bb000000-0000-0000-0000-000000000001',
   'Zenith Consumer SPV', 'Zenith Brands', 'DTC platform consolidating health & wellness brands.',
   6000000, 3200000, 3500000, 100000, 500000, 2.0, 20, 'active', 'Series A', 'Equity', (CURRENT_DATE-INTERVAL '1 week')::DATE, (CURRENT_DATE+INTERVAL '16 weeks')::DATE, NOW()-INTERVAL '1 week'),
  ('dd000000-0000-0000-0000-000000000052', 'bb000000-0000-0000-0000-000000000001',
   'Helios DeepTech SPV', 'Helios Computing', 'Custom silicon chips for LLM inference at the edge.',
   4000000, 1800000, 2200000, 150000, 800000, 2.0, 25, 'active', 'Series B', 'Equity', (CURRENT_DATE-INTERVAL '3 days')::DATE, (CURRENT_DATE+INTERVAL '16 weeks')::DATE, NOW()-INTERVAL '3 days');

-- DEAL-LP RELATIONSHIPS
-- All closed deals: status=allocated, wire=complete. Sums match total_committed.
-- Interested rows on select deals: total_interested > total_committed shows interested bar on chart.
INSERT INTO deal_lp_relationships (deal_id, lp_contact_id, status, committed_amount, allocated_amount, wire_status, wire_amount_received, first_contact_at, latest_response_at, created_at) VALUES
-- D01 W51 C:1.0M = 550+450
('dd000000-0000-0000-0000-000000000001','cc000000-0000-0000-0000-000000000001','allocated',550000,550000,'complete',550000,NOW()-INTERVAL '52 weeks',NOW()-INTERVAL '46 weeks',NOW()-INTERVAL '51 weeks'),
('dd000000-0000-0000-0000-000000000001','cc000000-0000-0000-0000-000000000002','allocated',450000,450000,'complete',450000,NOW()-INTERVAL '52 weeks',NOW()-INTERVAL '46 weeks',NOW()-INTERVAL '51 weeks'),
-- D02 W50 C:1.4M = 750+650
('dd000000-0000-0000-0000-000000000002','cc000000-0000-0000-0000-000000000003','allocated',750000,750000,'complete',750000,NOW()-INTERVAL '51 weeks',NOW()-INTERVAL '45 weeks',NOW()-INTERVAL '50 weeks'),
('dd000000-0000-0000-0000-000000000002','cc000000-0000-0000-0000-000000000004','allocated',650000,650000,'complete',650000,NOW()-INTERVAL '51 weeks',NOW()-INTERVAL '45 weeks',NOW()-INTERVAL '50 weeks'),
-- D03 W49 C:1.1M = 600+500, I:1.3M = 700+600
('dd000000-0000-0000-0000-000000000003','cc000000-0000-0000-0000-000000000005','allocated',600000,600000,'complete',600000,NOW()-INTERVAL '50 weeks',NOW()-INTERVAL '44 weeks',NOW()-INTERVAL '49 weeks'),
('dd000000-0000-0000-0000-000000000003','cc000000-0000-0000-0000-000000000006','allocated',500000,500000,'complete',500000,NOW()-INTERVAL '50 weeks',NOW()-INTERVAL '44 weeks',NOW()-INTERVAL '49 weeks'),
('dd000000-0000-0000-0000-000000000003','cc000000-0000-0000-0000-000000000017','interested',700000,NULL,NULL,0,NOW()-INTERVAL '49 weeks',NOW()-INTERVAL '44 weeks',NOW()-INTERVAL '49 weeks'),
('dd000000-0000-0000-0000-000000000003','cc000000-0000-0000-0000-000000000018','interested',600000,NULL,NULL,0,NOW()-INTERVAL '49 weeks',NOW()-INTERVAL '44 weeks',NOW()-INTERVAL '49 weeks'),
-- D04 W48 C:1.2M = 650+550
('dd000000-0000-0000-0000-000000000004','cc000000-0000-0000-0000-000000000007','allocated',650000,650000,'complete',650000,NOW()-INTERVAL '49 weeks',NOW()-INTERVAL '43 weeks',NOW()-INTERVAL '48 weeks'),
('dd000000-0000-0000-0000-000000000004','cc000000-0000-0000-0000-000000000008','allocated',550000,550000,'complete',550000,NOW()-INTERVAL '49 weeks',NOW()-INTERVAL '43 weeks',NOW()-INTERVAL '48 weeks'),
-- D05 W47 C:2.4M = 900+800+700
('dd000000-0000-0000-0000-000000000005','cc000000-0000-0000-0000-000000000009','allocated',900000,900000,'complete',900000,NOW()-INTERVAL '48 weeks',NOW()-INTERVAL '42 weeks',NOW()-INTERVAL '47 weeks'),
('dd000000-0000-0000-0000-000000000005','cc000000-0000-0000-0000-000000000010','allocated',800000,800000,'complete',800000,NOW()-INTERVAL '48 weeks',NOW()-INTERVAL '42 weeks',NOW()-INTERVAL '47 weeks'),
('dd000000-0000-0000-0000-000000000005','cc000000-0000-0000-0000-000000000011','allocated',700000,700000,'complete',700000,NOW()-INTERVAL '48 weeks',NOW()-INTERVAL '42 weeks',NOW()-INTERVAL '47 weeks'),
-- D06 W46 C:0.9M = 500+400, I:1.1M = 600+500
('dd000000-0000-0000-0000-000000000006','cc000000-0000-0000-0000-000000000012','allocated',500000,500000,'complete',500000,NOW()-INTERVAL '47 weeks',NOW()-INTERVAL '41 weeks',NOW()-INTERVAL '46 weeks'),
('dd000000-0000-0000-0000-000000000006','cc000000-0000-0000-0000-000000000013','allocated',400000,400000,'complete',400000,NOW()-INTERVAL '47 weeks',NOW()-INTERVAL '41 weeks',NOW()-INTERVAL '46 weeks'),
('dd000000-0000-0000-0000-000000000006','cc000000-0000-0000-0000-000000000019','interested',600000,NULL,NULL,0,NOW()-INTERVAL '46 weeks',NOW()-INTERVAL '41 weeks',NOW()-INTERVAL '46 weeks'),
('dd000000-0000-0000-0000-000000000006','cc000000-0000-0000-0000-000000000020','interested',500000,NULL,NULL,0,NOW()-INTERVAL '46 weeks',NOW()-INTERVAL '41 weeks',NOW()-INTERVAL '46 weeks'),
-- D07 W45 C:1.4M = 750+650
('dd000000-0000-0000-0000-000000000007','cc000000-0000-0000-0000-000000000014','allocated',750000,750000,'complete',750000,NOW()-INTERVAL '46 weeks',NOW()-INTERVAL '40 weeks',NOW()-INTERVAL '45 weeks'),
('dd000000-0000-0000-0000-000000000007','cc000000-0000-0000-0000-000000000015','allocated',650000,650000,'complete',650000,NOW()-INTERVAL '46 weeks',NOW()-INTERVAL '40 weeks',NOW()-INTERVAL '45 weeks'),
-- D08 W44 C:3.4M = 1200+1150+1050
('dd000000-0000-0000-0000-000000000008','cc000000-0000-0000-0000-000000000016','allocated',1200000,1200000,'complete',1200000,NOW()-INTERVAL '45 weeks',NOW()-INTERVAL '39 weeks',NOW()-INTERVAL '44 weeks'),
('dd000000-0000-0000-0000-000000000008','cc000000-0000-0000-0000-000000000001','allocated',1150000,1150000,'complete',1150000,NOW()-INTERVAL '45 weeks',NOW()-INTERVAL '39 weeks',NOW()-INTERVAL '44 weeks'),
('dd000000-0000-0000-0000-000000000008','cc000000-0000-0000-0000-000000000002','allocated',1050000,1050000,'complete',1050000,NOW()-INTERVAL '45 weeks',NOW()-INTERVAL '39 weeks',NOW()-INTERVAL '44 weeks'),
-- D09 W43 C:1.1M = 600+500, I:1.3M = 700+600
('dd000000-0000-0000-0000-000000000009','cc000000-0000-0000-0000-000000000003','allocated',600000,600000,'complete',600000,NOW()-INTERVAL '44 weeks',NOW()-INTERVAL '38 weeks',NOW()-INTERVAL '43 weeks'),
('dd000000-0000-0000-0000-000000000009','cc000000-0000-0000-0000-000000000004','allocated',500000,500000,'complete',500000,NOW()-INTERVAL '44 weeks',NOW()-INTERVAL '38 weeks',NOW()-INTERVAL '43 weeks'),
('dd000000-0000-0000-0000-000000000009','cc000000-0000-0000-0000-000000000017','interested',700000,NULL,NULL,0,NOW()-INTERVAL '43 weeks',NOW()-INTERVAL '38 weeks',NOW()-INTERVAL '43 weeks'),
('dd000000-0000-0000-0000-000000000009','cc000000-0000-0000-0000-000000000018','interested',600000,NULL,NULL,0,NOW()-INTERVAL '43 weeks',NOW()-INTERVAL '38 weeks',NOW()-INTERVAL '43 weeks'),
-- D10 W42 C:1.4M = 750+650
('dd000000-0000-0000-0000-000000000010','cc000000-0000-0000-0000-000000000005','allocated',750000,750000,'complete',750000,NOW()-INTERVAL '43 weeks',NOW()-INTERVAL '37 weeks',NOW()-INTERVAL '42 weeks'),
('dd000000-0000-0000-0000-000000000010','cc000000-0000-0000-0000-000000000006','allocated',650000,650000,'complete',650000,NOW()-INTERVAL '43 weeks',NOW()-INTERVAL '37 weeks',NOW()-INTERVAL '42 weeks'),
-- D11 W41 C:1.8M = 950+850
('dd000000-0000-0000-0000-000000000011','cc000000-0000-0000-0000-000000000007','allocated',950000,950000,'complete',950000,NOW()-INTERVAL '42 weeks',NOW()-INTERVAL '36 weeks',NOW()-INTERVAL '41 weeks'),
('dd000000-0000-0000-0000-000000000011','cc000000-0000-0000-0000-000000000008','allocated',850000,850000,'complete',850000,NOW()-INTERVAL '42 weeks',NOW()-INTERVAL '36 weeks',NOW()-INTERVAL '41 weeks'),
-- D12 W40 C:0.9M = 500+400, I:1.1M = 600+500
('dd000000-0000-0000-0000-000000000012','cc000000-0000-0000-0000-000000000009','allocated',500000,500000,'complete',500000,NOW()-INTERVAL '41 weeks',NOW()-INTERVAL '35 weeks',NOW()-INTERVAL '40 weeks'),
('dd000000-0000-0000-0000-000000000012','cc000000-0000-0000-0000-000000000010','allocated',400000,400000,'complete',400000,NOW()-INTERVAL '41 weeks',NOW()-INTERVAL '35 weeks',NOW()-INTERVAL '40 weeks'),
('dd000000-0000-0000-0000-000000000012','cc000000-0000-0000-0000-000000000019','interested',600000,NULL,NULL,0,NOW()-INTERVAL '40 weeks',NOW()-INTERVAL '35 weeks',NOW()-INTERVAL '40 weeks'),
('dd000000-0000-0000-0000-000000000012','cc000000-0000-0000-0000-000000000020','interested',500000,NULL,NULL,0,NOW()-INTERVAL '40 weeks',NOW()-INTERVAL '35 weeks',NOW()-INTERVAL '40 weeks'),
-- D13 W39 C:1.6M = 850+750
('dd000000-0000-0000-0000-000000000013','cc000000-0000-0000-0000-000000000011','allocated',850000,850000,'complete',850000,NOW()-INTERVAL '40 weeks',NOW()-INTERVAL '34 weeks',NOW()-INTERVAL '39 weeks'),
('dd000000-0000-0000-0000-000000000013','cc000000-0000-0000-0000-000000000012','allocated',750000,750000,'complete',750000,NOW()-INTERVAL '40 weeks',NOW()-INTERVAL '34 weeks',NOW()-INTERVAL '39 weeks'),
-- D14 W38 C:2.4M = 900+800+700
('dd000000-0000-0000-0000-000000000014','cc000000-0000-0000-0000-000000000013','allocated',900000,900000,'complete',900000,NOW()-INTERVAL '39 weeks',NOW()-INTERVAL '33 weeks',NOW()-INTERVAL '38 weeks'),
('dd000000-0000-0000-0000-000000000014','cc000000-0000-0000-0000-000000000014','allocated',800000,800000,'complete',800000,NOW()-INTERVAL '39 weeks',NOW()-INTERVAL '33 weeks',NOW()-INTERVAL '38 weeks'),
('dd000000-0000-0000-0000-000000000014','cc000000-0000-0000-0000-000000000015','allocated',700000,700000,'complete',700000,NOW()-INTERVAL '39 weeks',NOW()-INTERVAL '33 weeks',NOW()-INTERVAL '38 weeks'),
-- D15 W37 C:1.0M = 550+450, I:1.2M = 650+550
('dd000000-0000-0000-0000-000000000015','cc000000-0000-0000-0000-000000000016','allocated',550000,550000,'complete',550000,NOW()-INTERVAL '38 weeks',NOW()-INTERVAL '32 weeks',NOW()-INTERVAL '37 weeks'),
('dd000000-0000-0000-0000-000000000015','cc000000-0000-0000-0000-000000000001','allocated',450000,450000,'complete',450000,NOW()-INTERVAL '38 weeks',NOW()-INTERVAL '32 weeks',NOW()-INTERVAL '37 weeks'),
('dd000000-0000-0000-0000-000000000015','cc000000-0000-0000-0000-000000000017','interested',650000,NULL,NULL,0,NOW()-INTERVAL '37 weeks',NOW()-INTERVAL '32 weeks',NOW()-INTERVAL '37 weeks'),
('dd000000-0000-0000-0000-000000000015','cc000000-0000-0000-0000-000000000018','interested',550000,NULL,NULL,0,NOW()-INTERVAL '37 weeks',NOW()-INTERVAL '32 weeks',NOW()-INTERVAL '37 weeks'),
-- D16 W36 C:1.8M = 950+850
('dd000000-0000-0000-0000-000000000016','cc000000-0000-0000-0000-000000000002','allocated',950000,950000,'complete',950000,NOW()-INTERVAL '37 weeks',NOW()-INTERVAL '31 weeks',NOW()-INTERVAL '36 weeks'),
('dd000000-0000-0000-0000-000000000016','cc000000-0000-0000-0000-000000000003','allocated',850000,850000,'complete',850000,NOW()-INTERVAL '37 weeks',NOW()-INTERVAL '31 weeks',NOW()-INTERVAL '36 weeks'),
-- D17 W35 C:3.8M = 1400+1250+1150
('dd000000-0000-0000-0000-000000000017','cc000000-0000-0000-0000-000000000004','allocated',1400000,1400000,'complete',1400000,NOW()-INTERVAL '36 weeks',NOW()-INTERVAL '30 weeks',NOW()-INTERVAL '35 weeks'),
('dd000000-0000-0000-0000-000000000017','cc000000-0000-0000-0000-000000000005','allocated',1250000,1250000,'complete',1250000,NOW()-INTERVAL '36 weeks',NOW()-INTERVAL '30 weeks',NOW()-INTERVAL '35 weeks'),
('dd000000-0000-0000-0000-000000000017','cc000000-0000-0000-0000-000000000006','allocated',1150000,1150000,'complete',1150000,NOW()-INTERVAL '36 weeks',NOW()-INTERVAL '30 weeks',NOW()-INTERVAL '35 weeks'),
-- D18 W34 C:1.4M = 750+650, I:1.6M = 850+750
('dd000000-0000-0000-0000-000000000018','cc000000-0000-0000-0000-000000000007','allocated',750000,750000,'complete',750000,NOW()-INTERVAL '35 weeks',NOW()-INTERVAL '29 weeks',NOW()-INTERVAL '34 weeks'),
('dd000000-0000-0000-0000-000000000018','cc000000-0000-0000-0000-000000000008','allocated',650000,650000,'complete',650000,NOW()-INTERVAL '35 weeks',NOW()-INTERVAL '29 weeks',NOW()-INTERVAL '34 weeks'),
('dd000000-0000-0000-0000-000000000018','cc000000-0000-0000-0000-000000000019','interested',850000,NULL,NULL,0,NOW()-INTERVAL '34 weeks',NOW()-INTERVAL '29 weeks',NOW()-INTERVAL '34 weeks'),
('dd000000-0000-0000-0000-000000000018','cc000000-0000-0000-0000-000000000020','interested',750000,NULL,NULL,0,NOW()-INTERVAL '34 weeks',NOW()-INTERVAL '29 weeks',NOW()-INTERVAL '34 weeks'),
-- D19 W33 C:1.6M = 850+750
('dd000000-0000-0000-0000-000000000019','cc000000-0000-0000-0000-000000000009','allocated',850000,850000,'complete',850000,NOW()-INTERVAL '34 weeks',NOW()-INTERVAL '28 weeks',NOW()-INTERVAL '33 weeks'),
('dd000000-0000-0000-0000-000000000019','cc000000-0000-0000-0000-000000000010','allocated',750000,750000,'complete',750000,NOW()-INTERVAL '34 weeks',NOW()-INTERVAL '28 weeks',NOW()-INTERVAL '33 weeks'),
-- D20 W32 C:3.4M = 1200+1150+1050
('dd000000-0000-0000-0000-000000000020','cc000000-0000-0000-0000-000000000011','allocated',1200000,1200000,'complete',1200000,NOW()-INTERVAL '33 weeks',NOW()-INTERVAL '27 weeks',NOW()-INTERVAL '32 weeks'),
('dd000000-0000-0000-0000-000000000020','cc000000-0000-0000-0000-000000000012','allocated',1150000,1150000,'complete',1150000,NOW()-INTERVAL '33 weeks',NOW()-INTERVAL '27 weeks',NOW()-INTERVAL '32 weeks'),
('dd000000-0000-0000-0000-000000000020','cc000000-0000-0000-0000-000000000013','allocated',1050000,1050000,'complete',1050000,NOW()-INTERVAL '33 weeks',NOW()-INTERVAL '27 weeks',NOW()-INTERVAL '32 weeks'),
-- D21 W31 C:0.9M = 500+400, I:1.1M = 600+500
('dd000000-0000-0000-0000-000000000021','cc000000-0000-0000-0000-000000000014','allocated',500000,500000,'complete',500000,NOW()-INTERVAL '32 weeks',NOW()-INTERVAL '26 weeks',NOW()-INTERVAL '31 weeks'),
('dd000000-0000-0000-0000-000000000021','cc000000-0000-0000-0000-000000000015','allocated',400000,400000,'complete',400000,NOW()-INTERVAL '32 weeks',NOW()-INTERVAL '26 weeks',NOW()-INTERVAL '31 weeks'),
('dd000000-0000-0000-0000-000000000021','cc000000-0000-0000-0000-000000000017','interested',600000,NULL,NULL,0,NOW()-INTERVAL '31 weeks',NOW()-INTERVAL '26 weeks',NOW()-INTERVAL '31 weeks'),
('dd000000-0000-0000-0000-000000000021','cc000000-0000-0000-0000-000000000018','interested',500000,NULL,NULL,0,NOW()-INTERVAL '31 weeks',NOW()-INTERVAL '26 weeks',NOW()-INTERVAL '31 weeks'),
-- D22 W30 C:1.4M = 750+650
('dd000000-0000-0000-0000-000000000022','cc000000-0000-0000-0000-000000000016','allocated',750000,750000,'complete',750000,NOW()-INTERVAL '31 weeks',NOW()-INTERVAL '25 weeks',NOW()-INTERVAL '30 weeks'),
('dd000000-0000-0000-0000-000000000022','cc000000-0000-0000-0000-000000000001','allocated',650000,650000,'complete',650000,NOW()-INTERVAL '31 weeks',NOW()-INTERVAL '25 weeks',NOW()-INTERVAL '30 weeks'),
-- D23 W29 C:4.8M = 1700+1600+1500
('dd000000-0000-0000-0000-000000000023','cc000000-0000-0000-0000-000000000002','allocated',1700000,1700000,'complete',1700000,NOW()-INTERVAL '30 weeks',NOW()-INTERVAL '24 weeks',NOW()-INTERVAL '29 weeks'),
('dd000000-0000-0000-0000-000000000023','cc000000-0000-0000-0000-000000000003','allocated',1600000,1600000,'complete',1600000,NOW()-INTERVAL '30 weeks',NOW()-INTERVAL '24 weeks',NOW()-INTERVAL '29 weeks'),
('dd000000-0000-0000-0000-000000000023','cc000000-0000-0000-0000-000000000004','allocated',1500000,1500000,'complete',1500000,NOW()-INTERVAL '30 weeks',NOW()-INTERVAL '24 weeks',NOW()-INTERVAL '29 weeks'),
-- D24 W28 C:1.8M = 950+850, I:2.0M = 1050+950
('dd000000-0000-0000-0000-000000000024','cc000000-0000-0000-0000-000000000005','allocated',950000,950000,'complete',950000,NOW()-INTERVAL '29 weeks',NOW()-INTERVAL '23 weeks',NOW()-INTERVAL '28 weeks'),
('dd000000-0000-0000-0000-000000000024','cc000000-0000-0000-0000-000000000006','allocated',850000,850000,'complete',850000,NOW()-INTERVAL '29 weeks',NOW()-INTERVAL '23 weeks',NOW()-INTERVAL '28 weeks'),
('dd000000-0000-0000-0000-000000000024','cc000000-0000-0000-0000-000000000019','interested',1050000,NULL,NULL,0,NOW()-INTERVAL '28 weeks',NOW()-INTERVAL '23 weeks',NOW()-INTERVAL '28 weeks'),
('dd000000-0000-0000-0000-000000000024','cc000000-0000-0000-0000-000000000020','interested',950000,NULL,NULL,0,NOW()-INTERVAL '28 weeks',NOW()-INTERVAL '23 weeks',NOW()-INTERVAL '28 weeks'),
-- D25 W27 C:1.4M = 750+650
('dd000000-0000-0000-0000-000000000025','cc000000-0000-0000-0000-000000000007','allocated',750000,750000,'complete',750000,NOW()-INTERVAL '28 weeks',NOW()-INTERVAL '22 weeks',NOW()-INTERVAL '27 weeks'),
('dd000000-0000-0000-0000-000000000025','cc000000-0000-0000-0000-000000000008','allocated',650000,650000,'complete',650000,NOW()-INTERVAL '28 weeks',NOW()-INTERVAL '22 weeks',NOW()-INTERVAL '27 weeks'),
-- D26 W26 C:2.8M = 1000+950+850
('dd000000-0000-0000-0000-000000000026','cc000000-0000-0000-0000-000000000009','allocated',1000000,1000000,'complete',1000000,NOW()-INTERVAL '27 weeks',NOW()-INTERVAL '21 weeks',NOW()-INTERVAL '26 weeks'),
('dd000000-0000-0000-0000-000000000026','cc000000-0000-0000-0000-000000000010','allocated',950000,950000,'complete',950000,NOW()-INTERVAL '27 weeks',NOW()-INTERVAL '21 weeks',NOW()-INTERVAL '26 weeks'),
('dd000000-0000-0000-0000-000000000026','cc000000-0000-0000-0000-000000000011','allocated',850000,850000,'complete',850000,NOW()-INTERVAL '27 weeks',NOW()-INTERVAL '21 weeks',NOW()-INTERVAL '26 weeks'),
-- D27 W25 C:1.6M = 850+750, I:1.8M = 950+850
('dd000000-0000-0000-0000-000000000027','cc000000-0000-0000-0000-000000000012','allocated',850000,850000,'complete',850000,NOW()-INTERVAL '26 weeks',NOW()-INTERVAL '20 weeks',NOW()-INTERVAL '25 weeks'),
('dd000000-0000-0000-0000-000000000027','cc000000-0000-0000-0000-000000000013','allocated',750000,750000,'complete',750000,NOW()-INTERVAL '26 weeks',NOW()-INTERVAL '20 weeks',NOW()-INTERVAL '25 weeks'),
('dd000000-0000-0000-0000-000000000027','cc000000-0000-0000-0000-000000000017','interested',950000,NULL,NULL,0,NOW()-INTERVAL '25 weeks',NOW()-INTERVAL '20 weeks',NOW()-INTERVAL '25 weeks'),
('dd000000-0000-0000-0000-000000000027','cc000000-0000-0000-0000-000000000018','interested',850000,NULL,NULL,0,NOW()-INTERVAL '25 weeks',NOW()-INTERVAL '20 weeks',NOW()-INTERVAL '25 weeks'),
-- D28 W24 C:2.4M = 900+800+700
('dd000000-0000-0000-0000-000000000028','cc000000-0000-0000-0000-000000000014','allocated',900000,900000,'complete',900000,NOW()-INTERVAL '25 weeks',NOW()-INTERVAL '19 weeks',NOW()-INTERVAL '24 weeks'),
('dd000000-0000-0000-0000-000000000028','cc000000-0000-0000-0000-000000000015','allocated',800000,800000,'complete',800000,NOW()-INTERVAL '25 weeks',NOW()-INTERVAL '19 weeks',NOW()-INTERVAL '24 weeks'),
('dd000000-0000-0000-0000-000000000028','cc000000-0000-0000-0000-000000000016','allocated',700000,700000,'complete',700000,NOW()-INTERVAL '25 weeks',NOW()-INTERVAL '19 weeks',NOW()-INTERVAL '24 weeks'),
-- D29 W23 C:3.8M = 1400+1250+1150
('dd000000-0000-0000-0000-000000000029','cc000000-0000-0000-0000-000000000001','allocated',1400000,1400000,'complete',1400000,NOW()-INTERVAL '24 weeks',NOW()-INTERVAL '18 weeks',NOW()-INTERVAL '23 weeks'),
('dd000000-0000-0000-0000-000000000029','cc000000-0000-0000-0000-000000000002','allocated',1250000,1250000,'complete',1250000,NOW()-INTERVAL '24 weeks',NOW()-INTERVAL '18 weeks',NOW()-INTERVAL '23 weeks'),
('dd000000-0000-0000-0000-000000000029','cc000000-0000-0000-0000-000000000003','allocated',1150000,1150000,'complete',1150000,NOW()-INTERVAL '24 weeks',NOW()-INTERVAL '18 weeks',NOW()-INTERVAL '23 weeks'),
-- D30 W22 C:1.8M = 950+850, I:2.0M = 1050+950
('dd000000-0000-0000-0000-000000000030','cc000000-0000-0000-0000-000000000004','allocated',950000,950000,'complete',950000,NOW()-INTERVAL '23 weeks',NOW()-INTERVAL '17 weeks',NOW()-INTERVAL '22 weeks'),
('dd000000-0000-0000-0000-000000000030','cc000000-0000-0000-0000-000000000005','allocated',850000,850000,'complete',850000,NOW()-INTERVAL '23 weeks',NOW()-INTERVAL '17 weeks',NOW()-INTERVAL '22 weeks'),
('dd000000-0000-0000-0000-000000000030','cc000000-0000-0000-0000-000000000019','interested',1050000,NULL,NULL,0,NOW()-INTERVAL '22 weeks',NOW()-INTERVAL '17 weeks',NOW()-INTERVAL '22 weeks'),
('dd000000-0000-0000-0000-000000000030','cc000000-0000-0000-0000-000000000020','interested',950000,NULL,NULL,0,NOW()-INTERVAL '22 weeks',NOW()-INTERVAL '17 weeks',NOW()-INTERVAL '22 weeks'),
-- D31 W21 C:1.4M = 750+650
('dd000000-0000-0000-0000-000000000031','cc000000-0000-0000-0000-000000000006','allocated',750000,750000,'complete',750000,NOW()-INTERVAL '22 weeks',NOW()-INTERVAL '16 weeks',NOW()-INTERVAL '21 weeks'),
('dd000000-0000-0000-0000-000000000031','cc000000-0000-0000-0000-000000000007','allocated',650000,650000,'complete',650000,NOW()-INTERVAL '22 weeks',NOW()-INTERVAL '16 weeks',NOW()-INTERVAL '21 weeks'),
-- D32 W20 C:6.8M = 2400+2250+2150
('dd000000-0000-0000-0000-000000000032','cc000000-0000-0000-0000-000000000008','allocated',2400000,2400000,'complete',2400000,NOW()-INTERVAL '21 weeks',NOW()-INTERVAL '15 weeks',NOW()-INTERVAL '20 weeks'),
('dd000000-0000-0000-0000-000000000032','cc000000-0000-0000-0000-000000000009','allocated',2250000,2250000,'complete',2250000,NOW()-INTERVAL '21 weeks',NOW()-INTERVAL '15 weeks',NOW()-INTERVAL '20 weeks'),
('dd000000-0000-0000-0000-000000000032','cc000000-0000-0000-0000-000000000010','allocated',2150000,2150000,'complete',2150000,NOW()-INTERVAL '21 weeks',NOW()-INTERVAL '15 weeks',NOW()-INTERVAL '20 weeks'),
-- D33 W19 C:1.4M = 750+650, I:1.6M = 850+750
('dd000000-0000-0000-0000-000000000033','cc000000-0000-0000-0000-000000000011','allocated',750000,750000,'complete',750000,NOW()-INTERVAL '20 weeks',NOW()-INTERVAL '14 weeks',NOW()-INTERVAL '19 weeks'),
('dd000000-0000-0000-0000-000000000033','cc000000-0000-0000-0000-000000000012','allocated',650000,650000,'complete',650000,NOW()-INTERVAL '20 weeks',NOW()-INTERVAL '14 weeks',NOW()-INTERVAL '19 weeks'),
('dd000000-0000-0000-0000-000000000033','cc000000-0000-0000-0000-000000000017','interested',850000,NULL,NULL,0,NOW()-INTERVAL '19 weeks',NOW()-INTERVAL '14 weeks',NOW()-INTERVAL '19 weeks'),
('dd000000-0000-0000-0000-000000000033','cc000000-0000-0000-0000-000000000018','interested',750000,NULL,NULL,0,NOW()-INTERVAL '19 weeks',NOW()-INTERVAL '14 weeks',NOW()-INTERVAL '19 weeks'),
-- D34 W18 C:1.0M = 550+450
('dd000000-0000-0000-0000-000000000034','cc000000-0000-0000-0000-000000000013','allocated',550000,550000,'complete',550000,NOW()-INTERVAL '19 weeks',NOW()-INTERVAL '13 weeks',NOW()-INTERVAL '18 weeks'),
('dd000000-0000-0000-0000-000000000034','cc000000-0000-0000-0000-000000000014','allocated',450000,450000,'complete',450000,NOW()-INTERVAL '19 weeks',NOW()-INTERVAL '13 weeks',NOW()-INTERVAL '18 weeks'),
-- D35 W17 C:2.4M = 900+800+700
('dd000000-0000-0000-0000-000000000035','cc000000-0000-0000-0000-000000000015','allocated',900000,900000,'complete',900000,NOW()-INTERVAL '18 weeks',NOW()-INTERVAL '12 weeks',NOW()-INTERVAL '17 weeks'),
('dd000000-0000-0000-0000-000000000035','cc000000-0000-0000-0000-000000000016','allocated',800000,800000,'complete',800000,NOW()-INTERVAL '18 weeks',NOW()-INTERVAL '12 weeks',NOW()-INTERVAL '17 weeks'),
('dd000000-0000-0000-0000-000000000035','cc000000-0000-0000-0000-000000000001','allocated',700000,700000,'complete',700000,NOW()-INTERVAL '18 weeks',NOW()-INTERVAL '12 weeks',NOW()-INTERVAL '17 weeks'),
-- D36 W16 C:1.8M = 950+850, I:2.0M = 1050+950
('dd000000-0000-0000-0000-000000000036','cc000000-0000-0000-0000-000000000002','allocated',950000,950000,'complete',950000,NOW()-INTERVAL '17 weeks',NOW()-INTERVAL '11 weeks',NOW()-INTERVAL '16 weeks'),
('dd000000-0000-0000-0000-000000000036','cc000000-0000-0000-0000-000000000003','allocated',850000,850000,'complete',850000,NOW()-INTERVAL '17 weeks',NOW()-INTERVAL '11 weeks',NOW()-INTERVAL '16 weeks'),
('dd000000-0000-0000-0000-000000000036','cc000000-0000-0000-0000-000000000019','interested',1050000,NULL,NULL,0,NOW()-INTERVAL '16 weeks',NOW()-INTERVAL '11 weeks',NOW()-INTERVAL '16 weeks'),
('dd000000-0000-0000-0000-000000000036','cc000000-0000-0000-0000-000000000020','interested',950000,NULL,NULL,0,NOW()-INTERVAL '16 weeks',NOW()-INTERVAL '11 weeks',NOW()-INTERVAL '16 weeks'),
-- D37 W15 C:0.9M = 500+400
('dd000000-0000-0000-0000-000000000037','cc000000-0000-0000-0000-000000000004','allocated',500000,500000,'complete',500000,NOW()-INTERVAL '16 weeks',NOW()-INTERVAL '10 weeks',NOW()-INTERVAL '15 weeks'),
('dd000000-0000-0000-0000-000000000037','cc000000-0000-0000-0000-000000000005','allocated',400000,400000,'complete',400000,NOW()-INTERVAL '16 weeks',NOW()-INTERVAL '10 weeks',NOW()-INTERVAL '15 weeks'),
-- D38 W14 C:2.8M = 1000+950+850
('dd000000-0000-0000-0000-000000000038','cc000000-0000-0000-0000-000000000006','allocated',1000000,1000000,'complete',1000000,NOW()-INTERVAL '15 weeks',NOW()-INTERVAL '9 weeks',NOW()-INTERVAL '14 weeks'),
('dd000000-0000-0000-0000-000000000038','cc000000-0000-0000-0000-000000000007','allocated',950000,950000,'complete',950000,NOW()-INTERVAL '15 weeks',NOW()-INTERVAL '9 weeks',NOW()-INTERVAL '14 weeks'),
('dd000000-0000-0000-0000-000000000038','cc000000-0000-0000-0000-000000000008','allocated',850000,850000,'complete',850000,NOW()-INTERVAL '15 weeks',NOW()-INTERVAL '9 weeks',NOW()-INTERVAL '14 weeks'),
-- D39 W13 C:1.6M = 850+750, I:1.8M = 950+850
('dd000000-0000-0000-0000-000000000039','cc000000-0000-0000-0000-000000000009','allocated',850000,850000,'complete',850000,NOW()-INTERVAL '14 weeks',NOW()-INTERVAL '8 weeks',NOW()-INTERVAL '13 weeks'),
('dd000000-0000-0000-0000-000000000039','cc000000-0000-0000-0000-000000000010','allocated',750000,750000,'complete',750000,NOW()-INTERVAL '14 weeks',NOW()-INTERVAL '8 weeks',NOW()-INTERVAL '13 weeks'),
('dd000000-0000-0000-0000-000000000039','cc000000-0000-0000-0000-000000000017','interested',950000,NULL,NULL,0,NOW()-INTERVAL '13 weeks',NOW()-INTERVAL '8 weeks',NOW()-INTERVAL '13 weeks'),
('dd000000-0000-0000-0000-000000000039','cc000000-0000-0000-0000-000000000018','interested',850000,NULL,NULL,0,NOW()-INTERVAL '13 weeks',NOW()-INTERVAL '8 weeks',NOW()-INTERVAL '13 weeks'),
-- D40 W12 C:1.2M = 650+550
('dd000000-0000-0000-0000-000000000040','cc000000-0000-0000-0000-000000000011','allocated',650000,650000,'complete',650000,NOW()-INTERVAL '13 weeks',NOW()-INTERVAL '7 weeks',NOW()-INTERVAL '12 weeks'),
('dd000000-0000-0000-0000-000000000040','cc000000-0000-0000-0000-000000000012','allocated',550000,550000,'complete',550000,NOW()-INTERVAL '13 weeks',NOW()-INTERVAL '7 weeks',NOW()-INTERVAL '12 weeks'),
-- D41 W11 C:4.2M = 1500+1400+1300
('dd000000-0000-0000-0000-000000000041','cc000000-0000-0000-0000-000000000013','allocated',1500000,1500000,'complete',1500000,NOW()-INTERVAL '12 weeks',NOW()-INTERVAL '6 weeks',NOW()-INTERVAL '11 weeks'),
('dd000000-0000-0000-0000-000000000041','cc000000-0000-0000-0000-000000000014','allocated',1400000,1400000,'complete',1400000,NOW()-INTERVAL '12 weeks',NOW()-INTERVAL '6 weeks',NOW()-INTERVAL '11 weeks'),
('dd000000-0000-0000-0000-000000000041','cc000000-0000-0000-0000-000000000015','allocated',1300000,1300000,'complete',1300000,NOW()-INTERVAL '12 weeks',NOW()-INTERVAL '6 weeks',NOW()-INTERVAL '11 weeks'),
-- D42 W10 C:1.8M = 950+850, I:2.0M = 1050+950
('dd000000-0000-0000-0000-000000000042','cc000000-0000-0000-0000-000000000016','allocated',950000,950000,'complete',950000,NOW()-INTERVAL '11 weeks',NOW()-INTERVAL '5 weeks',NOW()-INTERVAL '10 weeks'),
('dd000000-0000-0000-0000-000000000042','cc000000-0000-0000-0000-000000000001','allocated',850000,850000,'complete',850000,NOW()-INTERVAL '11 weeks',NOW()-INTERVAL '5 weeks',NOW()-INTERVAL '10 weeks'),
('dd000000-0000-0000-0000-000000000042','cc000000-0000-0000-0000-000000000019','interested',1050000,NULL,NULL,0,NOW()-INTERVAL '10 weeks',NOW()-INTERVAL '5 weeks',NOW()-INTERVAL '10 weeks'),
('dd000000-0000-0000-0000-000000000042','cc000000-0000-0000-0000-000000000020','interested',950000,NULL,NULL,0,NOW()-INTERVAL '10 weeks',NOW()-INTERVAL '5 weeks',NOW()-INTERVAL '10 weeks'),
-- D43 W9 C:1.4M = 750+650
('dd000000-0000-0000-0000-000000000043','cc000000-0000-0000-0000-000000000002','allocated',750000,750000,'complete',750000,NOW()-INTERVAL '10 weeks',NOW()-INTERVAL '4 weeks',NOW()-INTERVAL '9 weeks'),
('dd000000-0000-0000-0000-000000000043','cc000000-0000-0000-0000-000000000003','allocated',650000,650000,'complete',650000,NOW()-INTERVAL '10 weeks',NOW()-INTERVAL '4 weeks',NOW()-INTERVAL '9 weeks'),
-- D44 W8 C:4.8M = 1700+1600+1500
('dd000000-0000-0000-0000-000000000044','cc000000-0000-0000-0000-000000000004','allocated',1700000,1700000,'complete',1700000,NOW()-INTERVAL '9 weeks',NOW()-INTERVAL '3 weeks',NOW()-INTERVAL '8 weeks'),
('dd000000-0000-0000-0000-000000000044','cc000000-0000-0000-0000-000000000005','allocated',1600000,1600000,'complete',1600000,NOW()-INTERVAL '9 weeks',NOW()-INTERVAL '3 weeks',NOW()-INTERVAL '8 weeks'),
('dd000000-0000-0000-0000-000000000044','cc000000-0000-0000-0000-000000000006','allocated',1500000,1500000,'complete',1500000,NOW()-INTERVAL '9 weeks',NOW()-INTERVAL '3 weeks',NOW()-INTERVAL '8 weeks'),
-- D45 W7 C:1.6M = 850+750, I:1.8M = 950+850
('dd000000-0000-0000-0000-000000000045','cc000000-0000-0000-0000-000000000007','allocated',850000,850000,'complete',850000,NOW()-INTERVAL '8 weeks',NOW()-INTERVAL '2 weeks',NOW()-INTERVAL '7 weeks'),
('dd000000-0000-0000-0000-000000000045','cc000000-0000-0000-0000-000000000008','allocated',750000,750000,'complete',750000,NOW()-INTERVAL '8 weeks',NOW()-INTERVAL '2 weeks',NOW()-INTERVAL '7 weeks'),
('dd000000-0000-0000-0000-000000000045','cc000000-0000-0000-0000-000000000017','interested',950000,NULL,NULL,0,NOW()-INTERVAL '7 weeks',NOW()-INTERVAL '2 weeks',NOW()-INTERVAL '7 weeks'),
('dd000000-0000-0000-0000-000000000045','cc000000-0000-0000-0000-000000000018','interested',850000,NULL,NULL,0,NOW()-INTERVAL '7 weeks',NOW()-INTERVAL '2 weeks',NOW()-INTERVAL '7 weeks'),
-- D46 W6 C:2.4M = 900+800+700
('dd000000-0000-0000-0000-000000000046','cc000000-0000-0000-0000-000000000009','allocated',900000,900000,'complete',900000,NOW()-INTERVAL '7 weeks',NOW()-INTERVAL '1 week',NOW()-INTERVAL '6 weeks'),
('dd000000-0000-0000-0000-000000000046','cc000000-0000-0000-0000-000000000010','allocated',800000,800000,'complete',800000,NOW()-INTERVAL '7 weeks',NOW()-INTERVAL '1 week',NOW()-INTERVAL '6 weeks'),
('dd000000-0000-0000-0000-000000000046','cc000000-0000-0000-0000-000000000011','allocated',700000,700000,'complete',700000,NOW()-INTERVAL '7 weeks',NOW()-INTERVAL '1 week',NOW()-INTERVAL '6 weeks'),
-- D47 W5 C:1.8M = 950+850
('dd000000-0000-0000-0000-000000000047','cc000000-0000-0000-0000-000000000012','allocated',950000,950000,'complete',950000,NOW()-INTERVAL '6 weeks',NOW()-INTERVAL '1 week',NOW()-INTERVAL '5 weeks'),
('dd000000-0000-0000-0000-000000000047','cc000000-0000-0000-0000-000000000013','allocated',850000,850000,'complete',850000,NOW()-INTERVAL '6 weeks',NOW()-INTERVAL '1 week',NOW()-INTERVAL '5 weeks'),
-- D48 W4 C:3.2M = 1150+1050+1000
('dd000000-0000-0000-0000-000000000048','cc000000-0000-0000-0000-000000000014','allocated',1150000,1150000,'complete',1150000,NOW()-INTERVAL '5 weeks',NOW()-INTERVAL '1 week',NOW()-INTERVAL '4 weeks'),
('dd000000-0000-0000-0000-000000000048','cc000000-0000-0000-0000-000000000015','allocated',1050000,1050000,'complete',1050000,NOW()-INTERVAL '5 weeks',NOW()-INTERVAL '1 week',NOW()-INTERVAL '4 weeks'),
('dd000000-0000-0000-0000-000000000048','cc000000-0000-0000-0000-000000000016','allocated',1000000,1000000,'complete',1000000,NOW()-INTERVAL '5 weeks',NOW()-INTERVAL '1 week',NOW()-INTERVAL '4 weeks'),
-- D49 W3 C:1.4M = 750+650, I:1.6M = 850+750
('dd000000-0000-0000-0000-000000000049','cc000000-0000-0000-0000-000000000001','allocated',750000,750000,'complete',750000,NOW()-INTERVAL '4 weeks',NOW()-INTERVAL '1 week',NOW()-INTERVAL '3 weeks'),
('dd000000-0000-0000-0000-000000000049','cc000000-0000-0000-0000-000000000002','allocated',650000,650000,'complete',650000,NOW()-INTERVAL '4 weeks',NOW()-INTERVAL '1 week',NOW()-INTERVAL '3 weeks'),
('dd000000-0000-0000-0000-000000000049','cc000000-0000-0000-0000-000000000019','interested',850000,NULL,NULL,0,NOW()-INTERVAL '3 weeks',NOW()-INTERVAL '1 week',NOW()-INTERVAL '3 weeks'),
('dd000000-0000-0000-0000-000000000049','cc000000-0000-0000-0000-000000000020','interested',750000,NULL,NULL,0,NOW()-INTERVAL '3 weeks',NOW()-INTERVAL '1 week',NOW()-INTERVAL '3 weeks'),
-- D50 W2 C:3.8M = 1350+1250+1200
('dd000000-0000-0000-0000-000000000050','cc000000-0000-0000-0000-000000000003','allocated',1350000,1350000,'complete',1350000,NOW()-INTERVAL '3 weeks',NOW()-INTERVAL '3 days',NOW()-INTERVAL '2 weeks'),
('dd000000-0000-0000-0000-000000000050','cc000000-0000-0000-0000-000000000004','allocated',1250000,1250000,'complete',1250000,NOW()-INTERVAL '3 weeks',NOW()-INTERVAL '3 days',NOW()-INTERVAL '2 weeks'),
('dd000000-0000-0000-0000-000000000050','cc000000-0000-0000-0000-000000000005','allocated',1200000,1200000,'complete',1200000,NOW()-INTERVAL '3 weeks',NOW()-INTERVAL '3 days',NOW()-INTERVAL '2 weeks'),

-- ========== ACTIVE DEALS ==========
-- D51 W1 C:3.2M = 700+650+650+600+600, I:3.5M = 900+900+850+850
('dd000000-0000-0000-0000-000000000051','cc000000-0000-0000-0000-000000000006','allocated',700000,700000,'complete',700000,NOW()-INTERVAL '2 weeks',NOW()-INTERVAL '3 days',NOW()-INTERVAL '1 week'),
('dd000000-0000-0000-0000-000000000051','cc000000-0000-0000-0000-000000000007','allocated',650000,650000,'partial',400000,NOW()-INTERVAL '2 weeks',NOW()-INTERVAL '3 days',NOW()-INTERVAL '1 week'),
('dd000000-0000-0000-0000-000000000051','cc000000-0000-0000-0000-000000000008','committed',650000,NULL,'pending',0,NOW()-INTERVAL '2 weeks',NOW()-INTERVAL '3 days',NOW()-INTERVAL '1 week'),
('dd000000-0000-0000-0000-000000000051','cc000000-0000-0000-0000-000000000009','committed',600000,NULL,'pending',0,NOW()-INTERVAL '2 weeks',NOW()-INTERVAL '3 days',NOW()-INTERVAL '1 week'),
('dd000000-0000-0000-0000-000000000051','cc000000-0000-0000-0000-000000000010','committed',600000,NULL,'pending',0,NOW()-INTERVAL '2 weeks',NOW()-INTERVAL '3 days',NOW()-INTERVAL '1 week'),
('dd000000-0000-0000-0000-000000000051','cc000000-0000-0000-0000-000000000017','interested',900000,NULL,NULL,0,NOW()-INTERVAL '1 week',NOW()-INTERVAL '2 days',NOW()-INTERVAL '1 week'),
('dd000000-0000-0000-0000-000000000051','cc000000-0000-0000-0000-000000000018','interested',900000,NULL,NULL,0,NOW()-INTERVAL '1 week',NOW()-INTERVAL '2 days',NOW()-INTERVAL '1 week'),
('dd000000-0000-0000-0000-000000000051','cc000000-0000-0000-0000-000000000019','interested',850000,NULL,NULL,0,NOW()-INTERVAL '1 week',NOW()-INTERVAL '2 days',NOW()-INTERVAL '1 week'),
('dd000000-0000-0000-0000-000000000051','cc000000-0000-0000-0000-000000000020','interested',850000,NULL,NULL,0,NOW()-INTERVAL '1 week',NOW()-INTERVAL '2 days',NOW()-INTERVAL '1 week'),
-- D52 W0 C:1.8M = 500+450+450+400, I:2.2M = 600+550+550+500
('dd000000-0000-0000-0000-000000000052','cc000000-0000-0000-0000-000000000011','committed',500000,NULL,'pending',0,NOW()-INTERVAL '5 days',NOW()-INTERVAL '1 day',NOW()-INTERVAL '3 days'),
('dd000000-0000-0000-0000-000000000052','cc000000-0000-0000-0000-000000000012','committed',450000,NULL,'pending',0,NOW()-INTERVAL '5 days',NOW()-INTERVAL '1 day',NOW()-INTERVAL '3 days'),
('dd000000-0000-0000-0000-000000000052','cc000000-0000-0000-0000-000000000013','committed',450000,NULL,'pending',0,NOW()-INTERVAL '4 days',NOW()-INTERVAL '1 day',NOW()-INTERVAL '3 days'),
('dd000000-0000-0000-0000-000000000052','cc000000-0000-0000-0000-000000000014','committed',400000,NULL,'pending',0,NOW()-INTERVAL '4 days',NOW()-INTERVAL '1 day',NOW()-INTERVAL '3 days'),
('dd000000-0000-0000-0000-000000000052','cc000000-0000-0000-0000-000000000017','interested',600000,NULL,NULL,0,NOW()-INTERVAL '3 days',NOW()-INTERVAL '1 day',NOW()-INTERVAL '3 days'),
('dd000000-0000-0000-0000-000000000052','cc000000-0000-0000-0000-000000000018','interested',550000,NULL,NULL,0,NOW()-INTERVAL '3 days',NOW()-INTERVAL '1 day',NOW()-INTERVAL '3 days'),
('dd000000-0000-0000-0000-000000000052','cc000000-0000-0000-0000-000000000019','interested',550000,NULL,NULL,0,NOW()-INTERVAL '3 days',NOW()-INTERVAL '1 day',NOW()-INTERVAL '3 days'),
('dd000000-0000-0000-0000-000000000052','cc000000-0000-0000-0000-000000000020','interested',500000,NULL,NULL,0,NOW()-INTERVAL '3 days',NOW()-INTERVAL '1 day',NOW()-INTERVAL '3 days');

COMMIT;
